/**
 * WebSocket hook for real-time updates
 */

import { useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'

interface UseWebSocketOptions {
  onMessage?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  clientId?: string
}

export function useWebSocket({
  onMessage,
  onConnect,
  onDisconnect,
  clientId = `dashboard-${Date.now()}`
}: UseWebSocketOptions = {}) {
  const unsubscribeRef = useRef<(() => void) | null>(null)
  
  useEffect(() => {
    // Connect WebSocket
    api.connectWebSocket(clientId)
    
    // Subscribe to messages
    if (onMessage) {
      unsubscribeRef.current = api.onWebSocketMessage(onMessage)
    }
    
    // Notify connection
    onConnect?.()
    
    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      api.disconnectWebSocket()
      onDisconnect?.()
    }
  }, [clientId, onConnect, onDisconnect])
  
  // Update message handler if it changes
  useEffect(() => {
    if (onMessage && unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = api.onWebSocketMessage(onMessage)
    }
  }, [onMessage])
  
  const sendMessage = useCallback((message: any) => {
    api.sendWebSocketMessage(message)
  }, [])
  
  return { sendMessage }
}