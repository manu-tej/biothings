import { useWebSocketStore, type WebSocketMessage, type MessageType, type ConnectionStatus } from '../stores/websocketStore';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  reconnectDecay?: number;
  maxReconnectAttempts?: number;
  binaryType?: BinaryType;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  messageQueueSize?: number;
}

export interface WebSocketManagerOptions {
  maxConnections?: number;
  defaultConfig?: Partial<WebSocketConfig>;
  onError?: (error: Error, connectionId: string) => void;
  onConnectionChange?: (connectionId: string, status: ConnectionStatus) => void;
}

class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, ManagedWebSocket> = new Map();
  private readonly maxConnections: number;
  private readonly defaultConfig: Partial<WebSocketConfig>;
  private readonly onError?: (error: Error, connectionId: string) => void;
  private readonly onConnectionChange?: (connectionId: string, status: ConnectionStatus) => void;

  private constructor(options: WebSocketManagerOptions = {}) {
    this.maxConnections = options.maxConnections || 3;
    this.defaultConfig = options.defaultConfig || {};
    this.onError = options.onError;
    this.onConnectionChange = options.onConnectionChange;
  }

  static getInstance(options?: WebSocketManagerOptions): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(options);
    }
    return WebSocketManager.instance;
  }

  async connect(connectionId: string, config: WebSocketConfig): Promise<void> {
    // Check if already connected
    if (this.connections.has(connectionId)) {
      return;
    }

    // Check max connections
    if (this.connections.size >= this.maxConnections) {
      throw new Error(`Maximum connections (${this.maxConnections}) reached`);
    }

    // Create managed WebSocket
    const managedSocket = new ManagedWebSocket(
      connectionId,
      { ...this.defaultConfig, ...config },
      this.handleMessage.bind(this),
      this.handleStatusChange.bind(this),
      this.handleError.bind(this)
    );

    this.connections.set(connectionId, managedSocket);
    
    // Update store
    const store = useWebSocketStore.getState();
    store.connect(connectionId, config.url);
    
    // Connect
    await managedSocket.connect();
  }

  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.disconnect();
    this.connections.delete(connectionId);
    
    // Update store
    const store = useWebSocketStore.getState();
    store.disconnect(connectionId);
  }

  disconnectAll(): void {
    this.connections.forEach((connection, _id) => {
      connection.disconnect();
    });
    this.connections.clear();
    
    // Update store
    const store = useWebSocketStore.getState();
    store.disconnectAll();
  }

  send(connectionId: string, topic: string, data: any, type: MessageType = 'update'): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    const message: Omit<WebSocketMessage, 'id'> = {
      topic,
      type,
      data,
      timestamp: new Date(),
    };

    connection.send(message);
  }

  broadcast(topic: string, data: any, type: MessageType = 'update'): void {
    const message: Omit<WebSocketMessage, 'id'> = {
      topic,
      type,
      data,
      timestamp: new Date(),
    };

    this.connections.forEach((connection) => {
      connection.send(message);
    });
  }

  getConnection(connectionId: string): ManagedWebSocket | undefined {
    return this.connections.get(connectionId);
  }

  getActiveConnections(): string[] {
    return Array.from(this.connections.keys()).filter(id => {
      const connection = this.connections.get(id);
      return connection?.isConnected();
    });
  }

  private handleMessage(connectionId: string, message: WebSocketMessage): void {
    const store = useWebSocketStore.getState();
    store.handleMessage(connectionId, message);
  }

  private handleStatusChange(connectionId: string, status: ConnectionStatus): void {
    const store = useWebSocketStore.getState();
    store.updateConnectionStatus(connectionId, status);
    
    if (this.onConnectionChange) {
      this.onConnectionChange(connectionId, status);
    }
  }

  private handleError(connectionId: string, error: Error): void {
    if (this.onError) {
      this.onError(error, connectionId);
    }
  }
}

class ManagedWebSocket {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private messageQueue: Array<Omit<WebSocketMessage, 'id'>> = [];
  private isReconnecting = false;
  private shouldReconnect = true;
  private messageIdCounter = 0;

  constructor(
    private readonly connectionId: string,
    private readonly config: WebSocketConfig,
    private readonly onMessage: (connectionId: string, message: WebSocketMessage) => void,
    private readonly onStatusChange: (connectionId: string, status: ConnectionStatus) => void,
    private readonly onError: (connectionId: string, error: Error) => void
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.onStatusChange(this.connectionId, 'connecting');
        
        this.socket = new WebSocket(this.config.url, this.config.protocols);
        
        if (this.config.binaryType) {
          this.socket.binaryType = this.config.binaryType;
        }

        this.socket.onopen = () => {
          this.onStatusChange(this.connectionId, 'connected');
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          
          // Start heartbeat
          if (this.config.enableHeartbeat) {
            this.startHeartbeat();
          }
          
          // Send queued messages
          this.flushMessageQueue();
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.onMessage(this.connectionId, message);
          } catch (error) {
            this.onError(this.connectionId, error as Error);
          }
        };

        this.socket.onerror = (_event) => {
          const error = new Error('WebSocket error');
          this.onError(this.connectionId, error);
          this.onStatusChange(this.connectionId, 'error');
          reject(error);
        };

        this.socket.onclose = (event) => {
          this.onStatusChange(this.connectionId, 'disconnected');
          this.stopHeartbeat();
          
          if (this.shouldReconnect && !event.wasClean) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.onError(this.connectionId, error as Error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
  }

  send(message: Omit<WebSocketMessage, 'id'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      id: this.generateMessageId(),
    };

    if (this.isConnected() && this.socket) {
      try {
        this.socket.send(JSON.stringify(fullMessage));
      } catch (_error) {
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getBufferedAmount(): number {
    return this.socket?.bufferedAmount || 0;
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting || !this.shouldReconnect) return;
    
    const maxAttempts = this.config.maxReconnectAttempts || 5;
    if (this.reconnectAttempts >= maxAttempts) {
      this.onStatusChange(this.connectionId, 'error');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = this.calculateReconnectDelay();

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(_error => {
        // Handle reconnection error silently
      });
    }, delay);
  }

  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectDelay || 1000;
    const maxDelay = this.config.maxReconnectDelay || 30000;
    const decay = this.config.reconnectDecay || 1.5;
    
    const delay = Math.min(
      baseDelay * Math.pow(decay, this.reconnectAttempts - 1),
      maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = delay * 0.2 * Math.random();
    return Math.floor(delay + jitter);
  }

  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 30000;
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          topic: 'system',
          type: 'ping',
          data: { timestamp: Date.now() },
          timestamp: new Date(),
        });
      }
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private queueMessage(message: Omit<WebSocketMessage, 'id'>): void {
    const maxSize = this.config.messageQueueSize || 100;
    
    if (this.messageQueue.length >= maxSize) {
      this.messageQueue.shift(); // Remove oldest message
    }
    
    this.messageQueue.push(message);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private generateMessageId(): string {
    return `${this.connectionId}-${Date.now()}-${++this.messageIdCounter}`;
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();