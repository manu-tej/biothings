'use client'

import React from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useWebSocket } from '@/lib/hooks/useWebSocket'

export default function WebSocketStatus() {
  const { isConnected, connectionState } = useWebSocket()

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-600 dark:text-green-400'
      case 'connecting':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Connection Error'
      default:
        return 'Disconnected'
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {isConnected ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      {connectionState === 'connecting' && (
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      )}
    </div>
  )
}

// Minimal connection indicator component
export function ConnectionIndicator({ className = '' }: { className?: string }) {
  const { connectionState } = useWebSocket()

  return (
    <div 
      className={`w-2 h-2 rounded-full ${className} ${
        connectionState === 'connected' ? 'bg-green-500' :
        connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
        connectionState === 'error' ? 'bg-red-500' :
        'bg-gray-400'
      }`} 
      title={`WebSocket: ${connectionState}`} 
    />
  )
}