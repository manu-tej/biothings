/**
 * Common type definitions to replace 'any' types throughout the codebase
 * This file provides specific, strongly-typed interfaces for commonly used data structures
 */

// ============================================================================
// CORE UTILITY TYPES
// ============================================================================

/**
 * A type for object keys that can be either string or number
 */
export type ObjectKey = string | number | symbol

/**
 * A record type with string keys and known value types
 */
export type StringRecord<T = unknown> = Record<string, T>

/**
 * A type for JSON-serializable values
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

/**
 * A type for form data values
 */
export type FormValue = string | number | boolean | File | Date | null | undefined

/**
 * A type for form data with unknown field structure
 */
export type FormData = Record<string, FormValue | FormValue[]>

/**
 * A type for URL search parameters
 */
export type SearchParams = Record<string, string | string[] | undefined>

/**
 * A type for CSS style properties
 */
export type CSSProperties = React.CSSProperties

// ============================================================================
// API DATA TYPES
// ============================================================================

/**
 * Raw API response data before transformation
 */
export interface RawApiData {
  [key: string]: unknown
}

/**
 * Generic API payload structure
 */
export interface ApiPayload {
  [key: string]: JSONValue
}

/**
 * WebSocket message payload
 */
export interface WebSocketPayload {
  type: string
  data: JSONValue
  timestamp?: string
  metadata?: StringRecord<JSONValue>
}

/**
 * Agent command parameters
 */
export interface AgentCommandParams {
  command: string
  parameters?: StringRecord<JSONValue>
  timeout?: number
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

/**
 * Workflow execution parameters
 */
export interface WorkflowParams {
  variables?: StringRecord<JSONValue>
  timeout?: number
  retryPolicy?: {
    maxRetries: number
    backoffMultiplier: number
  }
}

/**
 * Laboratory equipment parameters
 */
export interface EquipmentParams {
  temperature?: number
  pressure?: number
  speed?: number
  voltage?: number
  current?: number
  time?: number
  [key: string]: number | string | boolean | undefined
}

/**
 * Experiment parameters
 */
export interface ExperimentParams {
  conditions: EquipmentParams
  samples: Array<{
    id: string
    quantity: number
    unit: string
    properties?: StringRecord<JSONValue>
  }>
  metadata?: StringRecord<JSONValue>
}

// ============================================================================
// EVENT AND HANDLER TYPES
// ============================================================================

/**
 * Generic event handler function
 */
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>

/**
 * Error handler function
 */
export type ErrorHandler = (error: Error | string, context?: StringRecord<unknown>) => void

/**
 * Change handler for form inputs
 */
export type ChangeHandler<T = string> = (value: T) => void

/**
 * Click handler with optional event data
 */
export type ClickHandler<T = unknown> = (event?: React.MouseEvent, data?: T) => void

/**
 * WebSocket event data
 */
export interface WebSocketEventData {
  type: string
  payload: WebSocketPayload
  connectionId?: string
  timestamp: string
}

/**
 * Agent status change event
 */
export interface AgentStatusEvent {
  agentId: string
  previousStatus: string
  newStatus: string
  timestamp: string
  metadata?: StringRecord<JSONValue>
}

/**
 * Workflow progress event
 */
export interface WorkflowProgressEvent {
  workflowId: string
  stepId?: string
  progress: number
  status: string
  data?: StringRecord<JSONValue>
}

// ============================================================================
// CHART AND VISUALIZATION TYPES
// ============================================================================

/**
 * Chart data point
 */
export interface ChartDataPoint {
  x: number | string | Date
  y: number
  label?: string
  category?: string
  metadata?: StringRecord<JSONValue>
}

/**
 * Chart dataset
 */
export interface ChartDataset {
  name: string
  data: ChartDataPoint[]
  color?: string
  type?: 'line' | 'bar' | 'area' | 'scatter' | 'pie'
  visible?: boolean
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  showLegend?: boolean
  showGrid?: boolean
  responsive?: boolean
  animations?: boolean
  colors?: string[]
  theme?: 'light' | 'dark'
  [key: string]: unknown
}

/**
 * Metric value with trend information
 */
export interface MetricValue {
  current: number
  previous?: number
  change?: number
  changePercent?: number
  trend?: 'up' | 'down' | 'stable'
  unit?: string
  label?: string
}

/**
 * Time series data
 */
export interface TimeSeriesData {
  timestamp: string | Date
  values: Record<string, number>
  metadata?: StringRecord<JSONValue>
}

/**
 * Heatmap data point
 */
export interface HeatmapDataPoint {
  x: string | number
  y: string | number
  value: number
  label?: string
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Base component props
 */
export interface BaseComponentProps {
  className?: string
  testId?: string
  id?: string
  'aria-label'?: string
}

/**
 * Modal component props
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

/**
 * Table column definition
 */
export interface TableColumn<T = StringRecord<unknown>> {
  id: string
  header: string
  accessor?: keyof T | ((row: T) => unknown)
  cell?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
}

/**
 * Form field configuration
 */
export interface FormField {
  name: string
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'file'
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  validation?: ValidationRule[]
  options?: Array<{
    value: string | number
    label: string
    disabled?: boolean
  }>
  metadata?: StringRecord<JSONValue>
}

/**
 * Form validation rule
 */
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: number | string | RegExp
  message: string
  validator?: (value: FormValue) => boolean | string
}

// ============================================================================
// NOTIFICATION AND ALERT TYPES
// ============================================================================

/**
 * Notification data
 */
export interface NotificationData {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
    style?: 'primary' | 'secondary' | 'danger'
  }>
  metadata?: StringRecord<JSONValue>
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'system' | 'security' | 'performance' | 'business'
  conditions: Array<{
    metric: string
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'contains'
    threshold: number | string
  }>
  actions: Array<{
    type: 'email' | 'slack' | 'webhook' | 'sms'
    config: StringRecord<JSONValue>
  }>
}

// ============================================================================
// LABORATORY SPECIFIC TYPES
// ============================================================================

/**
 * Equipment status data
 */
export interface EquipmentStatus {
  id: string
  status: 'idle' | 'running' | 'maintenance' | 'error' | 'offline'
  temperature?: number
  pressure?: number
  speed?: number
  progress?: number
  timeRemaining?: number
  errorMessage?: string
  lastMaintenance?: string
  nextMaintenance?: string
  parameters: EquipmentParams
}

/**
 * Sample data
 */
export interface SampleData {
  id: string
  name: string
  type: string
  quantity: number
  unit: string
  concentration?: number
  purity?: number
  source?: string
  preparedBy?: string
  preparedAt?: string
  properties: StringRecord<JSONValue>
}

/**
 * Measurement data
 */
export interface MeasurementData {
  id: string
  name: string
  value: number
  unit: string
  uncertainty?: number
  method?: string
  instrument?: string
  operator?: string
  timestamp: string
  conditions: EquipmentParams
  metadata?: StringRecord<JSONValue>
}

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

/**
 * Search query
 */
export interface SearchQuery {
  term: string
  filters?: Array<{
    field: string
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between'
    value: JSONValue
  }>
  sort?: Array<{
    field: string
    direction: 'asc' | 'desc'
  }>
  limit?: number
  offset?: number
}

/**
 * Search result
 */
export interface SearchResult<T = StringRecord<unknown>> {
  items: T[]
  total: number
  query: SearchQuery
  facets?: Record<string, Array<{
    value: string
    count: number
  }>>
  suggestions?: string[]
}

// ============================================================================
// EXPORT AND IMPORT TYPES
// ============================================================================

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'json' | 'csv' | 'xlsx' | 'pdf'
  filename?: string
  includeHeaders?: boolean
  includeMetadata?: boolean
  filters?: SearchQuery['filters']
  fields?: string[]
  template?: string
  options?: StringRecord<JSONValue>
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  errors?: Array<{
    row: number
    field?: string
    message: string
    value?: unknown
  }>
  warnings?: Array<{
    row: number
    message: string
  }>
  metadata?: StringRecord<JSONValue>
}

// ============================================================================
// WEBSOCKET CONNECTION TYPES
// ============================================================================

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
  reconnect?: boolean
  maxReconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  messageQueueSize?: number
  protocols?: string[]
  headers?: StringRecord<string>
}

/**
 * WebSocket message
 */
export interface WebSocketMessage {
  id: string
  type: string
  topic: string
  payload: WebSocketPayload
  timestamp: string
  correlationId?: string
  replyTo?: string
}

// ============================================================================
// CACHE AND STORAGE TYPES
// ============================================================================

/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  key: string
  value: T
  timestamp: number
  ttl?: number
  metadata?: StringRecord<JSONValue>
}

/**
 * Storage options
 */
export interface StorageOptions {
  encrypt?: boolean
  compress?: boolean
  ttl?: number
  namespace?: string
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard to check if value is a valid JSON value
 */
export function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true
  }
  if (Array.isArray(value)) {
    return value.every(isJSONValue)
  }
  if (typeof value === 'object') {
    return Object.values(value).every(isJSONValue)
  }
  return false
}

/**
 * Type guard to check if value is a string record
 */
export function isStringRecord(value: unknown): value is StringRecord<unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard to check if value is a valid form value
 */
export function isFormValue(value: unknown): value is FormValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof File ||
    value instanceof Date ||
    value === null ||
    value === undefined
  )
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use JSONValue instead
 */
export type AnyData = JSONValue

/**
 * @deprecated Use StringRecord<unknown> instead
 */
export type AnyObject = StringRecord<unknown>

/**
 * @deprecated Use EventHandler<T> instead
 */
export type AnyFunction = (...args: unknown[]) => unknown

/**
 * @deprecated Use WebSocketPayload instead
 */
export type AnyPayload = WebSocketPayload