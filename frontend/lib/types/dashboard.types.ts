// Dashboard-specific types
/* eslint-disable @typescript-eslint/no-explicit-any */

import { JSONValue, StringRecord } from './common.types'

export interface DashboardMetrics {
  totalAgents: number
  activeAgents: number
  totalWorkflows: number
  runningWorkflows: number
  completedWorkflows: number
  failedWorkflows: number
  systemUptime: number
  avgResponseTime: number
  errorRate: number
  throughput: number
}

export interface AgentDashboard {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  metrics: AgentMetrics
  history: AgentHistoryEntry[]
  configuration: AgentConfiguration
}

export type AgentType = 'executive' | 'worker' | 'analyzer' | 'coordinator' | 'specialist'

export type AgentStatus = 'active' | 'idle' | 'error' | 'offline' | 'maintenance'

export interface AgentMetrics {
  tasksCompleted: number
  tasksInProgress: number
  tasksFailed: number
  averageTaskTime: number
  successRate: number
  cpuUsage: number
  memoryUsage: number
  networkLatency: number
  uptime: number
  lastActive: Date
}

export interface AgentHistoryEntry {
  id: string
  timestamp: Date
  event: AgentEvent
  details: StringRecord<JSONValue>
  duration?: number
}

export type AgentEvent =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'status_changed'
  | 'error_occurred'
  | 'maintenance_started'
  | 'maintenance_completed'

export interface AgentConfiguration {
  maxConcurrentTasks: number
  taskTimeout: number
  retryPolicy: RetryPolicy
  capabilities: string[]
  permissions: Permission[]
  resourceLimits: ResourceLimits
}

export interface RetryPolicy {
  maxRetries: number
  backoffMultiplier: number
  maxBackoffSeconds: number
}

export interface Permission {
  resource: string
  actions: string[]
}

export interface ResourceLimits {
  maxCpuPercent: number
  maxMemoryMB: number
  maxNetworkBandwidthMbps: number
}

export interface WorkflowDashboard {
  id: string
  name: string
  description?: string
  status: WorkflowStatus
  progress: WorkflowProgress
  steps: WorkflowStep[]
  metadata: WorkflowMetadata
  performance: WorkflowPerformance
}

export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface WorkflowProgress {
  currentStep: number
  totalSteps: number
  percentComplete: number
  estimatedTimeRemaining?: number
  startedAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface WorkflowStep {
  id: string
  name: string
  type: WorkflowStepType
  status: WorkflowStepStatus
  agentId?: string
  input?: any
  output?: any
  error?: WorkflowError
  startedAt?: Date
  completedAt?: Date
  duration?: number
}

export type WorkflowStepType = 'action' | 'decision' | 'parallel' | 'loop' | 'condition' | 'wait'

export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface WorkflowError {
  code: string
  message: string
  details?: any
  stackTrace?: string
  recoverable: boolean
}

export interface WorkflowMetadata {
  creator: string
  tags: string[]
  priority: WorkflowPriority
  dependencies: string[]
  version: string
}

export type WorkflowPriority = 'low' | 'normal' | 'high' | 'critical'

export interface WorkflowPerformance {
  totalDuration: number
  stepDurations: Record<string, number>
  resourceUsage: ResourceUsage
  bottlenecks: Bottleneck[]
}

export interface ResourceUsage {
  cpuTime: number
  memoryPeak: number
  networkBandwidth: number
  apiCalls: number
}

export interface Bottleneck {
  stepId: string
  type: 'cpu' | 'memory' | 'network' | 'wait'
  severity: 'low' | 'medium' | 'high'
  impact: number // percentage of total time
}

export interface SystemHealthDashboard {
  overall: HealthStatus
  services: ServiceHealth[]
  alerts: HealthAlert[]
  metrics: SystemMetrics
  history: HealthHistoryEntry[]
}

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

export interface ServiceHealth {
  id: string
  name: string
  type: ServiceType
  status: HealthStatus
  responseTime: number
  errorRate: number
  uptime: number
  lastChecked: Date
  dependencies: string[]
}

export type ServiceType = 'api' | 'database' | 'cache' | 'queue' | 'storage' | 'external'

export interface HealthAlert {
  id: string
  severity: AlertSeverity
  type: AlertType
  title: string
  message: string
  source: string
  timestamp: Date
  acknowledged: boolean
  resolvedAt?: Date
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export type AlertType = 'performance' | 'availability' | 'security' | 'capacity' | 'configuration'

export interface SystemMetrics {
  cpu: MetricValue
  memory: MetricValue
  disk: MetricValue
  network: NetworkMetrics
  requests: RequestMetrics
}

export interface MetricValue {
  current: number
  average: number
  peak: number
  trend: 'up' | 'down' | 'stable'
}

export interface NetworkMetrics {
  bandwidth: MetricValue
  latency: MetricValue
  packetLoss: number
}

export interface RequestMetrics {
  totalRequests: number
  requestsPerSecond: number
  averageResponseTime: number
  errorRate: number
  statusCodes: Record<number, number>
}

export interface HealthHistoryEntry {
  timestamp: Date
  status: HealthStatus
  metrics: SystemMetrics
  events: HealthEvent[]
}

export interface HealthEvent {
  type: 'status_change' | 'alert' | 'maintenance' | 'incident'
  description: string
  severity: AlertSeverity
  duration?: number
}

export interface DashboardFilter {
  id: string
  name: string
  type: FilterType
  field: string
  operator: FilterOperator
  value: any
  enabled: boolean
}

export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'not_in'

export interface DashboardTimeRange {
  type: TimeRangeType
  start?: Date
  end?: Date
  duration?: number
}

export type TimeRangeType = 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom'

export interface DashboardExport {
  format: ExportFormat
  sections: ExportSection[]
  options: ExportOptions
}

export type ExportFormat = 'pdf' | 'csv' | 'json' | 'xlsx'

export interface ExportSection {
  type: 'metrics' | 'charts' | 'tables' | 'logs'
  title: string
  data: any
  config?: any
}

export interface ExportOptions {
  includeCharts: boolean
  includeRawData: boolean
  dateRange?: DashboardTimeRange
  filters?: DashboardFilter[]
  format?: FormatOptions
}

export interface FormatOptions {
  paperSize?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
  margins?: Margins
  fontSize?: number
}

export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}
