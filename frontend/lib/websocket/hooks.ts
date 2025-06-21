/**
 * React hooks for WebSocket connection management
 * Provides easy integration with the WebSocket manager
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { wsManager, type ConnectionState } from './connection-manager';

interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  autoReconnect?: boolean;
}

/**
 * Hook for subscribing to WebSocket topics
 */
export function useWebSocket<T = any>(
  topic: string,
  handler: (data: T) => void,
  options: UseWebSocketOptions = {}
) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const handlerRef = useRef(handler);

  // Update handler ref to avoid re-subscriptions
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Create wrapped handler that updates state
    const wrappedHandler = (data: T) => {
      setLastMessage(data);
      handlerRef.current(data);
    };

    // Subscribe to topic
    const unsubscribe = wsManager.subscribe(topic, wrappedHandler);

    // Monitor connection state
    const checkConnectionState = () => {
      const state = wsManager.getConnectionState(topic);
      setConnectionState(state);
      
      if (state === 'connected' && options.onConnect) {
        options.onConnect();
      } else if (state === 'disconnected' && options.onDisconnect) {
        options.onDisconnect();
      } else if (state === 'error' && options.onError) {
        options.onError(new Error('WebSocket connection error'));
      }
    };

    // Initial check
    checkConnectionState();

    // Set up periodic state check
    const interval = setInterval(checkConnectionState, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [topic, options.onConnect, options.onDisconnect, options.onError]);

  const sendMessage = useCallback((data: any) => {
    wsManager.send(topic, data);
  }, [topic]);

  return {
    connectionState,
    lastMessage,
    sendMessage,
    isConnected: connectionState === 'connected'
  };
}

/**
 * Hook for agent status updates
 */
export function useAgentStatusWebSocket(
  onUpdate: (data: any) => void,
  options?: UseWebSocketOptions
) {
  return useWebSocket('agent-status', onUpdate, options);
}

/**
 * Hook for workflow updates
 */
export function useWorkflowWebSocket(
  onUpdate: (data: any) => void,
  options?: UseWebSocketOptions
) {
  return useWebSocket('workflow-updates', onUpdate, options);
}

/**
 * Hook for alerts
 */
export function useAlertsWebSocket(
  onAlert: (data: any) => void,
  options?: UseWebSocketOptions
) {
  return useWebSocket('alerts', onAlert, options);
}

/**
 * Hook for metrics updates
 */
export function useMetricsWebSocket(
  onUpdate: (data: any) => void,
  options?: UseWebSocketOptions
) {
  return useWebSocket('metrics', onUpdate, options);
}

/**
 * Hook for multiple topic subscriptions
 */
export function useMultipleWebSockets<T extends Record<string, any>>(
  topics: {
    [K in keyof T]: {
      topic: string;
      handler: (data: T[K]) => void;
    };
  },
  options?: UseWebSocketOptions
) {
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionState>>({});
  const [lastMessages, setLastMessages] = useState<Partial<T>>({});

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];
    const stateCheckIntervals: NodeJS.Timeout[] = [];

    Object.entries(topics).forEach(([key, config]) => {
      const { topic, handler } = config as any;

      // Create wrapped handler
      const wrappedHandler = (data: any) => {
        setLastMessages(prev => ({ ...prev, [key]: data }));
        handler(data);
      };

      // Subscribe
      const unsubscribe = wsManager.subscribe(topic, wrappedHandler);
      unsubscribes.push(unsubscribe);

      // Monitor state
      const checkState = () => {
        const state = wsManager.getConnectionState(topic);
        setConnectionStates(prev => ({ ...prev, [topic]: state }));
      };

      checkState();
      const interval = setInterval(checkState, 1000);
      stateCheckIntervals.push(interval);
    });

    return () => {
      unsubscribes.forEach(fn => fn());
      stateCheckIntervals.forEach(interval => clearInterval(interval));
    };
  }, [topics]);

  const sendMessage = useCallback((topic: string, data: any) => {
    wsManager.send(topic, data);
  }, []);

  return {
    connectionStates,
    lastMessages,
    sendMessage
  };
}

/**
 * Hook to get WebSocket manager info
 */
export function useWebSocketInfo() {
  const [connectionsInfo, setConnectionsInfo] = useState(wsManager.getConnectionsInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionsInfo(wsManager.getConnectionsInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return connectionsInfo;
}