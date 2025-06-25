'use client'

import React, { useState, useEffect } from 'react'

import { 
  useWebSocket, 
  useMetricsWebSocket, 
  useAlertsWebSocket, 
  useAgentStatusWebSocket,
  useWorkflowWebSocket,
  type LegacyWebSocketMessage as WebSocketMessage 
} from '@/lib/hooks/useWebSocketNew'

import { ConnectionIndicator } from './WebSocketStatus'

export default function WebSocketDemo() {
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [customChannel, setCustomChannel] = useState('')
  const [messageToSend, setMessageToSend] = useState('')

  // Main WebSocket hook with all features
  const {
    isConnected,
    connectionState,
    sendMessage,
    lastMessage,
    subscribedChannels,
    subscribeToChannel,
    unsubscribeFromChannel,
    registerHandler,
    reconnect,
    disconnect
  } = useWebSocket({
    channels: ['demo', 'system'],
    onMessage: (msg) => {
      console.log('Received message:', msg)
      setMessages(prev => [...prev.slice(-9), msg])
    },
    onConnect: () => console.log('Demo connected'),
    onDisconnect: () => console.log('Demo disconnected'),
    onError: (error) => console.error('Demo error:', error)
  })

  // Example of using specialized hooks
  useMetricsWebSocket((metrics) => {
    console.log('Metrics update:', metrics)
  })

  useAlertsWebSocket((alert) => {
    console.log('New alert:', alert)
  })

  useAgentStatusWebSocket((status) => {
    console.log('Agent status update:', status)
  })

  useWorkflowWebSocket((update) => {
    console.log('Workflow update:', update)
  })

  // Register a custom handler for a specific message type
  useEffect(() => {
    const unregister = registerHandler((msg) => {
      console.log('Custom handler received:', msg)
    }, 'system', 'demo')

    return unregister
  }, [registerHandler])

  const handleSubscribe = () => {
    if (customChannel && !subscribedChannels.includes(customChannel)) {
      subscribeToChannel(customChannel)
      setCustomChannel('')
    }
  }

  const handleUnsubscribe = (channel: string) => {
    unsubscribeFromChannel(channel)
  }

  const handleSendMessage = () => {
    if (messageToSend) {
      sendMessage({
        type: 'system',
        channel: 'demo',
        data: { content: messageToSend },
        timestamp: new Date().toISOString()
      })
      setMessageToSend('')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        WebSocket Demo
      </h1>

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Connection Status</h2>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <ConnectionIndicator />
            <span className="text-sm">State: {connectionState}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Connected: {isConnected ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={reconnect}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reconnect
            </button>
            <button
              onClick={disconnect}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Channel Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Channel Management</h2>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium mb-2">Subscribed Channels:</h3>
            <div className="flex flex-wrap gap-2">
              {subscribedChannels.map(channel => (
                <div
                  key={channel}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                >
                  <span>{channel}</span>
                  <button
                    onClick={() => handleUnsubscribe(channel)}
                    className="text-red-600 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={customChannel}
              onChange={(e) => setCustomChannel(e.target.value)}
              placeholder="Channel name"
              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            />
            <button
              onClick={handleSubscribe}
              disabled={!customChannel}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Send Message */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Send Message</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={messageToSend}
            onChange={(e) => setMessageToSend(e.target.value)}
            placeholder="Message content"
            className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageToSend || !isConnected}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Recent Messages</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 dark:text-blue-400">
                    Type: {msg.type}
                  </span>
                  {msg.channel && (
                    <span className="text-green-600 dark:text-green-400">
                      Channel: {msg.channel}
                    </span>
                  )}
                </div>
                {msg.data && (
                  <pre className="mt-1 text-xs overflow-x-auto">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Last Message */}
      {lastMessage && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Last Message</h2>
          <pre className="text-sm font-mono overflow-x-auto">
            {JSON.stringify(lastMessage, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}