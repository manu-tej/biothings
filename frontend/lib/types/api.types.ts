// Strict API response types

// Base API types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  metadata?: ResponseMetadata
}

export interface ApiError {
  code: string
  message: string
  details?: any
  field?: string
  timestamp: string
  traceId?: string
}

export interface ResponseMetadata {
  timestamp: string
  version: string
  requestId: string
  duration: number
  pagination?: PaginationInfo
  rateLimit?: RateLimitInfo
}

export interface PaginationInfo {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: string // ISO timestamp
}

// Request types
export interface ApiRequest<T = any> {
  endpoint: string
  method: HttpMethod
  params?: Record<string, any>
  query?: Record<string, any>
  body?: T
  headers?: Record<string, string>
  timeout?: number
  retries?: number
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface PaginatedRequest {
  page?: number
  pageSize?: number
  sort?: SortOptions[]
  filters?: FilterOptions[]
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

export interface FilterOptions {
  field: string
  operator: FilterOperator
  value: any
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith'

// Agent API types
export interface AgentResponse {
  id: string
  name: string
  type: string
  status: AgentStatus
  version: string
  capabilities: string[]
  metadata: AgentMetadata
  metrics: AgentMetrics
  configuration: AgentConfig
  createdAt: string
  updatedAt: string
}

export type AgentStatus = 'active' | 'idle' | 'busy' | 'error' | 'offline' | 'maintenance'

export interface AgentMetadata {
  description?: string
  owner?: string
  team?: string
  tags?: string[]
  location?: string
  environment?: string
}

export interface AgentMetrics {
  uptime: number
  tasksCompleted: number
  tasksInProgress: number
  tasksFailed: number
  averageResponseTime: number
  successRate: number
  lastActivityAt: string
  resourceUsage: ResourceUsage
}

export interface ResourceUsage {
  cpu: number
  memory: number
  disk: number
  network: number
}

export interface AgentConfig {
  maxConcurrentTasks: number
  taskTimeout: number
  retryPolicy: RetryPolicy
  resourceLimits: ResourceLimits
  features: Record<string, boolean>
}

export interface RetryPolicy {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export interface ResourceLimits {
  maxCpu: number
  maxMemory: number
  maxDisk: number
  maxBandwidth: number
}

export interface CreateAgentRequest {
  name: string
  type: string
  capabilities: string[]
  configuration?: Partial<AgentConfig>
  metadata?: AgentMetadata
}

export interface UpdateAgentRequest {
  name?: string
  status?: AgentStatus
  capabilities?: string[]
  configuration?: Partial<AgentConfig>
  metadata?: AgentMetadata
}

// Workflow API types
export interface WorkflowResponse {
  id: string
  name: string
  description?: string
  status: WorkflowStatus
  type: WorkflowType
  version: string
  steps: WorkflowStep[]
  variables: Record<string, any>
  metadata: WorkflowMetadata
  statistics: WorkflowStatistics
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

export type WorkflowStatus =
  | 'draft'
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
export type WorkflowType = 'sequential' | 'parallel' | 'conditional' | 'loop' | 'composite'

export interface WorkflowStep {
  id: string
  name: string
  type: StepType
  status: StepStatus
  agentId?: string
  action: string
  input: Record<string, any>
  output?: Record<string, any>
  error?: StepError
  retries: number
  timeout: number
  dependencies: string[]
  startedAt?: string
  completedAt?: string
  duration?: number
}

export type StepType = 'action' | 'decision' | 'parallel' | 'loop' | 'wait' | 'script'
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled'

export interface StepError {
  code: string
  message: string
  details?: any
  recoverable: boolean
  retryAfter?: number
}

export interface WorkflowMetadata {
  author: string
  category?: string
  tags?: string[]
  priority: WorkflowPriority
  schedule?: ScheduleConfig
  notifications?: NotificationConfig
}

export type WorkflowPriority = 'low' | 'normal' | 'high' | 'critical'

export interface ScheduleConfig {
  type: 'once' | 'recurring' | 'cron'
  startAt?: string
  endAt?: string
  interval?: number
  cronExpression?: string
  timezone?: string
}

export interface NotificationConfig {
  onStart?: boolean
  onComplete?: boolean
  onError?: boolean
  channels: NotificationChannel[]
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms'
  config: Record<string, any>
}

export interface WorkflowStatistics {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  averageDuration: number
  lastRunAt?: string
  nextRunAt?: string
}

export interface CreateWorkflowRequest {
  name: string
  description?: string
  type: WorkflowType
  steps: Omit<
    WorkflowStep,
    'id' | 'status' | 'output' | 'error' | 'startedAt' | 'completedAt' | 'duration'
  >[]
  variables?: Record<string, any>
  metadata?: Partial<WorkflowMetadata>
}

export interface UpdateWorkflowRequest {
  name?: string
  description?: string
  steps?: Partial<WorkflowStep>[]
  variables?: Record<string, any>
  metadata?: Partial<WorkflowMetadata>
}

export interface ExecuteWorkflowRequest {
  variables?: Record<string, any>
  priority?: WorkflowPriority
  async?: boolean
}

// Laboratory API types
export interface ExperimentResponse {
  id: string
  name: string
  description?: string
  type: ExperimentType
  status: ExperimentStatus
  hypothesis?: string
  methodology?: string
  equipment: EquipmentInfo[]
  samples: SampleInfo[]
  parameters: ExperimentParameters
  results?: ExperimentResults
  analysis?: AnalysisData
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

export type ExperimentType = 'synthesis' | 'analysis' | 'simulation' | 'optimization' | 'validation'
export type ExperimentStatus = 'draft' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface EquipmentInfo {
  id: string
  name: string
  type: string
  status: 'available' | 'in-use' | 'maintenance' | 'offline'
  capabilities: string[]
  calibration?: CalibrationInfo
}

export interface CalibrationInfo {
  lastCalibrated: string
  nextCalibration: string
  calibratedBy: string
  certificate?: string
}

export interface SampleInfo {
  id: string
  name: string
  type: string
  quantity: number
  unit: string
  source?: string
  properties?: Record<string, any>
}

export interface ExperimentParameters {
  temperature?: number
  pressure?: number
  time?: number
  ph?: number
  concentration?: Record<string, number>
  custom?: Record<string, any>
}

export interface ExperimentResults {
  data: Record<string, any>
  images?: string[]
  files?: FileReference[]
  observations?: string[]
  measurements?: Measurement[]
}

export interface FileReference {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
}

export interface Measurement {
  name: string
  value: number
  unit: string
  uncertainty?: number
  timestamp: string
}

export interface AnalysisData {
  method: string
  software?: string
  parameters?: Record<string, any>
  results: Record<string, any>
  charts?: ChartData[]
  conclusions?: string[]
}

export interface ChartData {
  type: ChartType
  title: string
  data: any
  config?: Record<string, any>
}

export type ChartType = 'line' | 'bar' | 'scatter' | 'pie' | 'heatmap' | 'contour' | '3d'

// Analytics API types
export interface AnalyticsResponse {
  period: TimePeriod
  metrics: MetricsData
  trends: TrendData[]
  comparisons?: ComparisonData[]
  forecasts?: ForecastData[]
}

export interface TimePeriod {
  start: string
  end: string
  granularity: TimeGranularity
  timezone: string
}

export type TimeGranularity = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface MetricsData {
  [key: string]: MetricValue
}

export interface MetricValue {
  value: number
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
  unit?: string
}

export interface TrendData {
  metric: string
  points: DataPoint[]
  regression?: RegressionData
}

export interface DataPoint {
  timestamp: string
  value: number
  label?: string
}

export interface RegressionData {
  type: 'linear' | 'polynomial' | 'exponential'
  equation: string
  r2: number
  predictions?: DataPoint[]
}

export interface ComparisonData {
  metric: string
  current: number
  previous: number
  difference: number
  percentChange: number
  significance?: number
}

export interface ForecastData {
  metric: string
  method: ForecastMethod
  predictions: DataPoint[]
  confidence: ConfidenceInterval[]
  accuracy?: number
}

export type ForecastMethod = 'arima' | 'exponential' | 'linear' | 'ml' | 'prophet'

export interface ConfidenceInterval {
  timestamp: string
  lower: number
  upper: number
  level: number
}

// Security API types
export interface AuthResponse {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresIn: number
  user: UserInfo
  permissions: string[]
}

export interface UserInfo {
  id: string
  username: string
  email: string
  roles: string[]
  profile?: UserProfile
}

export interface UserProfile {
  firstName?: string
  lastName?: string
  avatar?: string
  department?: string
  preferences?: UserPreferences
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto'
  language?: string
  timezone?: string
  notifications?: NotificationPreferences
}

export interface NotificationPreferences {
  email?: boolean
  push?: boolean
  sms?: boolean
  frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly'
}

// Batch API types
export interface BatchRequest {
  operations: BatchOperation[]
  mode: BatchMode
  stopOnError?: boolean
}

export type BatchMode = 'sequential' | 'parallel'

export interface BatchOperation {
  id: string
  method: HttpMethod
  endpoint: string
  params?: Record<string, any>
  body?: any
  dependsOn?: string[]
}

export interface BatchResponse {
  results: BatchResult[]
  summary: BatchSummary
}

export interface BatchResult {
  id: string
  success: boolean
  status: number
  data?: any
  error?: ApiError
  duration: number
}

export interface BatchSummary {
  total: number
  successful: number
  failed: number
  duration: number
}

// Type guards
export function isApiError(response: ApiResponse): response is ApiResponse & { error: ApiError } {
  return !response.success && response.error !== undefined
}

export function isPaginatedResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { metadata: ResponseMetadata & { pagination: PaginationInfo } } {
  return response.metadata?.pagination !== undefined
}

// Utility types
export type ApiEndpoint =
  | '/agents'
  | '/agents/:id'
  | '/workflows'
  | '/workflows/:id'
  | '/experiments'
  | '/experiments/:id'
  | '/analytics'
  | '/auth/login'
  | '/auth/logout'
  | '/auth/refresh'
  | '/batch'

export type ApiMethod<T = any> = (request: ApiRequest<T>) => Promise<ApiResponse<T>>
