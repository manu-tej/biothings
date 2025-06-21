'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { experimentTypes } from '@/lib/laboratory/constants'
import type { ExperimentFormData } from '@/lib/laboratory/types'

interface NewExperimentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ExperimentFormData) => void
  availableAgents?: string[]
  availableEquipment?: Array<{ id: string; name: string }>
}

export function NewExperimentModal({
  isOpen,
  onClose,
  onSubmit,
  availableAgents = [],
  availableEquipment = []
}: NewExperimentModalProps) {
  const [formData, setFormData] = useState<ExperimentFormData>({
    name: '',
    type: 'drug_discovery',
    description: '',
    parameters: {},
    agents: [],
    equipment: []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    handleClose()
  }

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'drug_discovery',
      description: '',
      parameters: {},
      agents: [],
      equipment: []
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            New Experiment
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Experiment Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Experiment Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Experiment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              {experimentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Assign Agents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign Agents
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
              {availableAgents.map(agent => (
                <label key={agent} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.agents.includes(agent)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, agents: [...formData.agents, agent] })
                      } else {
                        setFormData({ ...formData, agents: formData.agents.filter(a => a !== agent) })
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{agent}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Select Equipment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Equipment
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
              {availableEquipment.map(eq => (
                <label key={eq.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.equipment.includes(eq.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, equipment: [...formData.equipment, eq.id] })
                      } else {
                        setFormData({ ...formData, equipment: formData.equipment.filter(id => id !== eq.id) })
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{eq.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Experiment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}