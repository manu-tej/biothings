'use client'

import React, { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronRight,
  Beaker,
  Package,
  Shield,
  BarChart
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useWorkflowWebSocket } from '@/lib/hooks/useWebSocket'

interface Workflow {
  id: string
  name: string
  workflow_type: string
  status: string
  progress: number
  created_at: string
  updated_at: string
  assigned_agents: string[]
}

const workflowIcons: Record<string, React.ReactNode> = {
  experiment: <Beaker className="w-4 h-4" />,
  manufacturing: <Package className="w-4 h-4" />,
  quality_control: <Shield className="w-4 h-4" />,
  data_analysis: <BarChart className="w-4 h-4" />
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-gray-500" />,
  running: <Play className="w-4 h-4 text-blue-500" />,
  completed: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  cancelled: <Pause className="w-4 h-4 text-gray-500" />
}

interface WorkflowItemProps {
  workflow: Workflow
}

const WorkflowItem = React.memo(({ workflow }: WorkflowItemProps) => {
  const duration = React.useMemo(() => {
    const created = new Date(workflow.created_at)
    const updated = new Date(workflow.updated_at)
    const diffMinutes = Math.floor((updated.getTime() - created.getTime()) / 60000)
    
    if (diffMinutes < 60) return `${diffMinutes}m`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ${diffMinutes % 60}m`
    return `${Math.floor(diffHours / 24)}d`
  }, [workflow.created_at, workflow.updated_at])

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
            {workflowIcons[workflow.workflow_type] || <Beaker className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {workflow.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {workflow.workflow_type.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {statusIcons[workflow.status]}
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Progress Bar */}
      {workflow.status === 'running' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {Math.round(workflow.progress * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300 relative overflow-hidden"
              style={{ width: `${workflow.progress * 100}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Duration: {duration}
        </span>
        <span className="text-gray-600 dark:text-gray-300">
          {workflow.assigned_agents.length} agents
        </span>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if important workflow data changes
  return prevProps.workflow.id === nextProps.workflow.id &&
         prevProps.workflow.status === nextProps.workflow.status &&
         prevProps.workflow.progress === nextProps.workflow.progress &&
         prevProps.workflow.updated_at === nextProps.workflow.updated_at &&
         prevProps.workflow.assigned_agents.length === nextProps.workflow.assigned_agents.length
})

export default function WorkflowStatus() {
  const queryClient = useQueryClient()
  
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiClient.getWorkflows(),
    refetchInterval: 300000 // 5 minutes - reduced frequency since we have WebSocket
  })

  // WebSocket for real-time workflow updates with dedicated hook
  const { isConnected, connectionState } = useWorkflowWebSocket((update) => {
    if (update.type === 'workflow_update' && update.workflow_id) {
      // Update specific workflow
      queryClient.setQueryData(['workflows'], (oldData: Workflow[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map(workflow => 
          workflow.id === update.workflow_id 
            ? { ...workflow, ...update.data }
            : workflow
        )
      })
    } else if (update.type === 'workflow_progress' && update.workflow_id) {
      // Update workflow progress
      queryClient.setQueryData(['workflows'], (oldData: Workflow[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map(workflow => 
          workflow.id === update.workflow_id 
            ? { ...workflow, progress: update.data.progress, status: update.data.status }
            : workflow
        )
      })
    } else if (update.type === 'workflows_update') {
      // Full workflows update
      queryClient.setQueryData(['workflows'], update.data)
    }
  })

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />
  }

  const activeWorkflows = workflows?.filter((w: Workflow) => w.status === 'running') || []
  const completedToday = workflows?.filter((w: Workflow) => {
    if (w.status !== 'completed') return false
    const completedDate = new Date(w.updated_at)
    const today = new Date()
    return completedDate.toDateString() === today.toDateString()
  }).length || 0

  const stats = {
    running: workflows?.filter((w: Workflow) => w.status === 'running').length || 0,
    completed: workflows?.filter((w: Workflow) => w.status === 'completed').length || 0,
    failed: workflows?.filter((w: Workflow) => w.status === 'failed').length || 0,
    pending: workflows?.filter((w: Workflow) => w.status === 'pending').length || 0
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Workflows
          </h2>
          {/* Connection status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' :
            connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            connectionState === 'error' ? 'bg-red-500' :
            'bg-gray-400'
          }`} title={`WebSocket: ${connectionState}`} />
        </div>
        <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
          View All
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.running}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Running</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completedToday}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.pending}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.failed}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
        </div>
      </div>

      {/* Active Workflows List */}
      <div className="space-y-3">
        {activeWorkflows.length > 0 ? (
          activeWorkflows.slice(0, 5).map((workflow: Workflow) => (
            <WorkflowItem key={workflow.id} workflow={workflow} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active workflows</p>
          </div>
        )}
      </div>

      {activeWorkflows.length > 5 && (
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            +{activeWorkflows.length - 5} more workflows running
          </span>
        </div>
      )}
    </div>
  )
}