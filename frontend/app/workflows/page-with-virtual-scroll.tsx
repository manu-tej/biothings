'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, Play, Pause, CheckCircle, AlertCircle, Clock, Users, StopCircle, X } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo, memo } from 'react'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { VirtualList } from '@/components/VirtualList'
import NewWorkflowModal from '@/components/workflows/NewWorkflowModal'
import QuickActionModal from '@/components/workflows/QuickActionModal'
import { apiClient } from '@/lib/api/client'

const statusIcons: Record<string, React.ReactNode> = {
  running: <Play className="w-4 h-4 text-green-600" />,
  pending: <Clock className="w-4 h-4 text-yellow-600" />,
  completed: <CheckCircle className="w-4 h-4 text-green-600" />,
  paused: <Pause className="w-4 h-4 text-gray-600" />,
  failed: <AlertCircle className="w-4 h-4 text-red-600" />
}

const statusColors: Record<string, string> = {
  running: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  paused: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
}

interface WorkflowCardProps {
  workflow: any
  onStatusUpdate: (workflowId: string, status: string) => void
  onViewDetails: (workflow: any) => void
}

// Memoized workflow card component
const WorkflowCard = memo(({ workflow, onStatusUpdate, onViewDetails }: WorkflowCardProps) => {
  const formatDate = useMemo(() => {
    return new Date(workflow.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [workflow.created_at])

  const handleStatusUpdate = useCallback((status: string) => {
    onStatusUpdate(workflow.id, status)
  }, [workflow.id, onStatusUpdate])

  const handleViewDetails = useCallback(() => {
    onViewDetails(workflow)
  }, [workflow, onViewDetails])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
            <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {workflow.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {workflow.workflow_type} • Created {formatDate}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[workflow.status]}`}>
            {statusIcons[workflow.status]}
            <span className="capitalize">{workflow.status}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(workflow.progress * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${workflow.progress * 100}%` }}
          />
        </div>
      </div>

      {/* Workflow Stages */}
      {workflow.stages && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stages</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {workflow.stages.map((stage: any, index: number) => (
              <div
                key={index}
                className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                {statusIcons[stage.status] || <Clock className="w-4 h-4 text-gray-400" />}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {stage.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Agents */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Assigned to: {workflow.assigned_agents?.join(', ') || 'Unassigned'}
          </span>
        </div>
        <div className="flex space-x-2">
          {workflow.status === 'running' && (
            <button 
              onClick={() => handleStatusUpdate('paused')}
              className="px-3 py-1 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors flex items-center space-x-1"
            >
              <Pause className="w-3 h-3" />
              <span>Pause</span>
            </button>
          )}
          {workflow.status === 'paused' && (
            <button 
              onClick={() => handleStatusUpdate('running')}
              className="px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors flex items-center space-x-1"
            >
              <Play className="w-3 h-3" />
              <span>Resume</span>
            </button>
          )}
          {(workflow.status === 'running' || workflow.status === 'paused') && (
            <button 
              onClick={() => handleStatusUpdate('cancelled')}
              className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center space-x-1"
            >
              <StopCircle className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          )}
          <button 
            onClick={handleViewDetails}
            className="px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return prevProps.workflow.id === nextProps.workflow.id &&
         prevProps.workflow.status === nextProps.workflow.status &&
         prevProps.workflow.progress === nextProps.workflow.progress &&
         prevProps.workflow.updated_at === nextProps.workflow.updated_at
})

// Memoized Quick Action Button
const QuickActionButton = memo(({ type, title, description, onClick }: {
  type: string
  title: string
  description: string
  onClick: () => void
}) => (
  <button 
    onClick={onClick}
    className="p-4 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
  >
    <div className="text-primary-600 dark:text-primary-400 mb-2">
      <Activity className="w-6 h-6" />
    </div>
    <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
  </button>
))

export default function WorkflowsPage() {
  const [showNewWorkflow, setShowNewWorkflow] = useState(false)
  const [quickAction, setQuickAction] = useState<'drug_discovery' | 'production_scaleup' | 'quality_control' | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiClient.getWorkflows(),
    refetchInterval: 300000 // 5 minutes - rely on WebSocket for real-time updates
  })

  // WebSocket connection for real-time updates
  useEffect(() => {
    const clientId = `workflows-${Date.now()}`
    apiClient.connectWebSocket(clientId)

    const unsubscribe = apiClient.onWebSocketMessage((data) => {
      if (data.type === 'workflow_update') {
        queryClient.invalidateQueries({ queryKey: ['workflows'] })
      }
    })

    return () => {
      unsubscribe()
      apiClient.disconnectWebSocket()
    }
  }, [queryClient])

  const updateWorkflowStatus = useMutation({
    mutationFn: async ({ workflowId, status }: { workflowId: string; status: string }) => {
      const response = await fetch(`${apiClient['apiBaseUrl']}/api/workflows/${workflowId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!response.ok) throw new Error('Failed to update workflow status')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    }
  })

  const handleStatusUpdate = useCallback((workflowId: string, status: string) => {
    updateWorkflowStatus.mutate({ workflowId, status })
  }, [updateWorkflowStatus])

  const handleViewDetails = useCallback((workflow: any) => {
    setSelectedWorkflow(workflow)
  }, [])

  const handleQuickAction = useCallback((action: 'drug_discovery' | 'production_scaleup' | 'quality_control') => {
    setQuickAction(action)
  }, [])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />
      </DashboardLayout>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Workflows
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor and manage biotech processes and experiments
            </p>
          </div>
          <button 
            onClick={() => setShowNewWorkflow(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            New Workflow
          </button>
        </div>

        {/* Virtual Scrolling for Workflow Cards */}
        {workflows && workflows.length > 0 ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <VirtualList
              items={workflows}
              height={600}
              itemHeight={250} // Approximate height of each workflow card
              overscan={2}
              renderItem={(workflow) => (
                <div className="p-4">
                  <WorkflowCard
                    workflow={workflow}
                    onStatusUpdate={handleStatusUpdate}
                    onViewDetails={handleViewDetails}
                  />
                </div>
              )}
            />
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No workflows yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first workflow to start automating biotech processes
            </p>
            <button 
              onClick={() => setShowNewWorkflow(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Workflow
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionButton
              type="drug_discovery"
              title="Drug Discovery"
              description="Start a new drug discovery pipeline"
              onClick={() => handleQuickAction('drug_discovery')}
            />
            <QuickActionButton
              type="production_scaleup"
              title="Production Scale-up"
              description="Scale manufacturing processes"
              onClick={() => handleQuickAction('production_scaleup')}
            />
            <QuickActionButton
              type="quality_control"
              title="Quality Control"
              description="Run QC protocols and testing"
              onClick={() => handleQuickAction('quality_control')}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewWorkflowModal 
        isOpen={showNewWorkflow} 
        onClose={() => setShowNewWorkflow(false)} 
      />
      
      <QuickActionModal
        isOpen={!!quickAction}
        onClose={() => setQuickAction(null)}
        actionType={quickAction}
      />

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedWorkflow.name}
              </h2>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedWorkflow.workflow_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedWorkflow.status]}`}>
                    {statusIcons[selectedWorkflow.status]}
                    <span className="capitalize">{selectedWorkflow.status}</span>
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Progress</p>
                  <p className="text-gray-900 dark:text-white">{Math.round(selectedWorkflow.progress * 100)}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(selectedWorkflow.created_at)}</p>
                </div>
              </div>

              {selectedWorkflow.stages && selectedWorkflow.stages.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Workflow Stages</h3>
                  <div className="space-y-2">
                    {selectedWorkflow.stages.map((stage: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {statusIcons[stage.status] || <Clock className="w-4 h-4 text-gray-400" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {stage.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {stage.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Assigned Agents</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedWorkflow.assigned_agents?.map((agent: string) => (
                    <span
                      key={agent}
                      className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                    >
                      {agent}
                    </span>
                  )) || (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">No agents assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}