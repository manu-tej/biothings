import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ConnectionInfo {
  id: string;
  url: string;
  status: ConnectionStatus;
  socket: WebSocket | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  lastError?: Error;
  lastConnected?: Date;
  lastDisconnected?: Date;
  messageQueue: QueuedMessage[];
}

export interface QueuedMessage {
  topic: string;
  data: any;
  timestamp: Date;
}

export interface Subscription {
  id: string;
  topic: string;
  handler: MessageHandler;
  filter?: MessageFilter;
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type MessageFilter = (message: WebSocketMessage) => boolean;

export interface WebSocketMessage {
  id: string;
  topic: string;
  type: MessageType;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type MessageType = 
  | 'update'
  | 'notification'
  | 'error'
  | 'ack'
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe';

export interface WebSocketState {
  // Connection management
  connections: Map<string, ConnectionInfo>;
  subscriptions: Map<string, Subscription[]>;
  globalStatus: ConnectionStatus;
  maxConnections: number;
  
  // Message tracking
  lastMessages: Map<string, WebSocketMessage>;
  messageHistory: WebSocketMessage[];
  maxHistorySize: number;
  
  // Statistics
  stats: ConnectionStats;
  
  // Actions
  connect: (id: string, url: string) => void;
  disconnect: (id: string) => void;
  disconnectAll: () => void;
  
  subscribe: (topic: string, handler: MessageHandler, filter?: MessageFilter) => () => void;
  unsubscribe: (topic: string, handler: MessageHandler) => void;
  unsubscribeAll: (topic: string) => void;
  
  send: (topic: string, data: any, connectionId?: string) => void;
  broadcast: (topic: string, data: any) => void;
  
  getConnectionStatus: (connectionId: string) => ConnectionStatus | null;
  getActiveConnections: () => ConnectionInfo[];
  getSubscriptionCount: (topic: string) => number;
  
  clearMessageHistory: () => void;
  updateConnectionStatus: (id: string, status: ConnectionStatus) => void;
  handleMessage: (connectionId: string, message: WebSocketMessage) => void;
}

export interface ConnectionStats {
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  bytesReceived: number;
  bytesSent: number;
  connectTime: number;
  reconnects: number;
  errors: number;
}

const initialStats: ConnectionStats = {
  totalMessages: 0,
  messagesSent: 0,
  messagesReceived: 0,
  bytesReceived: 0,
  bytesSent: 0,
  connectTime: 0,
  reconnects: 0,
  errors: 0,
};

export const useWebSocketStore = create<WebSocketState>()(
  devtools(
    (set, get) => ({
      connections: new Map(),
      subscriptions: new Map(),
      globalStatus: 'disconnected',
      maxConnections: 3,
      lastMessages: new Map(),
      messageHistory: [],
      maxHistorySize: 100,
      stats: initialStats,
      
      // Connection actions
      connect: (id, url) => {
        const state = get();
        
        // Check max connections
        if (state.connections.size >= state.maxConnections) {
          console.warn(`Maximum connections (${state.maxConnections}) reached`);
          return;
        }
        
        // Check if already connected
        const existing = state.connections.get(id);
        if (existing?.status === 'connected') {
          console.warn(`Connection ${id} already exists`);
          return;
        }
        
        // Create new connection info
        const connectionInfo: ConnectionInfo = {
          id,
          url,
          status: 'connecting',
          socket: null,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5,
          reconnectInterval: 1000,
          messageQueue: [],
        };
        
        set((state) => {
          const newConnections = new Map(state.connections);
          newConnections.set(id, connectionInfo);
          return { 
            connections: newConnections,
            globalStatus: 'connecting'
          };
        });
        
        // Note: Actual WebSocket connection would be handled by WebSocketManager
      },
      
      disconnect: (id) => {
        const connection = get().connections.get(id);
        if (!connection) return;
        
        // Close WebSocket if exists
        if (connection.socket) {
          connection.socket.close();
        }
        
        set((state) => {
          const newConnections = new Map(state.connections);
          newConnections.delete(id);
          
          // Update global status
          const remainingConnections = Array.from(newConnections.values());
          let globalStatus: ConnectionStatus = 'disconnected';
          
          if (remainingConnections.some(c => c.status === 'connected')) {
            globalStatus = 'connected';
          } else if (remainingConnections.some(c => c.status === 'connecting')) {
            globalStatus = 'connecting';
          }
          
          return { 
            connections: newConnections,
            globalStatus
          };
        });
      },
      
      disconnectAll: () => {
        const connections = get().connections;
        
        // Close all WebSocket connections
        connections.forEach(conn => {
          if (conn.socket) {
            conn.socket.close();
          }
        });
        
        set({
          connections: new Map(),
          globalStatus: 'disconnected',
        });
      },
      
      // Subscription actions
      subscribe: (topic, handler, filter) => {
        const subscriptionId = `${topic}-${Date.now()}-${Math.random()}`;
        const subscription: Subscription = {
          id: subscriptionId,
          topic,
          handler,
          filter,
        };
        
        set((state) => {
          const newSubscriptions = new Map(state.subscriptions);
          const topicSubs = newSubscriptions.get(topic) || [];
          newSubscriptions.set(topic, [...topicSubs, subscription]);
          return { subscriptions: newSubscriptions };
        });
        
        // Return unsubscribe function
        return () => {
          set((state) => {
            const newSubscriptions = new Map(state.subscriptions);
            const topicSubs = newSubscriptions.get(topic) || [];
            newSubscriptions.set(
              topic,
              topicSubs.filter(sub => sub.id !== subscriptionId)
            );
            return { subscriptions: newSubscriptions };
          });
        };
      },
      
      unsubscribe: (topic, handler) => {
        set((state) => {
          const newSubscriptions = new Map(state.subscriptions);
          const topicSubs = newSubscriptions.get(topic) || [];
          newSubscriptions.set(
            topic,
            topicSubs.filter(sub => sub.handler !== handler)
          );
          return { subscriptions: newSubscriptions };
        });
      },
      
      unsubscribeAll: (topic) => {
        set((state) => {
          const newSubscriptions = new Map(state.subscriptions);
          newSubscriptions.delete(topic);
          return { subscriptions: newSubscriptions };
        });
      },
      
      // Message actions
      send: (topic, data, connectionId) => {
        const state = get();
        const message: Partial<WebSocketMessage> = {
          topic,
          type: 'update',
          data,
          timestamp: new Date(),
        };
        
        // If connectionId specified, use that connection
        if (connectionId) {
          const connection = state.connections.get(connectionId);
          if (connection?.status === 'connected' && connection.socket) {
            // Send would be handled by WebSocketManager
            console.log(`Sending to ${connectionId}:`, message);
          } else {
            // Queue message if not connected
            set((state) => {
              const newConnections = new Map(state.connections);
              const conn = newConnections.get(connectionId);
              if (conn) {
                conn.messageQueue.push({ topic, data, timestamp: new Date() });
              }
              return { connections: newConnections };
            });
          }
        } else {
          // Send to first available connection
          const activeConnection = Array.from(state.connections.values())
            .find(c => c.status === 'connected');
          
          if (activeConnection) {
            console.log(`Sending to ${activeConnection.id}:`, message);
          }
        }
        
        // Update stats
        set((state) => ({
          stats: {
            ...state.stats,
            messagesSent: state.stats.messagesSent + 1,
            totalMessages: state.stats.totalMessages + 1,
          }
        }));
      },
      
      broadcast: (topic, data) => {
        const state = get();
        const activeConnections = Array.from(state.connections.values())
          .filter(c => c.status === 'connected');
        
        activeConnections.forEach(conn => {
          state.send(topic, data, conn.id);
        });
      },
      
      // Status queries
      getConnectionStatus: (connectionId) => {
        const connection = get().connections.get(connectionId);
        return connection?.status || null;
      },
      
      getActiveConnections: () => {
        return Array.from(get().connections.values())
          .filter(c => c.status === 'connected');
      },
      
      getSubscriptionCount: (topic) => {
        const subs = get().subscriptions.get(topic);
        return subs?.length || 0;
      },
      
      // Message handling
      handleMessage: (connectionId, message) => {
        const state = get();
        const subscriptions = state.subscriptions.get(message.topic) || [];
        
        // Update last message for topic
        set((state) => {
          const newLastMessages = new Map(state.lastMessages);
          newLastMessages.set(message.topic, message);
          
          // Update message history
          const newHistory = [...state.messageHistory, message];
          if (newHistory.length > state.maxHistorySize) {
            newHistory.shift();
          }
          
          return {
            lastMessages: newLastMessages,
            messageHistory: newHistory,
            stats: {
              ...state.stats,
              messagesReceived: state.stats.messagesReceived + 1,
              totalMessages: state.stats.totalMessages + 1,
            }
          };
        });
        
        // Notify subscribers
        subscriptions.forEach(sub => {
          if (!sub.filter || sub.filter(message)) {
            sub.handler(message);
          }
        });
      },
      
      updateConnectionStatus: (id, status) => {
        set((state) => {
          const newConnections = new Map(state.connections);
          const connection = newConnections.get(id);
          
          if (connection) {
            connection.status = status;
            if (status === 'connected') {
              connection.lastConnected = new Date();
              connection.reconnectAttempts = 0;
            } else if (status === 'disconnected' || status === 'error') {
              connection.lastDisconnected = new Date();
            }
          }
          
          // Update global status
          const allConnections = Array.from(newConnections.values());
          let globalStatus: ConnectionStatus = 'disconnected';
          
          if (allConnections.some(c => c.status === 'connected')) {
            globalStatus = 'connected';
          } else if (allConnections.some(c => c.status === 'connecting')) {
            globalStatus = 'connecting';
          } else if (allConnections.some(c => c.status === 'error')) {
            globalStatus = 'error';
          }
          
          return { 
            connections: newConnections,
            globalStatus
          };
        });
      },
      
      clearMessageHistory: () => {
        set({
          messageHistory: [],
          lastMessages: new Map(),
        });
      },
    }),
    {
      name: 'websocket-store',
    }
  )
);

// Selector hooks
export const useWebSocketStatus = () => useWebSocketStore((state) => state.globalStatus);
export const useActiveConnections = () => useWebSocketStore((state) => state.getActiveConnections());
export const useConnectionStatus = (connectionId: string) => 
  useWebSocketStore((state) => state.getConnectionStatus(connectionId));
export const useLastMessage = (topic: string) => 
  useWebSocketStore((state) => state.lastMessages.get(topic));
export const useMessageHistory = () => useWebSocketStore((state) => state.messageHistory);
export const useConnectionStats = () => useWebSocketStore((state) => state.stats);

// Utility function to create typed subscription
export function createSubscription<T = any>(
  topic: string,
  handler: (data: T) => void,
  filter?: (message: WebSocketMessage) => boolean
) {
  const wrappedHandler: MessageHandler = (message) => {
    handler(message.data as T);
  };
  
  return useWebSocketStore.getState().subscribe(topic, wrappedHandler, filter);
}