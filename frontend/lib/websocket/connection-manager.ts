/**
 * WebSocket Connection Manager
 * Implements connection pooling, multiplexing, and automatic reconnection
 * Optimized for M1 MacBook performance
 */

export type MessageHandler = (data: any) => void
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketConfig {
  url?: string
  protocols?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

interface Subscription {
  topic: string
  handler: MessageHandler
  id: string
}

interface ConnectionPool {
  ws: WebSocket
  topics: Set<string>
  state: ConnectionState
  reconnectAttempts: number
  lastActivity: number
  heartbeatTimer?: NodeJS.Timeout
}

export class WebSocketConnectionManager {
  private static instance: WebSocketConnectionManager
  private connections = new Map<string, ConnectionPool>()
  private subscriptions = new Map<string, Set<Subscription>>()
  private readonly MAX_CONNECTIONS = 3
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000 // 1 minute
  private config: WebSocketConfig

  private constructor() {
    this.config = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
    }

    // Clean up idle connections periodically
    setInterval(() => this.cleanupIdleConnections(), 60000)
  }

  static getInstance(): WebSocketConnectionManager {
    if (!WebSocketConnectionManager.instance) {
      WebSocketConnectionManager.instance = new WebSocketConnectionManager()
    }
    return WebSocketConnectionManager.instance
  }

  /**
   * Subscribe to a topic with automatic connection management
   */
  subscribe(topic: string, handler: MessageHandler, config?: Partial<WebSocketConfig>): () => void {
    const subscription: Subscription = {
      topic,
      handler,
      id: `${topic}-${Date.now()}-${Math.random()}`,
    }

    // Get or create connection for this topic
    const connectionKey = this.getConnectionKey(topic)
    const mergedConfig = { ...this.config, ...config }

    // Ensure connection exists
    if (!this.connections.has(connectionKey)) {
      this.createConnection(connectionKey, mergedConfig)
    }

    // Add subscription
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set())
    }
    this.subscriptions.get(topic)!.add(subscription)

    // Add topic to connection
    const connection = this.connections.get(connectionKey)
    if (connection) {
      connection.topics.add(topic)

      // Send subscription message if connected
      if (connection.state === 'connected') {
        this.sendSubscriptionMessage(connection.ws, topic, 'subscribe')
      }
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(topic)
      if (handlers) {
        handlers.delete(subscription)
        if (handlers.size === 0) {
          this.subscriptions.delete(topic)
          this.unsubscribeFromTopic(connectionKey, topic)
        }
      }
    }
  }

  /**
   * Send a message to a specific topic
   */
  send(topic: string, data: any): void {
    const connectionKey = this.getConnectionKey(topic)
    const connection = this.connections.get(connectionKey)

    if (connection && connection.state === 'connected') {
      const message = JSON.stringify({
        topic,
        data,
        timestamp: new Date().toISOString(),
      })

      try {
        connection.ws.send(message)
        connection.lastActivity = Date.now()
      } catch (error) {
        this.handleConnectionError(connectionKey, error)
      }
    } else {
      // Cannot send message: connection not ready
    }
  }

  /**
   * Get connection state for a topic
   */
  getConnectionState(topic: string): ConnectionState {
    const connectionKey = this.getConnectionKey(topic)
    const connection = this.connections.get(connectionKey)
    return connection?.state || 'disconnected'
  }

  /**
   * Get all active connections info
   */
  getConnectionsInfo(): Array<{
    key: string
    state: ConnectionState
    topics: string[]
    lastActivity: Date
  }> {
    return Array.from(this.connections.entries()).map(([key, conn]) => ({
      key,
      state: conn.state,
      topics: Array.from(conn.topics),
      lastActivity: new Date(conn.lastActivity),
    }))
  }

  private getConnectionKey(topic: string): string {
    // Distribute topics across connections based on hash
    const hash = topic.split('').reduce((acc, char) => {
      return (acc << 5) - acc + char.charCodeAt(0)
    }, 0)
    return `conn_${Math.abs(hash) % this.MAX_CONNECTIONS}`
  }

  private createConnection(key: string, config: WebSocketConfig): void {
    const url = config.url || this.config.url!
    const ws = new WebSocket(url, config.protocols)

    const connection: ConnectionPool = {
      ws,
      topics: new Set(),
      state: 'connecting',
      reconnectAttempts: 0,
      lastActivity: Date.now(),
    }

    this.connections.set(key, connection)
    this.setupConnectionHandlers(key, connection, config)
  }

  private setupConnectionHandlers(
    key: string,
    connection: ConnectionPool,
    config: WebSocketConfig
  ): void {
    const { ws } = connection

    ws.onopen = () => {
      connection.state = 'connected'
      connection.reconnectAttempts = 0
      connection.lastActivity = Date.now()

      // Send subscription messages for all topics
      connection.topics.forEach((topic) => {
        this.sendSubscriptionMessage(ws, topic, 'subscribe')
      })

      // Start heartbeat
      this.startHeartbeat(key, connection)
    }

    ws.onmessage = (event) => {
      connection.lastActivity = Date.now()

      try {
        const message = JSON.parse(event.data)

        // Handle heartbeat response
        if (message.type === 'pong') {
          return
        }

        // Route message to subscribers
        const topic = message.topic || 'default'
        const handlers = this.subscriptions.get(topic)

        if (handlers && handlers.size > 0) {
          handlers.forEach((subscription) => {
            try {
              subscription.handler(message.data || message)
            } catch (_error) {
              // Handler error - continue processing other handlers
            }
          })
        }
      } catch (_error) {
        // WebSocket message parse error - ignore malformed messages
      }
    }

    ws.onerror = (error) => {
      connection.state = 'error'
      this.handleConnectionError(key, error)
    }

    ws.onclose = () => {
      connection.state = 'disconnected'
      this.stopHeartbeat(connection)

      // Attempt reconnection if there are active topics
      if (
        connection.topics.size > 0 &&
        connection.reconnectAttempts < (config.maxReconnectAttempts || 5)
      ) {
        this.scheduleReconnection(key, config)
      } else {
        this.connections.delete(key)
      }
    }
  }

  private startHeartbeat(key: string, connection: ConnectionPool): void {
    const interval = this.config.heartbeatInterval || this.HEARTBEAT_INTERVAL

    connection.heartbeatTimer = setInterval(() => {
      if (connection.state === 'connected') {
        try {
          connection.ws.send(JSON.stringify({ type: 'ping' }))
        } catch (error) {
          this.handleConnectionError(key, error)
        }
      }
    }, interval)
  }

  private stopHeartbeat(connection: ConnectionPool): void {
    if (connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer)
      connection.heartbeatTimer = undefined
    }
  }

  private handleConnectionError(key: string, _error: any): void {
    const connection = this.connections.get(key)
    if (connection) {
      connection.state = 'error'

      // Close the connection to trigger reconnection
      try {
        connection.ws.close()
      } catch (e) {
        // Ignore close errors
      }
    }
  }

  private scheduleReconnection(key: string, config: WebSocketConfig): void {
    const connection = this.connections.get(key)
    if (!connection) return

    const attempts = connection.reconnectAttempts
    const interval = (config.reconnectInterval || 5000) * Math.pow(2, attempts)

    setTimeout(
      () => {
        const conn = this.connections.get(key)
        if (conn && conn.topics.size > 0) {
          conn.reconnectAttempts++
          this.createConnection(key, config)
        }
      },
      Math.min(interval, 60000)
    ) // Max 1 minute
  }

  private sendSubscriptionMessage(
    ws: WebSocket,
    topic: string,
    action: 'subscribe' | 'unsubscribe'
  ): void {
    try {
      ws.send(
        JSON.stringify({
          type: action,
          topic,
          timestamp: new Date().toISOString(),
        })
      )
    } catch (_error) {
      // Failed to send subscription message - will retry on reconnect
    }
  }

  private unsubscribeFromTopic(connectionKey: string, topic: string): void {
    const connection = this.connections.get(connectionKey)
    if (connection) {
      connection.topics.delete(topic)

      if (connection.state === 'connected') {
        this.sendSubscriptionMessage(connection.ws, topic, 'unsubscribe')
      }

      // Close connection if no more topics
      if (connection.topics.size === 0) {
        this.closeConnection(connectionKey)
      }
    }
  }

  private closeConnection(key: string): void {
    const connection = this.connections.get(key)
    if (connection) {
      this.stopHeartbeat(connection)

      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close(1000, 'No active subscriptions')
        }
      } catch (_error) {
        // Error closing connection - ignore
      }

      this.connections.delete(key)
    }
  }

  private cleanupIdleConnections(): void {
    const now = Date.now()

    this.connections.forEach((connection, key) => {
      if (connection.topics.size === 0 && now - connection.lastActivity > this.CONNECTION_TIMEOUT) {
        this.closeConnection(key)
      }
    })
  }

  /**
   * Close all connections (useful for cleanup)
   */
  closeAll(): void {
    this.connections.forEach((_, key) => {
      this.closeConnection(key)
    })
    this.subscriptions.clear()
  }
}

// Export singleton instance
export const wsManager = WebSocketConnectionManager.getInstance()
