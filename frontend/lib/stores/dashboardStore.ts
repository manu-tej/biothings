import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Types for the dashboard
export interface Agent {
  id: string
  name: string
  type: string
  status: 'active' | 'idle' | 'error' | 'offline'
  lastActivity: Date
  metrics: AgentMetrics
  capabilities: string[]
}

export interface AgentMetrics {
  tasksCompleted: number
  averageResponseTime: number
  successRate: number
  cpuUsage: number
  memoryUsage: number
  uptime: number
}

export interface WorkflowStatus {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'pending'
  progress: number
  startedAt: Date
  estimatedCompletion?: Date
  currentStep?: string
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical'
  services: Record<string, ServiceHealth>
  lastChecked: Date
}

export interface ServiceHealth {
  name: string
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  errorRate: number
}

export interface DashboardState {
  // Data
  agents: Map<string, Agent>
  workflows: Map<string, WorkflowStatus>
  systemHealth: SystemHealth | null
  notifications: Notification[]

  // UI State
  selectedAgentId: string | null
  selectedWorkflowId: string | null
  isLoading: boolean
  error: Error | null

  // Actions
  setAgents: (agents: Agent[]) => void
  updateAgent: (agent: Agent) => void
  removeAgent: (agentId: string) => void
  selectAgent: (agentId: string | null) => void

  setWorkflows: (workflows: WorkflowStatus[]) => void
  updateWorkflow: (workflow: WorkflowStatus) => void
  selectWorkflow: (workflowId: string | null) => void

  setSystemHealth: (health: SystemHealth) => void
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  setLoading: (loading: boolean) => void
  setError: (error: Error | null) => void
  reset: () => void
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

const initialState = {
  agents: new Map<string, Agent>(),
  workflows: new Map<string, WorkflowStatus>(),
  systemHealth: null,
  notifications: [],
  selectedAgentId: null,
  selectedWorkflowId: null,
  isLoading: false,
  error: null,
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Agent actions
        setAgents: (agents) =>
          set((state) => ({
            agents: new Map(agents.map((agent) => [agent.id, agent])),
          })),

        updateAgent: (agent) =>
          set((state) => {
            const newAgents = new Map(state.agents)
            newAgents.set(agent.id, agent)
            return { agents: newAgents }
          }),

        removeAgent: (agentId) =>
          set((state) => {
            const newAgents = new Map(state.agents)
            newAgents.delete(agentId)
            return {
              agents: newAgents,
              selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
            }
          }),

        selectAgent: (agentId) => set({ selectedAgentId: agentId }),

        // Workflow actions
        setWorkflows: (workflows) =>
          set((state) => ({
            workflows: new Map(workflows.map((workflow) => [workflow.id, workflow])),
          })),

        updateWorkflow: (workflow) =>
          set((state) => {
            const newWorkflows = new Map(state.workflows)
            newWorkflows.set(workflow.id, workflow)
            return { workflows: newWorkflows }
          }),

        selectWorkflow: (workflowId) => set({ selectedWorkflowId: workflowId }),

        // System health actions
        setSystemHealth: (health) => set({ systemHealth: health }),

        // Notification actions
        addNotification: (notification) =>
          set((state) => ({
            notifications: [notification, ...state.notifications],
          })),

        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),

        clearNotifications: () => set({ notifications: [] }),

        // General actions
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        reset: () => set(initialState),
      }),
      {
        name: 'dashboard-store',
        partialize: (state) => ({
          // Only persist UI selections, not the actual data
          selectedAgentId: state.selectedAgentId,
          selectedWorkflowId: state.selectedWorkflowId,
        }),
      }
    ),
    {
      name: 'dashboard-store',
    }
  )
)

// Selector hooks for common use cases
export const useSelectedAgent = () => {
  const agents = useDashboardStore((state) => state.agents)
  const selectedId = useDashboardStore((state) => state.selectedAgentId)
  return selectedId ? agents.get(selectedId) : null
}

export const useSelectedWorkflow = () => {
  const workflows = useDashboardStore((state) => state.workflows)
  const selectedId = useDashboardStore((state) => state.selectedWorkflowId)
  return selectedId ? workflows.get(selectedId) : null
}

export const useActiveAgents = () => {
  const agents = useDashboardStore((state) => state.agents)
  return Array.from(agents.values()).filter((agent) => agent.status === 'active')
}

export const useRunningWorkflows = () => {
  const workflows = useDashboardStore((state) => state.workflows)
  return Array.from(workflows.values()).filter((workflow) => workflow.status === 'running')
}

export const useUnreadNotifications = () => {
  const notifications = useDashboardStore((state) => state.notifications)
  return notifications.filter((n) => !n.read)
}
