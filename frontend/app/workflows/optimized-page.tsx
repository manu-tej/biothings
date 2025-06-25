'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity, Play, Pause, CheckCircle, AlertCircle, Clock, Users } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMemo, useCallback, memo } from 'react'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { optimizedApiClient } from '@/lib/api/client'

// Lazy load virtual list
const VirtualList = dynamic(() => import('@/components/VirtualList'), {
  loading: () => <div className="animate-pulse h-96" />,
  ssr: false,
})

const statusIcons: Record<string, React.ReactNode> = {
  running: <Play className="w-4 h-4 text-green-600" />,
  pending: <Clock className="w-4 h-4 text-yellow-600" />,
  completed: <CheckCircle className="w-4 h-4 text-green-600" />,
  paused: <Pause className="w-4 h-4 text-gray-600" />,
  failed: <AlertCircle className="w-4 h-4 text-red-600" />,
}

const statusColors: Record<string, string> = {
  running: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  paused: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
}

// Memoized workflow item component
const WorkflowItem = memo(({ workflow }: { workflow: any }) => {
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{workflow.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Type: {workflow.workflow_type} • ID: {workflow.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${statusColors[workflow.status]}`}
          >
            {statusIcons[workflow.status]}
            <span className="capitalize">{workflow.status}</span>
          </span>
        </div>
      </div>

      {workflow.status === 'running' && (
        <div className="mb-4">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Created</p>
          <p className="text-gray-900 dark:text-white">{formatDate(workflow.created_at)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Updated</p>
          <p className="text-gray-900 dark:text-white">{formatDate(workflow.updated_at)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Assigned Agents</p>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 dark:text-white">
              {workflow.assigned_agents?.length || 0}
            </span>
          </div>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Priority</p>
          <p className="text-gray-900 dark:text-white capitalize">
            {workflow.priority || 'Normal'}
          </p>
        </div>
      </div>
    </div>
  )
})

WorkflowItem.displayName = 'WorkflowItem'

export default function OptimizedWorkflowsPage() {
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => optimizedApiClient.getWorkflows(),
    refetchInterval: 300000, // 5 minutes - reduced frequency
    staleTime: 300000, // Consider data fresh for 5 minutes
  })

  // Memoize stats calculation
  const stats = useMemo(() => {
    if (!workflows) return { total: 0, running: 0, completed: 0, failed: 0 }
    return {
      total: workflows.length,
      running: workflows.filter((w: any) => w.status === 'running').length,
      completed: workflows.filter((w: any) => w.status === 'completed').length,
      failed: workflows.filter((w: any) => w.status === 'failed').length,
    }
  }, [workflows])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const renderWorkflow = useCallback(
    (workflow: any) => <WorkflowItem key={workflow.id} workflow={workflow} />,
    []
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workflows</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor and manage biotech processes and experiments
            </p>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            New Workflow
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Workflows</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Running</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.running}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completed}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
          </div>
        </div>

        {/* Workflows List */}
        <div>
          {workflows && workflows.length > 20 ? (
            <VirtualList
              items={workflows}
              itemHeight={180}
              containerHeight={600}
              renderItem={renderWorkflow}
              className="space-y-6"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {workflows?.map((workflow: any) => (
                <WorkflowItem key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
