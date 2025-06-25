'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useState } from 'react'

import { apiClient } from '@/lib/api/client'

interface NewWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
}

const workflowTypes = [
  { value: 'experiment', label: 'Experiment', description: 'Scientific experiments and protocols' },
  { value: 'manufacturing', label: 'Manufacturing', description: 'Production and manufacturing processes' },
  { value: 'quality_control', label: 'Quality Control', description: 'QC testing and validation' },
  { value: 'data_analysis', label: 'Data Analysis', description: 'Data processing and analysis' }
]

const availableAgents = [
  { id: 'cso_agent', name: 'CSO Agent', type: 'Research' },
  { id: 'cto_agent', name: 'CTO Agent', type: 'Technology' },
  { id: 'research_manager', name: 'Research Manager', type: 'Management' },
  { id: 'lab_tech_worker_1', name: 'Lab Tech Worker 1', type: 'Operations' },
  { id: 'lab_tech_worker_2', name: 'Lab Tech Worker 2', type: 'Operations' },
  { id: 'quality_control_1', name: 'Quality Control 1', type: 'QC' }
]

export default function NewWorkflowModal({ isOpen, onClose }: NewWorkflowModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    workflow_type: 'experiment',
    description: '',
    assigned_agents: [] as string[]
  })

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`${apiClient['apiBaseUrl']}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          parameters: {} // Add default parameters
        })
      })
      if (!response.ok) throw new Error('Failed to create workflow')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      onClose()
      setFormData({
        name: '',
        workflow_type: 'experiment',
        description: '',
        assigned_agents: []
      })
    },
    onError: (error) => {
      console.error('Failed to create workflow:', error)
      alert('Failed to create workflow. Please try again.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.description) {
      alert('Please fill in all required fields')
      return
    }
    createWorkflowMutation.mutate(formData)
  }

  const toggleAgent = (agentId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_agents: prev.assigned_agents.includes(agentId)
        ? prev.assigned_agents.filter(id => id !== agentId)
        : [...prev.assigned_agents, agentId]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Create New Workflow
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workflow Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter workflow name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workflow Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workflowTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                    formData.workflow_type === type.value
                      ? 'border-primary-600 ring-2 ring-primary-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="workflow_type"
                    value={type.value}
                    checked={formData.workflow_type === type.value}
                    onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
                    className="sr-only"
                  />
                  <div className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </span>
                    <span className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {type.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Describe the workflow objectives and requirements"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign Agents
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
              {availableAgents.map((agent) => (
                <label
                  key={agent.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.assigned_agents.includes(agent.id)}
                    onChange={() => toggleAgent(agent.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {agent.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({agent.type})
                    </span>
                  </div>
                </label>
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
              {createWorkflowMutation.isPending ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}