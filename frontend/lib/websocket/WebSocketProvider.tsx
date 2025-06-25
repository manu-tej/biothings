'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { wsManager, WebSocketConfig } from './WebSocketManager';
import { useWebSocketStore, ConnectionStatus, MessageHandler, MessageFilter } from '../stores/websocketStore';

export interface WebSocketContextValue {
  status: ConnectionStatus;
  connect: (connectionId: string, config: WebSocketConfig) => Promise<void>;
  disconnect: (connectionId?: string) => void;
  send: (topic: string, data: any, connectionId?: string) => void;
  subscribe: (topic: string, handler: MessageHandler, filter?: MessageFilter) => () => void;
  unsubscribe: (topic: string, handler: MessageHandler) => void;
  getConnectionStatus: (connectionId: string) => ConnectionStatus | null;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  connectionConfigs?: Array<{
    id: string;
    config: WebSocketConfig;
  }>;
  onError?: (error: Error, connectionId: string) => void;
  onConnectionChange?: (connectionId: string, status: ConnectionStatus) => void;
}

export function WebSocketProvider({
  children,
  autoConnect = false,
  connectionConfigs = [],
  onError,
  onConnectionChange,
}: WebSocketProviderProps) {
  const initRef = useRef(false);
  const status = useWebSocketStore((state) => state.globalStatus);
  const subscribe = useWebSocketStore((state) => state.subscribe);
  const unsubscribe = useWebSocketStore((state) => state.unsubscribe);
  const send = useWebSocketStore((state) => state.send);
  const getConnectionStatus = useWebSocketStore((state) => state.getConnectionStatus);

  // Initialize WebSocket manager with options
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      
      // Configure the WebSocket manager instance
      if (onError || onConnectionChange) {
        // Re-initialize with callbacks
        const manager = wsManager;
        // Note: In a real implementation, we'd need to update the manager's callbacks
        // For now, we'll use the existing singleton
      }
    }
  }, [onError, onConnectionChange]);

  // Auto-connect on mount if specified
  useEffect(() => {
    if (autoConnect && connectionConfigs.length > 0) {
      connectionConfigs.forEach(({ id, config }) => {
        connect(id, config).catch(error => {
          console.error(`Failed to auto-connect ${id}:`, error);
        });
      });
    }

    // Cleanup on unmount
    return () => {
      if (autoConnect) {
        wsManager.disconnectAll();
      }
    };
  }, [autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async (connectionId: string, config: WebSocketConfig) => {
    try {
      await wsManager.connect(connectionId, config);
    } catch (error) {
      console.error(`Failed to connect ${connectionId}:`, error);
      if (onError) {
        onError(error as Error, connectionId);
      }
      throw error;
    }
  };

  const disconnect = (connectionId?: string) => {
    if (connectionId) {
      wsManager.disconnect(connectionId);
    } else {
      wsManager.disconnectAll();
    }
  };

  const contextValue: WebSocketContextValue = {
    status,
    connect,
    disconnect,
    send: (topic, data, connectionId) => {
      if (connectionId) {
        wsManager.send(connectionId, topic, data);
      } else {
        // Use store's send which will pick the first available connection
        send(topic, data);
      }
    },
    subscribe,
    unsubscribe,
    getConnectionStatus,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook to use WebSocket context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Convenience hook for subscribing to a specific topic
export function useWebSocketSubscription<T = any>(
  topic: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { subscribe, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    const messageHandler: MessageHandler = (message) => {
      handler(message.data as T);
    };
    
    const unsubscribeFn = subscribe(topic, messageHandler);
    
    return () => {
      unsubscribeFn();
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// Hook for connection status monitoring
export function useConnectionStatus(connectionId?: string) {
  const { status, getConnectionStatus } = useWebSocket();
  
  if (connectionId) {
    return getConnectionStatus(connectionId);
  }
  
  return status;
}

// Hook for sending messages with automatic retry
export function useWebSocketSend() {
  const { send, status } = useWebSocket();
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const sendMessage = React.useCallback(
    async (topic: string, data: any, options?: { connectionId?: string; retries?: number }) => {
      setSending(true);
      setError(null);
      
      try {
        if (status !== 'connected' && !options?.connectionId) {
          throw new Error('No active WebSocket connection');
        }
        
        send(topic, data, options?.connectionId);
        setSending(false);
      } catch (err) {
        const error = err as Error;
        setError(error);
        setSending(false);
        
        // Retry logic if specified
        if (options?.retries && options.retries > 0) {
          setTimeout(() => {
            sendMessage(topic, data, { ...options, retries: options.retries! - 1 });
          }, 1000);
        }
      }
    },
    [send, status]
  );

  return { sendMessage, sending, error };
}

// Hook for managing multiple connections
export function useMultipleConnections(
  configs: Array<{ id: string; config: WebSocketConfig }>
) {
  const { connect, disconnect, getConnectionStatus } = useWebSocket();
  const [connecting, setConnecting] = React.useState<Set<string>>(new Set());
  const [errors, setErrors] = React.useState<Map<string, Error>>(new Map());

  const connectAll = React.useCallback(async () => {
    setConnecting(new Set(configs.map(c => c.id)));
    setErrors(new Map());
    
    const results = await Promise.allSettled(
      configs.map(({ id, config }) => connect(id, config))
    );
    
    const newErrors = new Map<string, Error>();
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        newErrors.set(configs[index].id, result.reason);
      }
    });
    
    setErrors(newErrors);
    setConnecting(new Set());
  }, [configs, connect]);

  const disconnectAll = React.useCallback(() => {
    configs.forEach(({ id }) => disconnect(id));
  }, [configs, disconnect]);

  const statuses = React.useMemo(() => {
    const statusMap = new Map<string, ConnectionStatus | null>();
    configs.forEach(({ id }) => {
      statusMap.set(id, getConnectionStatus(id));
    });
    return statusMap;
  }, [configs, getConnectionStatus]);

  return {
    connectAll,
    disconnectAll,
    statuses,
    connecting,
    errors,
  };
}