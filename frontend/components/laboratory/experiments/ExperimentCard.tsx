'use client'

import { Clock, Users, AlertCircle } from 'lucide-react'
import React from 'react'

import { experimentTypeIcons, statusColors } from '@/lib/laboratory/constants'
import type { Experiment } from '@/lib/laboratory/types'

interface ExperimentCardProps {
  experiment: Experiment
  onStatusUpdate?: (id: string, status: string) => void
  onViewDetails?: (experiment: Experiment) => void
}

export const ExperimentCard = React.memo(
  ({ experiment, onStatusUpdate, onViewDetails }: ExperimentCardProps) => {
    const progress = Math.round(experiment.progress * 100)
    const duration = React.useMemo(() => {
      const start = new Date(experiment.start_date)
      const end = experiment.end_date ? new Date(experiment.end_date) : new Date()
      const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60))

      if (hours < 24) return `${hours}h`
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }, [experiment.start_date, experiment.end_date])

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
              {experimentTypeIcons[experiment.type] || <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{experiment.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[experiment.status]}`}
                >
                  {experiment.status.replace('_', ' ')}
                </span>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {duration}
                </span>
              </div>
            </div>
          </div>

          {onViewDetails && (
            <button
              onClick={() => onViewDetails(experiment)}
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
            >
              View Details
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {experiment.status === 'in_progress' && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Assigned Agents */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4 mr-1" />
            <span>{experiment.assigned_agents.length} agents assigned</span>
          </div>

          {experiment.status === 'in_progress' && onStatusUpdate && (
            <div className="flex space-x-2">
              <button
                onClick={() => onStatusUpdate(experiment.id, 'completed')}
                className="px-3 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                Complete
              </button>
              <button
                onClick={() => onStatusUpdate(experiment.id, 'failed')}
                className="px-3 py-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                Fail
              </button>
            </div>
          )}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.experiment.id === nextProps.experiment.id &&
      prevProps.experiment.status === nextProps.experiment.status &&
      prevProps.experiment.progress === nextProps.experiment.progress
    )
  }
)
