'use client'

import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Activity, Play, Pause, CheckCircle, AlertCircle, Clock, Users } from 'lucide-react'

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

export default function WorkflowsPage() {
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/workflows')
      return response.json()
    },
    refetchInterval: 5000
  })

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
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            New Workflow
          </button>
        </div>

        {/* Workflow Cards */}
        <div className="space-y-4">
          {workflows?.map((workflow: any) => (
            <div
              key={workflow.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
            >
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
                      {workflow.workflow_type} • Created {formatDate(workflow.created_at)}
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
                  <button className="px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors">
                    View Details
                  </button>
                  <button className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {workflows?.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No workflows yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first workflow to start automating biotech processes
            </p>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
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
            <button className="p-4 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
              <div className="text-primary-600 dark:text-primary-400 mb-2">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">Drug Discovery</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Start a new drug discovery pipeline</p>
            </button>
            <button className="p-4 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
              <div className="text-primary-600 dark:text-primary-400 mb-2">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">Production Scale-up</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Scale manufacturing processes</p>
            </button>
            <button className="p-4 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
              <div className="text-primary-600 dark:text-primary-400 mb-2">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">Quality Control</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Run QC protocols and testing</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}