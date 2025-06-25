'use client'

import React, { useCallback, useEffect, useRef } from 'react'

import { useWebSocketStore, type WebSocketMessage } from '../stores/websocketStore'
import type { WebSocketConfig } from '../websocket/WebSocketManager'
import {
  useWebSocket as useWebSocketContext,
  useWebSocketSubscription,
} from '../websocket/WebSocketProvider'

// Re-export message types for backward compatibility
export type MessageType =
  | 'metrics'
  | 'alert'
  | 'agent_update'
  | 'agent_status'
  | 'workflow_update'
  | 'workflow_progress'
  | 'workflows_update'
  | 'chat_message'
  | 'system'
  | 'error'
  | 'connection'
  | 'pong'
  | 'channel_subscribed'
  | 'channel_unsubscribed'

export interface LegacyWebSocketMessage {
  type: MessageType
  channel?: string
  data?: unknown
  timestamp?: string
  [key: string]: unknown
}

export interface UseWebSocketOptions {
  channels?: string[]
  onMessage?: (message: LegacyWebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnectAttempts?: number
  reconnectInterval?: number
  maxReconnectDelay?: number
  heartbeatInterval?: number
}

interface MessageHandlerWrapper {
  type?: MessageType
  channel?: string
  handler: (message: LegacyWebSocketMessage) => void
}

// Main hook that provides backward compatibility with the existing API
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    channels = [],
    onMessage,
    onConnect,
    onDisconnect,
    onError: _onError,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    maxReconnectDelay = 30000,
    heartbeatInterval = 30000,
  } = options

  const { status, connect, disconnect, send, subscribe, getConnectionStatus: _getConnectionStatus } =
    useWebSocketContext()
  const store = useWebSocketStore()
  const messageHandlersRef = useRef<MessageHandlerWrapper[]>([])
  const connectionRef = useRef<string>('default')
  const subscribedChannelsRef = useRef<Set<string>>(new Set())
  const clientId = useRef<string>(`client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Convert between new and legacy message formats
  const convertToLegacyMessage = useCallback(
    (message: WebSocketMessage): LegacyWebSocketMessage => {
      return {
        type: message.type as MessageType,
        channel: message.topic,
        data: message.data,
        timestamp: message.timestamp.toISOString(),
        ...message.metadata,
      }
    },
    []
  )

  // Create WebSocket config from options
  const config: WebSocketConfig = React.useMemo(() => ({
    url:
      process.env.NODE_ENV === 'production'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/${clientId.current}`
        : `ws://localhost:8000/ws/${clientId.current}`,
    reconnectDelay: reconnectInterval,
    maxReconnectDelay: maxReconnectDelay,
    maxReconnectAttempts: reconnectAttempts,
    enableHeartbeat: true,
    heartbeatInterval: heartbeatInterval,
  }), [reconnectInterval, maxReconnectDelay, reconnectAttempts, heartbeatInterval])

  // Initialize connection on mount
  useEffect(() => {
    const connectionId = connectionRef.current
    connect(connectionId, config).catch((_error) => {
      // TODO: Replace with proper logging service
    })

    return () => {
      disconnect(connectionId)
    }
  }, [connect, disconnect, config])

  // Handle connection status changes
  useEffect(() => {
    if (status === 'connected') {
      onConnect?.()

      // Subscribe to channels
      channels.forEach((channel) => {
        if (!subscribedChannelsRef.current.has(channel)) {
          subscribeToChannel(channel)
        }
      })
    } else if (status === 'disconnected') {
      onDisconnect?.()
      subscribedChannelsRef.current.clear()
    }
  }, [status, channels]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle global messages
  useEffect(() => {
    if (!onMessage) return

    const unsubscribe = subscribe('*', (message) => {
      const legacyMessage = convertToLegacyMessage(message)
      onMessage(legacyMessage)

      // Call registered handlers
      messageHandlersRef.current.forEach(({ type, channel, handler }) => {
        const typeMatch = !type || legacyMessage.type === type
        const channelMatch = !channel || legacyMessage.channel === channel

        if (typeMatch && channelMatch) {
          handler(legacyMessage)
        }
      })
    })

    return unsubscribe
  }, [onMessage, subscribe, convertToLegacyMessage])

  // Send message through WebSocket
  const sendMessage = useCallback(
    (message: LegacyWebSocketMessage) => {
      send(message.channel || 'default', message.data, connectionRef.current)
    },
    [send]
  )

  // Subscribe to a channel
  const subscribeToChannel = useCallback(
    (channel: string) => {
      if (subscribedChannelsRef.current.has(channel)) {
        return
      }

      subscribedChannelsRef.current.add(channel)

      // Send subscription message
      sendMessage({
        type: 'system',
        action: 'subscribe',
        channel,
      } as LegacyWebSocketMessage)
    },
    [sendMessage]
  )

  // Unsubscribe from a channel
  const unsubscribeFromChannel = useCallback(
    (channel: string) => {
      if (!subscribedChannelsRef.current.has(channel)) {
        return
      }

      subscribedChannelsRef.current.delete(channel)

      // Send unsubscription message
      sendMessage({
        type: 'system',
        action: 'unsubscribe',
        channel,
      } as LegacyWebSocketMessage)
    },
    [sendMessage]
  )

  // Register a message handler for specific type/channel
  const registerHandler = useCallback(
    (
      handler: (message: LegacyWebSocketMessage) => void,
      type?: MessageType,
      channel?: string
    ): (() => void) => {
      const messageHandler: MessageHandlerWrapper = { type, channel, handler }
      messageHandlersRef.current.push(messageHandler)

      // Return unregister function
      return () => {
        messageHandlersRef.current = messageHandlersRef.current.filter((h) => h !== messageHandler)
      }
    },
    []
  )

  // Get last message for the default topic
  const lastMessage = store.lastMessages.get('default')
  const legacyLastMessage = lastMessage ? convertToLegacyMessage(lastMessage) : null

  return {
    isConnected: status === 'connected',
    connectionState: status,
    sendMessage,
    lastMessage: legacyLastMessage,
    clientId: clientId.current,
    subscribedChannels: Array.from(subscribedChannelsRef.current),
    subscribeToChannel,
    unsubscribeFromChannel,
    registerHandler,
    reconnect: () => connect(connectionRef.current, config),
    disconnect: () => disconnect(connectionRef.current),
  }
}

// Convenience hooks for specific message types
export function useMetricsWebSocket(onMetrics: (metrics: unknown) => void) {
  const { registerHandler, ...rest } = useWebSocket({
    channels: ['metrics'],
  })

  useEffect(() => {
    return registerHandler((message) => {
      if (message.type === 'metrics' && message.data) {
        onMetrics(message.data)
      }
    }, 'metrics')
  }, [registerHandler, onMetrics])

  return rest
}

export function useAlertsWebSocket(onAlert: (alert: unknown) => void) {
  const { registerHandler, ...rest } = useWebSocket({
    channels: ['alerts'],
  })

  useEffect(() => {
    return registerHandler((message) => {
      if (message.type === 'alert' && message.data) {
        onAlert(message.data)
      }
    }, 'alert')
  }, [registerHandler, onAlert])

  return rest
}

export function useAgentStatusWebSocket(onAgentUpdate: (update: unknown) => void) {
  const { registerHandler, ...rest } = useWebSocket({
    channels: ['agents'],
  })

  useEffect(() => {
    return registerHandler((message) => {
      if ((message.type === 'agent_update' || message.type === 'agent_status') && message.data) {
        onAgentUpdate(message.data)
      }
    }, 'agent_update')
  }, [registerHandler, onAgentUpdate])

  return rest
}

export function useWorkflowWebSocket(onWorkflowUpdate: (update: unknown) => void) {
  const { registerHandler, ...rest } = useWebSocket({
    channels: ['workflows'],
  })

  useEffect(() => {
    return registerHandler((message) => {
      if (
        (message.type === 'workflow_update' ||
          message.type === 'workflow_progress' ||
          message.type === 'workflows_update') &&
        message.data
      ) {
        onWorkflowUpdate({
          type: message.type,
          data: message.data,
          workflow_id: message.workflow_id,
        })
      }
    })
  }, [registerHandler, onWorkflowUpdate])

  return rest
}

// New hooks that use the modern WebSocket infrastructure directly
export function useModernWebSocket() {
  return useWebSocketContext()
}

export function useWebSocketTopic<T = unknown>(
  topic: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  useWebSocketSubscription(topic, handler, deps)
}
