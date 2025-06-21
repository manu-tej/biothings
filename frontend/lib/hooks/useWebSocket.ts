import { useCallback, useEffect, useRef, useState } from 'react'

// Message types for different events
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

export interface WebSocketMessage {
  type: MessageType
  channel?: string
  data?: any
  timestamp?: string
  [key: string]: any
}

export interface UseWebSocketOptions {
  channels?: string[]
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnectAttempts?: number
  reconnectInterval?: number
  maxReconnectDelay?: number
  heartbeatInterval?: number
}

interface MessageHandler {
  type?: MessageType
  channel?: string
  handler: (message: WebSocketMessage) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    channels = [],
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    maxReconnectDelay = 30000,
    heartbeatInterval = 30000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set())
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const messageHandlersRef = useRef<MessageHandler[]>([])
  const clientId = useRef<string>(`client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback(() => {
    const baseDelay = reconnectInterval
    const attempt = reconnectAttemptsRef.current
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxReconnectDelay)
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay
    return exponentialDelay + jitter
  }, [reconnectInterval, maxReconnectDelay])

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' } as WebSocketMessage)
      }
    }, heartbeatInterval)
  }, [heartbeatInterval])

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      setLastMessage(message)

      // Handle internal message types
      switch (message.type) {
        case 'connection':
          console.log('WebSocket connection confirmed:', message)
          break
        case 'pong':
          // Heartbeat response
          break
        case 'channel_subscribed':
          if (message.channel) {
            setSubscribedChannels(prev => new Set(prev).add(message.channel!))
          }
          break
        case 'channel_unsubscribed':
          if (message.channel) {
            setSubscribedChannels(prev => {
              const newSet = new Set(prev)
              newSet.delete(message.channel!)
              return newSet
            })
          }
          break
      }

      // Call global message handler
      onMessage?.(message)

      // Call registered type/channel specific handlers
      messageHandlersRef.current.forEach(({ type, channel, handler }) => {
        const typeMatch = !type || message.type === type
        const channelMatch = !channel || message.channel === channel
        
        if (typeMatch && channelMatch) {
          handler(message)
        }
      })
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }, [onMessage])

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      setConnectionState('connecting')

      // Use relative WebSocket URL in production
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = process.env.NODE_ENV === 'production' 
        ? window.location.host 
        : 'localhost:8000'
      const wsUrl = `${protocol}//${host}/ws/${clientId.current}`
      
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionState('connected')
        reconnectAttemptsRef.current = 0
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }

        startHeartbeat()
        onConnect?.()

        // Subscribe to channels
        channels.forEach(channel => {
          subscribeToChannel(channel)
        })
      }

      wsRef.current.onmessage = handleMessage

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        setConnectionState('disconnected')
        setSubscribedChannels(new Set())
        stopHeartbeat()
        wsRef.current = null
        onDisconnect?.()

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < reconnectAttempts && !reconnectTimeoutRef.current) {
          const delay = getReconnectDelay()
          console.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptsRef.current + 1}/${reconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            reconnectTimeoutRef.current = null
            connect()
          }, delay)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionState('error')
        onError?.(error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionState('error')
    }
  }, [channels, reconnectAttempts, getReconnectDelay, startHeartbeat, stopHeartbeat, handleMessage, onConnect, onDisconnect, onError])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = reconnectAttempts // Prevent reconnection
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    stopHeartbeat()
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [reconnectAttempts, stopHeartbeat])

  // Send message through WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  // Subscribe to a channel
  const subscribeToChannel = useCallback((channel: string) => {
    if (subscribedChannels.has(channel)) {
      return
    }

    sendMessage({
      type: 'system',
      action: 'subscribe',
      channel
    } as WebSocketMessage)
  }, [subscribedChannels, sendMessage])

  // Unsubscribe from a channel
  const unsubscribeFromChannel = useCallback((channel: string) => {
    if (!subscribedChannels.has(channel)) {
      return
    }

    sendMessage({
      type: 'system',
      action: 'unsubscribe',
      channel
    } as WebSocketMessage)
  }, [subscribedChannels, sendMessage])

  // Register a message handler for specific type/channel
  const registerHandler = useCallback((
    handler: (message: WebSocketMessage) => void,
    type?: MessageType,
    channel?: string
  ): (() => void) => {
    const messageHandler: MessageHandler = { type, channel, handler }
    messageHandlersRef.current.push(messageHandler)

    // Return unregister function
    return () => {
      messageHandlersRef.current = messageHandlersRef.current.filter(h => h !== messageHandler)
    }
  }, [])

  // Effect to manage connection lifecycle
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount, not on every connect/disconnect change

  // Effect to update channel subscriptions
  useEffect(() => {
    if (!isConnected) return

    // Subscribe to new channels
    channels.forEach(channel => {
      if (!subscribedChannels.has(channel)) {
        subscribeToChannel(channel)
      }
    })

    // Unsubscribe from removed channels
    subscribedChannels.forEach(channel => {
      if (!channels.includes(channel)) {
        unsubscribeFromChannel(channel)
      }
    })
  }, [channels, isConnected, subscribedChannels, subscribeToChannel, unsubscribeFromChannel])

  return {
    isConnected,
    connectionState,
    sendMessage,
    lastMessage,
    clientId: clientId.current,
    subscribedChannels: Array.from(subscribedChannels),
    subscribeToChannel,
    unsubscribeFromChannel,
    registerHandler,
    reconnect: connect,
    disconnect
  }
}

// Convenience hooks for specific message types
export function useMetricsWebSocket(onMetrics: (metrics: any) => void) {
  const { registerHandler, ...rest } = useWebSocket({
    channels: ['metrics']
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

export function useAlertsWebSocket(onAlert: (alert: any) => void) {
  const { registerHandler, ...rest } = useWebSocket({
    channels: ['alerts']
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

export function useAgentStatusWebSocket(onAgentUpdate: (update: any) => void) {
  const { registerHandler, ...rest } = useWebSocket({
    channels: ['agents']
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

export function useWorkflowWebSocket(onWorkflowUpdate: (update: any) => void) {
  const { registerHandler, ...rest } = useWebSocket({
    channels: ['workflows']
  })

  useEffect(() => {
    return registerHandler((message) => {
      if ((message.type === 'workflow_update' || 
           message.type === 'workflow_progress' || 
           message.type === 'workflows_update') && message.data) {
        onWorkflowUpdate({
          type: message.type,
          data: message.data,
          workflow_id: message.workflow_id
        })
      }
    })
  }, [registerHandler, onWorkflowUpdate])

  return rest
}