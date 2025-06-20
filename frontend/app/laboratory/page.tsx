'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { FlaskConical, Thermometer, Zap, CheckCircle, AlertTriangle, Clock, Plus, Play, Pause, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const equipmentData = [
  {
    id: 'pcr-001',
    name: 'PCR Thermocycler #1',
    type: 'PCR',
    status: 'running',
    temperature: 72,
    progress: 85,
    timeRemaining: '15 min'
  },
  {
    id: 'centrifuge-001',
    name: 'High-Speed Centrifuge',
    type: 'Centrifuge',
    status: 'idle',
    speed: 0,
    progress: 0,
    timeRemaining: null
  },
  {
    id: 'incubator-001',
    name: 'CO2 Incubator #1',
    type: 'Incubator',
    status: 'running',
    temperature: 37,
    progress: 100,
    timeRemaining: null
  },
  {
    id: 'microscope-001',
    name: 'Confocal Microscope',
    type: 'Microscope',
    status: 'maintenance',
    progress: 0,
    timeRemaining: null
  }
]

const experiments = [
  {
    id: 'exp-001',
    name: 'Protein Expression Analysis',
    type: 'Molecular Biology',
    status: 'in_progress',
    startDate: '2025-01-20T08:00:00Z',
    estimatedCompletion: '2025-01-20T16:00:00Z',
    researcher: 'CSO Agent',
    equipment: ['pcr-001', 'centrifuge-001']
  },
  {
    id: 'exp-002',
    name: 'Cell Viability Assay',
    type: 'Cell Culture',
    status: 'pending',
    startDate: '2025-01-20T14:00:00Z',
    estimatedCompletion: '2025-01-20T18:00:00Z',
    researcher: 'Research Manager',
    equipment: ['incubator-001', 'microscope-001']
  }
]

const statusColors: Record<string, string> = {
  running: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  idle: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
}

const statusIcons: Record<string, React.ReactNode> = {
  running: <Zap className="w-4 h-4" />,
  idle: <Clock className="w-4 h-4" />,
  maintenance: <AlertTriangle className="w-4 h-4" />,
  error: <AlertTriangle className="w-4 h-4" />,
  in_progress: <Zap className="w-4 h-4" />,
  pending: <Clock className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />
}

export default function LaboratoryPage() {
  const [showNewExperiment, setShowNewExperiment] = useState(false)
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null)
  const [newExperimentData, setNewExperimentData] = useState<{
    name: string;
    type: string;
    researcher: string;
    equipment: string[];
  }>({
    name: '',
    type: 'Molecular Biology',
    researcher: 'CSO Agent',
    equipment: []
  })
  const queryClient = useQueryClient()
  
  // Optimize by only showing modals when needed
  const shouldRenderNewExperimentModal = showNewExperiment
  const shouldRenderDetailsModal = !!selectedExperiment

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
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
              Laboratory
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor equipment, experiments, and laboratory operations
            </p>
          </div>
          <button 
            onClick={() => setShowNewExperiment(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Experiment</span>
          </button>
        </div>

        {/* Lab Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Equipment Online</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">3/4</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <FlaskConical className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Experiments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <Thermometer className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Temp</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">37°C</p>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Equipment Status
          </h2>
          <div className="space-y-4">
            {equipmentData.map((equipment) => (
              <div
                key={equipment.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                    <FlaskConical className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {equipment.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {equipment.type} • ID: {equipment.id}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {equipment.temperature && (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Temperature</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {equipment.temperature}°C
                      </p>
                    </div>
                  )}
                  
                  {equipment.timeRemaining && (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Time Remaining</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {equipment.timeRemaining}
                      </p>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[equipment.status]}`}>
                      {statusIcons[equipment.status]}
                      <span className="capitalize">{equipment.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Experiments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Experiments
          </h2>
          <div className="space-y-4">
            {experiments.map((experiment) => (
              <div
                key={experiment.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedExperiment(experiment)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {experiment.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {experiment.type} • Researcher: {experiment.researcher}
                    </p>
                  </div>
                  <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[experiment.status]}`}>
                    {statusIcons[experiment.status]}
                    <span className="capitalize">{experiment.status.replace('_', ' ')}</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Start Time:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formatTime(experiment.startDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Est. Completion:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formatTime(experiment.estimatedCompletion)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Equipment:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {experiment.equipment.length} devices
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Experiment Modal */}
      {showNewExperiment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                New Experiment
              </h3>
              <button
                onClick={() => setShowNewExperiment(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experiment Name
                </label>
                <input
                  type="text"
                  value={newExperimentData.name}
                  onChange={(e) => setNewExperimentData({...newExperimentData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter experiment name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experiment Type
                </label>
                <select 
                  value={newExperimentData.type}
                  onChange={(e) => setNewExperimentData({...newExperimentData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option>Molecular Biology</option>
                  <option>Cell Culture</option>
                  <option>Protein Analysis</option>
                  <option>DNA Sequencing</option>
                  <option>Drug Discovery</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lead Researcher
                </label>
                <select 
                  value={newExperimentData.researcher}
                  onChange={(e) => setNewExperimentData({...newExperimentData, researcher: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option>CSO Agent</option>
                  <option>Research Manager</option>
                  <option>Lab Tech Worker 1</option>
                  <option>Lab Tech Worker 2</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Required Equipment
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {equipmentData.map((equipment) => (
                    <label key={equipment.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewExperimentData({
                              ...newExperimentData,
                              equipment: [...newExperimentData.equipment, equipment.id]
                            })
                          } else {
                            setNewExperimentData({
                              ...newExperimentData,
                              equipment: newExperimentData.equipment.filter((id: string) => id !== equipment.id)
                            })
                          }
                        }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{equipment.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewExperiment(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault()
                    // TODO: Add experiment creation logic
                    console.log('Creating experiment:', newExperimentData)
                    setShowNewExperiment(false)
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Create Experiment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Experiment Details Modal */}
      {selectedExperiment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedExperiment.name}
              </h3>
              <button
                onClick={() => setSelectedExperiment(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                  <p className="text-gray-900 dark:text-white">{selectedExperiment.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedExperiment.status]}`}>
                    {statusIcons[selectedExperiment.status]}
                    <span className="capitalize">{selectedExperiment.status.replace('_', ' ')}</span>
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Researcher</p>
                  <p className="text-gray-900 dark:text-white">{selectedExperiment.researcher}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Equipment</p>
                  <p className="text-gray-900 dark:text-white">{selectedExperiment.equipment.length} devices assigned</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Start Time</span>
                    <span className="text-sm text-gray-900 dark:text-white">{formatTime(selectedExperiment.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Estimated Completion</span>
                    <span className="text-sm text-gray-900 dark:text-white">{formatTime(selectedExperiment.estimatedCompletion)}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Actions</h4>
                <div className="flex gap-2">
                  {selectedExperiment.status === 'pending' && (
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                      <Play className="w-4 h-4" />
                      <span>Start Experiment</span>
                    </button>
                  )}
                  {selectedExperiment.status === 'in_progress' && (
                    <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2">
                      <Pause className="w-4 h-4" />
                      <span>Pause Experiment</span>
                    </button>
                  )}
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    View Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}