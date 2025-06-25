'use client'

import { Brain, Play, Pause, RotateCcw } from 'lucide-react'
import React, { useState } from 'react'

import type { SimulationRun, Experiment } from '@/lib/laboratory/types'

interface SimulationPanelProps {
  simulations: SimulationRun[]
  onRunSimulation: (params: any) => void
  experiments: Experiment[]
}

const SimulationCard = React.memo(({ simulation }: { simulation: SimulationRun }) => {
  const progress = Math.round(simulation.progress * 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">{simulation.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Started {new Date(simulation.start_time).toLocaleTimeString()}
          </p>
        </div>
        <span
          className={`
          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
          ${
            simulation.status === 'running'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
              : simulation.status === 'completed'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }
        `}
        >
          {simulation.status}
        </span>
      </div>

      {simulation.status === 'running' && (
        <div className="mb-3">
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

      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Parameters: {Object.keys(simulation.parameters).length}
        </span>
        {simulation.status === 'running' ? (
          <button className="text-yellow-600 dark:text-yellow-400 hover:underline flex items-center">
            <Pause className="w-3 h-3 mr-1" />
            Pause
          </button>
        ) : simulation.status === 'completed' ? (
          <button className="text-primary-600 dark:text-primary-400 hover:underline">
            View Results
          </button>
        ) : (
          <button className="text-gray-600 dark:text-gray-400 hover:underline flex items-center">
            <RotateCcw className="w-3 h-3 mr-1" />
            Retry
          </button>
        )}
      </div>
    </div>
  )
})

export default function SimulationPanel({
  simulations,
  onRunSimulation,
  experiments,
}: SimulationPanelProps) {
  const [showNewSimulation, setShowNewSimulation] = useState(false)
  const activeSimulations = simulations.filter((s) => s.status === 'running')
  const completedSimulations = simulations.filter((s) => s.status === 'completed')

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const params = {
      name: formData.get('name'),
      experiment_id: formData.get('experiment_id'),
      iterations: formData.get('iterations'),
      parameters: {
        temperature: formData.get('temperature'),
        pressure: formData.get('pressure'),
        duration: formData.get('duration'),
      },
    }
    onRunSimulation(params)
    setShowNewSimulation(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 dark:text-white">Simulations</h3>
        <button
          onClick={() => setShowNewSimulation(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
        >
          <Play className="w-4 h-4 mr-2" />
          Run Simulation
        </button>
      </div>

      {/* Active Simulations */}
      {activeSimulations.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Active Simulations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSimulations.map((sim) => (
              <SimulationCard key={sim.id} simulation={sim} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Simulations */}
      <div>
        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Simulations</h4>
        {completedSimulations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedSimulations.slice(0, 4).map((sim) => (
              <SimulationCard key={sim.id} simulation={sim} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No simulations run yet</p>
          </div>
        )}
      </div>

      {/* New Simulation Form */}
      {showNewSimulation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleRunSimulation}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Configure Simulation
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Simulation Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Based on Experiment
                </label>
                <select
                  name="experiment_id"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">None</option>
                  {experiments.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    name="temperature"
                    defaultValue="25"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pressure (atm)
                  </label>
                  <input
                    type="number"
                    name="pressure"
                    defaultValue="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (h)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    defaultValue="24"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Iterations
                </label>
                <input
                  type="number"
                  name="iterations"
                  defaultValue="1000"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNewSimulation(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Run Simulation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
