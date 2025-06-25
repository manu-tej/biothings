// WebSocket message types and interfaces

export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectDelay?: number
  maxReconnectDelay?: number
  reconnectDecay?: number
  maxReconnectAttempts?: number
  binaryType?: BinaryType
  enableHeartbeat?: boolean
  heartbeatInterval?: number
  messageQueueSize?: number
  connectionTimeout?: number
}

export interface WebSocketMessage<T = any> {
  id: string
  topic: string
  type: WebSocketMessageType
  action?: WebSocketAction
  data: T
  timestamp: Date
  metadata?: MessageMetadata
  correlationId?: string
  replyTo?: string
}

export type WebSocketMessageType =
  | 'request'
  | 'response'
  | 'event'
  | 'notification'
  | 'error'
  | 'ack'
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'broadcast'

export type WebSocketAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'get'
  | 'list'
  | 'execute'
  | 'cancel'
  | 'status'

export interface MessageMetadata {
  sender?: string
  version?: string
  compressed?: boolean
  encrypted?: boolean
  priority?: MessagePriority
  ttl?: number
  headers?: Record<string, string>
}

export type MessagePriority = 'low' | 'normal' | 'high' | 'critical'

export interface WebSocketRequest<T = any> extends WebSocketMessage<T> {
  type: 'request'
  timeout?: number
  retries?: number
}

export interface WebSocketResponse<T = any> extends WebSocketMessage<T> {
  type: 'response'
  success: boolean
  error?: WebSocketError
  requestId: string
}

export interface WebSocketError {
  code: string
  message: string
  details?: any
  retryable?: boolean
  retryAfter?: number
}

export interface WebSocketEvent<T = any> extends WebSocketMessage<T> {
  type: 'event'
  eventName: string
  source: string
}

export interface WebSocketNotification<T = any> extends WebSocketMessage<T> {
  type: 'notification'
  severity: NotificationSeverity
  title: string
  persistent?: boolean
  actions?: NotificationAction[]
}

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface NotificationAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'link'
  handler?: string
}

// Topic-specific message types

export interface AgentUpdateMessage {
  agentId: string
  updateType: 'status' | 'metrics' | 'config' | 'full'
  agent?: any // Would reference Agent type
  changes?: Partial<any>
  previousState?: any
}

export interface WorkflowUpdateMessage {
  workflowId: string
  updateType: 'status' | 'progress' | 'step' | 'complete'
  workflow?: any // Would reference Workflow type
  step?: any
  progress?: number
  error?: WebSocketError
}

export interface SystemHealthMessage {
  service: string
  status: 'healthy' | 'degraded' | 'critical'
  metrics?: Record<string, number>
  alerts?: any[]
  timestamp: Date
}

export interface MetricsUpdateMessage {
  source: string
  metrics: Record<string, MetricUpdate>
  aggregationType: 'instant' | 'average' | 'sum'
  period?: number
}

export interface MetricUpdate {
  value: number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  threshold?: MetricThreshold
}

export interface MetricThreshold {
  warning?: number
  critical?: number
  direction: 'above' | 'below'
}

// Subscription management

export interface SubscriptionRequest {
  topics: string[]
  filters?: SubscriptionFilter[]
  options?: SubscriptionOptions
}

export interface SubscriptionFilter {
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn'
  value: any
}

export interface SubscriptionOptions {
  qos?: QualityOfService
  ackRequired?: boolean
  batchSize?: number
  batchInterval?: number
  transform?: string
}

export type QualityOfService = 0 | 1 | 2 // 0: at most once, 1: at least once, 2: exactly once

export interface SubscriptionAck {
  subscriptionId: string
  topics: string[]
  status: 'active' | 'pending' | 'error'
  error?: WebSocketError
}

// Connection management

export interface ConnectionInfo {
  id: string
  url: string
  status: ConnectionStatus
  connectedAt?: Date
  lastActivity?: Date
  messagesSent: number
  messagesReceived: number
  bytesTransferred: number
  latency?: number
  reconnectCount: number
}

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error'
  | 'reconnecting'

export interface ConnectionEvent {
  connectionId: string
  event: ConnectionEventType
  timestamp: Date
  details?: any
}

export type ConnectionEventType =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'reconnect'
  | 'message'
  | 'heartbeat'

// Batch operations

export interface BatchMessage<T = any> {
  id: string
  messages: WebSocketMessage<T>[]
  compressed?: boolean
  checksum?: string
}

export interface BatchAck {
  batchId: string
  received: number
  processed: number
  failed: number
  errors?: Array<{
    messageId: string
    error: WebSocketError
  }>
}

// Rate limiting

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
  window: number // in seconds
}

export interface RateLimitExceeded {
  retryAfter: number
  limit: number
  window: number
  scope?: string
}

// Type guards

export function isWebSocketRequest(message: WebSocketMessage): message is WebSocketRequest {
  return message.type === 'request'
}

export function isWebSocketResponse(message: WebSocketMessage): message is WebSocketResponse {
  return message.type === 'response'
}

export function isWebSocketEvent(message: WebSocketMessage): message is WebSocketEvent {
  return message.type === 'event'
}

export function isWebSocketNotification(
  message: WebSocketMessage
): message is WebSocketNotification {
  return message.type === 'notification'
}

export function isWebSocketError(
  message: WebSocketMessage
): message is WebSocketMessage & { error: WebSocketError } {
  return message.type === 'error' || (message as any).error !== undefined
}

// Utility types

export type MessageHandler<T = any> = (message: WebSocketMessage<T>) => void | Promise<void>
export type ErrorHandler = (error: WebSocketError, context?: any) => void
export type ConnectionHandler = (status: ConnectionStatus, info?: ConnectionInfo) => void

export interface MessageOptions {
  timeout?: number
  priority?: MessagePriority
  compress?: boolean
  encrypt?: boolean
  ack?: boolean
}

export interface SendOptions extends MessageOptions {
  connectionId?: string
  retries?: number
  retryDelay?: number
}
