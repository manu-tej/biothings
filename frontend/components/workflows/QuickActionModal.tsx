'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Activity } from 'lucide-react'
import { useState } from 'react'

import { apiClient } from '@/lib/api/client'
import { StringRecord, JSONValue } from '@/lib/types/common.types'

interface QuickActionModalProps {
  isOpen: boolean
  onClose: () => void
  actionType: 'drug_discovery' | 'production_scaleup' | 'quality_control' | null
}

const actionConfigs = {
  drug_discovery: {
    title: 'Drug Discovery Pipeline',
    description: 'Set up a new drug discovery workflow with automated screening and analysis',
    workflow_type: 'experiment',
    defaultParams: {
      compound_library_size: 10000,
      screening_method: 'high_throughput',
      target_protein: '',
      assay_type: 'binding_affinity',
    },
    agents: ['cso_agent', 'research_manager', 'lab_tech_worker_1'],
  },
  production_scaleup: {
    title: 'Production Scale-up',
    description: 'Configure manufacturing process for production scale',
    workflow_type: 'manufacturing',
    defaultParams: {
      batch_size: '100L',
      target_yield: 85,
      production_line: 'Line_A',
      quality_checkpoints: 5,
    },
    agents: ['coo_agent', 'quality_control_1'],
  },
  quality_control: {
    title: 'Quality Control Protocol',
    description: 'Run comprehensive QC testing and validation',
    workflow_type: 'quality_control',
    defaultParams: {
      test_battery: 'full',
      sample_size: 50,
      acceptance_criteria: 'USP',
      documentation_level: 'GMP',
    },
    agents: ['quality_control_1', 'lab_tech_worker_2'],
  },
}

export default function QuickActionModal({ isOpen, onClose, actionType }: QuickActionModalProps) {
  const queryClient = useQueryClient()
  const config = actionType ? actionConfigs[actionType] : null

  const [parameters, setParameters] = useState(config?.defaultParams || {})
  const [workflowName, setWorkflowName] = useState('')

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: StringRecord<JSONValue>) => {
      const response = await fetch(`${apiClient['apiBaseUrl']}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create workflow')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      onClose()
      setWorkflowName('')
      if (config) {
        setParameters(config.defaultParams)
      }
    },
    onError: (error) => {
      console.error('Failed to create workflow:', error)
      alert('Failed to create workflow. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!config || !workflowName) return

    createWorkflowMutation.mutate({
      name: workflowName,
      workflow_type: config.workflow_type,
      description: config.description,
      parameters,
      assigned_agents: config.agents,
    })
  }

  const updateParameter = (key: string, value: JSONValue) => {
    setParameters((prev) => ({ ...prev, [key]: value }))
  }

  if (!isOpen || !config) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{config.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">{config.description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workflow Name *
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder={`Enter ${config.title.toLowerCase()} name`}
              required
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Parameters</h3>

            {Object.entries(parameters).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {key
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </label>
                {typeof value === 'number' ? (
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => updateParameter(key, Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateParameter(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Assigned Agents
            </h3>
            <div className="flex flex-wrap gap-2">
              {config.agents.map((agent) => (
                <span
                  key={agent}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {agent.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createWorkflowMutation.isPending}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createWorkflowMutation.isPending ? 'Creating...' : 'Start Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
