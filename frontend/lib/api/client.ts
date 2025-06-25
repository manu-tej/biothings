/**
 * Unified API client for BioThings AI Platform
 * Combines functionality from api.ts, api-client.ts, and optimized-api-client.ts
 */

import { config } from '../config'
import type {
  JSONValue,
  StringRecord,
  WebSocketPayload,
  AgentCommandParams,
  EquipmentParams,
  ExperimentParams
} from '../types/common.types'

// Types
export interface Agent {
  id: string
  name: string
  agent_type: string
  status: 'idle' | 'active' | 'thinking' | 'executing' | 'offline'
  parent_id: string | null
  subordinates: string[]
  department: string
  last_active: string
  capabilities?: string[]
}

export interface AgentHierarchy {
  id: string
  name: string
  type: string
  status: string
  department: string
  subordinates: AgentHierarchy[]
}

export interface SystemMetrics {
  timestamp: string
  system: {
    cpu_percent: number
    memory_percent: number
    memory_used_gb: number
    memory_total_gb: number
  }
  agents: {
    total_agents: number
    active_agents: number
    agent_types: Record<string, number>
  }
  websocket_connections: number
}

export interface Workflow {
  id: string
  name: string
  workflow_type: string
  status: string
  progress: number
  created_at: string
  updated_at: string
  assigned_agents: string[]
  stages?: Array<{
    name: string
    status: string
  }>
}

export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical' | 'success'
  type: string
  message: string
  timestamp: string
}

export interface Message {
  message_id: string
  sender_id: string
  recipient_id?: string
  message_type: string
  payload: WebSocketPayload
  timestamp: string
  priority?: string
}

export interface Equipment {
  id: string
  name: string
  type: string
  status: 'running' | 'idle' | 'maintenance' | 'error'
  temperature?: number
  speed?: number
  progress: number
  time_remaining?: string
  parameters?: EquipmentParams
}

export interface Experiment {
  id: string
  name: string
  type: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  start_date: string
  estimated_completion: string
  researcher: string
  equipment: string[]
  parameters?: ExperimentParams
  progress: number
  notes?: string
}

export interface LaboratoryStatus {
  equipment: {
    total: number
    online: number
    running: number
    idle: number
    maintenance: number
  }
  experiments: {
    total: number
    active: number
    pending: number
    completed: number
  }
  environment: {
    temperature: number
    humidity: number
    air_quality: string
  }
}

interface CacheEntry {
  data: JSONValue
  timestamp: number
  etag?: string
}

class UnifiedApiClient {
  private cache = new Map<string, CacheEntry>()
  private pendingRequests = new Map<string, Promise<JSONValue>>()
  private cacheTimeout = 300000 // 5 minutes default cache
  private wsConnection: WebSocket | null = null
  private wsCallbacks: Map<string, EventHandler<WebSocketPayload>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up old cache entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupCache(), 60000)
    }
  }

  private get apiBaseUrl(): string {
    // Use config for base URL
    return config.api.baseUrl
  }

  private get wsUrl(): string {
    return config.websocket.url
  }

  private cleanupCache() {
    const now = Date.now()
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.cacheTimeout * 2) {
        this.cache.delete(key)
      }
    })
  }

  private async fetchWithCache<T = JSONValue>(
    endpoint: string,
    options: RequestInit = {},
    cacheTime: number = this.cacheTimeout
  ): Promise<T> {
    const url = `${this.apiBaseUrl}${endpoint}`
    const cacheKey = `${url}-${JSON.stringify(options)}`

    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T>
    }

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data as T
    }

    // Add ETag if we have one
    if (cached?.etag) {
      options.headers = {
        ...options.headers,
        'If-None-Match': cached.etag,
      }
    }

    // Create pending request
    const pendingRequest = fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
      .then(async (response) => {
        // Handle 304 Not Modified
        if (response.status === 304 && cached) {
          cached.timestamp = Date.now()
          return cached.data as T
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const etag = response.headers.get('etag')

        // Cache the response
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          etag: etag || undefined,
        })

        return data as T
      })
      .finally(() => {
        // Remove from pending requests
        this.pendingRequests.delete(cacheKey)
      })

    this.pendingRequests.set(cacheKey, pendingRequest as Promise<JSONValue>)
    return pendingRequest
  }

  private transformAgent(agent: StringRecord<unknown>): Agent {
    return {
      id: (agent.agent_id as string) || (agent.id as string),
      name: (agent.name as string) || `${agent.agent_type as string} Agent`,
      agent_type: agent.agent_type as string,
      status: agent.active ? 'active' : ((agent.status as Agent['status']) || 'idle'),
      parent_id: (agent.parent_id as string) || (agent.agent_type === 'CEO' ? null : 'ceo_agent'),
      subordinates: (agent.subordinates as string[]) || [],
      department: (agent.department as string) || (agent.agent_type as string),
      last_active: (agent.last_active as string) || new Date().toISOString(),
      capabilities: (agent.capabilities as string[]) || [],
    }
  }

  // Agent APIs
  async getAgents(): Promise<Agent[]> {
    const data = await this.fetchWithCache<{ agents?: StringRecord<unknown>[] } | StringRecord<unknown>[]>('/api/agents', {}, 60000) // 1 minute cache
    const agents = Array.isArray(data) ? data : (data.agents || [])
    return agents.map((agent: StringRecord<unknown>) => this.transformAgent(agent))
  }

  async getAgent(agentId: string): Promise<Agent> {
    const data = await this.fetchWithCache<StringRecord<unknown>>(`/api/agents/${agentId}`)
    return this.transformAgent(data)
  }

  async sendCommandToAgent(agentId: string, command: string, parameters?: AgentCommandParams['parameters']): Promise<JSONValue> {
    return this.fetchWithCache(
      `/api/agents/${agentId}/command`,
      {
        method: 'POST',
        body: JSON.stringify({ command, parameters }),
      },
      0
    ) // No cache for commands
  }

  async getAgentHierarchy(): Promise<AgentHierarchy> {
    return this.fetchWithCache<AgentHierarchy>('/api/hierarchy', {}, 60000)
  }

  // Chat API
  async chatWithAgent(agentId: string, message: string): Promise<{ message: string; [key: string]: JSONValue }> {
    const endpoint = '/api/chat'
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: agentId,
        agent_type: agentId, // Support both formats
        message,
      }),
    })

    if (!response.ok) {
      throw new Error('Chat request failed')
    }

    const data = await response.json()

    // Transform response to match frontend expectations
    return {
      ...data,
      message: data.response || data.message, // Backend returns 'response', frontend expects 'message'
    }
  }

  // Alias for compatibility
  async chat(agentId: string, message: string): Promise<{ message: string; [key: string]: JSONValue }> {
    return this.chatWithAgent(agentId, message)
  }

  // Monitoring APIs
  async getCurrentMetrics(): Promise<SystemMetrics> {
    const data = await this.fetchWithCache<{ metrics?: StringRecord<unknown>; timestamp?: string }>('/api/monitoring/metrics/current', {}, 10000)

    // Transform to match frontend expectations
    const metrics = data.metrics || {}
    return {
      system: {
        cpu_percent: (metrics.cpu_percent as number) || 35 + Math.random() * 20,
        memory_percent: (metrics.memory_percent as number) || 55 + Math.random() * 15,
        memory_used_gb: (metrics.memory_used_gb as number) || 8.5,
        memory_total_gb: (metrics.memory_total_gb as number) || 16,
      },
      agents: {
        total_agents: (metrics.agents_online as number) || 5,
        active_agents: (metrics.agents_online as number) || 5,
        agent_types: (metrics.agent_types as Record<string, number>) || {
          CEO: 1,
          CSO: 1,
          CFO: 1,
          CTO: 1,
          COO: 1,
        },
      },
      websocket_connections: (metrics.websocket_connections as number) || 1,
      timestamp: data.timestamp || new Date().toISOString(),
    }
  }

  // Alias for compatibility
  async getMetrics(): Promise<SystemMetrics> {
    return this.getCurrentMetrics()
  }

  async getAlerts(): Promise<Alert[]> {
    const data = await this.fetchWithCache<{ alerts?: StringRecord<unknown>[] }>('/api/monitoring/alerts', {}, 5000)
    const alerts = data.alerts || []

    if (alerts.length === 0) {
      // Return some demo alerts
      return [
        {
          id: 'alert-1',
          severity: 'info',
          type: 'system',
          message: 'System started successfully',
          timestamp: new Date().toISOString(),
        },
      ]
    }

    return alerts.map((alert: StringRecord<unknown>) => ({
      id: (alert.id as string) || `alert-${Date.now()}`,
      severity: (alert.severity as Alert['severity']) || 'info',
      type: (alert.type as string) || 'system',
      message: (alert.message as string) || '',
      timestamp: (alert.timestamp as string) || new Date().toISOString(),
    }))
  }

  // Workflow APIs
  async getWorkflows(): Promise<Workflow[]> {
    const data = await this.fetchWithCache<{ workflows?: (StringRecord<unknown> | string)[] } | (StringRecord<unknown> | string)[]>('/api/workflows', {}, 30000)
    const workflows = Array.isArray(data) ? data : ((data as { workflows?: (StringRecord<unknown> | string)[] }).workflows || [])

    if (Array.isArray(workflows) && workflows.length > 0 && typeof workflows[0] === 'string') {
      // Transform string array to workflow objects
      return workflows.map((workflow: string, index: number) => ({
        id: `workflow-${index}`,
        name: workflow,
        workflow_type: workflow,
        status: 'idle',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assigned_agents: [],
      }))
    }

    return workflows as unknown as Workflow[]
  }

  async simulateWorkflow(type: string): Promise<JSONValue> {
    return this.fetchWithCache(
      '/api/workflows/simulate',
      {
        method: 'POST',
        body: JSON.stringify({ type }),
      },
      0
    )
  }

  async updateWorkflowStatus(workflowId: string, status: string): Promise<JSONValue> {
    return this.fetchWithCache(
      `/api/workflows/${workflowId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
      0
    )
  }

  // Message History
  async getMessageHistory(limit: number = 50): Promise<Message[]> {
    return this.fetchWithCache<Message[]>(`/api/messages/history?limit=${limit}`)
  }

  // WebSocket Methods
  connectWebSocket(clientId: string): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return
    }

    this.wsConnection = new WebSocket(`${this.wsUrl}/${clientId}`)

    this.wsConnection.onopen = () => {
      // WebSocket connected
      this.reconnectAttempts = 0
      this.startHeartbeat()
    }

    this.wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'connection') {
          // WebSocket connection confirmed
        } else if (data.type === 'pong') {
          // Heartbeat response
        } else {
          // Dispatch to registered callbacks
          this.wsCallbacks.forEach((callback) => {
            callback(data)
          })
        }
      } catch (error) {
        // TODO: Replace with proper logging service
      }
    }

    this.wsConnection.onerror = (_error) => {
      // TODO: Replace with proper logging service
    }

    this.wsConnection.onclose = () => {
      // WebSocket disconnected
      this.stopHeartbeat()

      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => {
          // Reconnecting WebSocket
          this.connectWebSocket(clientId)
        }, 2000 * this.reconnectAttempts)
      }
    }
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close()
      this.wsConnection = null
    }
    this.stopHeartbeat()
  }

  onWebSocketMessage(callback: EventHandler<WebSocketPayload>): () => void {
    const id = Math.random().toString(36).substr(2, 9)
    this.wsCallbacks.set(id, callback)

    // Return unsubscribe function
    return () => {
      this.wsCallbacks.delete(id)
    }
  }

  sendWebSocketMessage(message: WebSocketPayload): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message))
    } else {
      // TODO: Replace with proper logging service
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        this.wsConnection.send('ping')
      }
    }, 30000) // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Batch requests for efficiency
  async batchRequest(requests: Array<{ url: string; options?: RequestInit }>) {
    return Promise.all(requests.map((req) => this.fetchWithCache(req.url, req.options)))
  }

  // Prefetch critical data
  async prefetchDashboardData() {
    await Promise.all([
      this.getAgents(),
      this.getWorkflows(),
      this.getCurrentMetrics(),
      this.getAlerts(),
    ])
  }

  // Laboratory APIs
  async getEquipment(): Promise<Equipment[]> {
    return this.fetchWithCache<Equipment[]>('/api/laboratory/equipment', {}, 10000)
  }

  async getEquipmentById(equipmentId: string): Promise<Equipment> {
    return this.fetchWithCache<Equipment>(`/api/laboratory/equipment/${equipmentId}`)
  }

  async controlEquipment(equipmentId: string, action: string, parameters?: EquipmentParams): Promise<JSONValue> {
    return this.fetchWithCache(
      `/api/laboratory/equipment/${equipmentId}/control`,
      {
        method: 'PUT',
        body: JSON.stringify({ action, parameters }),
      },
      0
    ) // No cache for control actions
  }

  async getExperiments(): Promise<Experiment[]> {
    return this.fetchWithCache<Experiment[]>('/api/laboratory/experiments', {}, 10000)
  }

  async createExperiment(experimentData: {
    name: string
    type: string
    researcher: string
    equipment: string[]
    parameters?: ExperimentParams
    notes?: string
  }): Promise<Experiment> {
    return this.fetchWithCache(
      '/api/laboratory/experiments',
      {
        method: 'POST',
        body: JSON.stringify(experimentData),
      },
      0
    )
  }

  async updateExperimentStatus(experimentId: string, status: string): Promise<JSONValue> {
    return this.fetchWithCache(
      `/api/laboratory/experiments/${experimentId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
      0
    )
  }

  async getExperimentLogs(experimentId: string, limit: number = 50): Promise<StringRecord<unknown>[]> {
    return this.fetchWithCache(`/api/laboratory/experiments/${experimentId}/logs?limit=${limit}`)
  }

  async getLaboratoryStatus(): Promise<LaboratoryStatus> {
    return this.fetchWithCache<LaboratoryStatus>('/api/laboratory/status', {}, 5000)
  }

  // Analytics APIs
  async getAnalyticsMetrics(dateRange: string): Promise<{
    kpis: StringRecord<number>;
    trends: StringRecord<{ value: number; direction: string }>;
    performanceData: StringRecord<unknown>;
    costBreakdown: Array<{ value: number; name: string }>;
    productivityData: StringRecord<unknown>;
  }> {
    // For now, return mock data. In production, this would fetch from the backend
    const baseMetrics = {
      kpis: {
        researchEfficiency: 87.5 + Math.random() * 10,
        costPerExperiment: 4250 + Math.random() * 500,
        successRate: 92.3 + Math.random() * 5,
        timeToCompletion: 14.2 + Math.random() * 2,
      },
      trends: {
        researchOutput: { value: 15.3, direction: 'up' },
        operationalCosts: { value: -8.7, direction: 'down' },
        agentUtilization: { value: 23.1, direction: 'up' },
        errorRate: { value: -12.4, direction: 'down' },
      },
      performanceData: this.generateTimeSeriesData(dateRange),
      costBreakdown: [
        { value: 35, name: 'Research & Development' },
        { value: 25, name: 'Operations' },
        { value: 20, name: 'Infrastructure' },
        { value: 15, name: 'Quality Control' },
        { value: 5, name: 'Other' },
      ],
      productivityData: this.generateProductivityData(dateRange),
    }

    return baseMetrics
  }

  private generateTimeSeriesData(dateRange: string) {
    const points = dateRange === 'day' ? 24 : dateRange === 'week' ? 7 : 30
    const labels = this.getTimeLabels(dateRange, points)

    return {
      labels,
      datasets: [
        {
          name: 'Research Output',
          data: Array(points)
            .fill(0)
            .map((_, i) => 80 + i * 1.5 + Math.random() * 10),
        },
        {
          name: 'Agent Efficiency',
          data: Array(points)
            .fill(0)
            .map((_, i) => 75 + i * 2 + Math.random() * 8),
        },
        {
          name: 'Success Rate',
          data: Array(points)
            .fill(0)
            .map((_, i) => 88 + i * 0.5 + Math.random() * 5),
        },
      ],
    }
  }

  private generateProductivityData(dateRange: string) {
    const points = dateRange === 'day' ? 24 : 7
    const labels =
      dateRange === 'day'
        ? Array(24)
            .fill(0)
            .map((_, i) => `${i}:00`)
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return {
      labels,
      experiments: Array(points)
        .fill(0)
        .map(() => Math.floor(10 + Math.random() * 10)),
      successRate: Array(points)
        .fill(0)
        .map(() => 85 + Math.random() * 10),
    }
  }

  private getTimeLabels(dateRange: string, points: number): string[] {
    if (dateRange === 'day') {
      return Array(24)
        .fill(0)
        .map((_, i) => `${i}:00`)
    } else if (dateRange === 'week') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    } else {
      return Array(points)
        .fill(0)
        .map((_, i) => `Day ${i + 1}`)
    }
  }

  async exportAnalyticsReport(
    dateRange: string,
    format: 'pdf' | 'csv' | 'json' = 'pdf'
  ): Promise<Blob> {
    // Simulate export - in production, this would call a backend endpoint
    const data = await this.getAnalyticsMetrics(dateRange)

    if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    } else if (format === 'csv') {
      // Simple CSV generation
      const csv = `Metric,Value,Unit
Research Efficiency,${data.kpis.researchEfficiency},percent
Cost per Experiment,${data.kpis.costPerExperiment},USD
Success Rate,${data.kpis.successRate},percent
Time to Completion,${data.kpis.timeToCompletion},days`
      return new Blob([csv], { type: 'text/csv' })
    } else {
      // For PDF, we'd use a library like jsPDF in production
      // For now, return a mock blob
      return new Blob(['PDF Report'], { type: 'application/pdf' })
    }
  }
}

// Export singleton instance
export const apiClient = new UnifiedApiClient()
export const api = apiClient // Alias for compatibility
export const optimizedApiClient = apiClient // Alias for compatibility
