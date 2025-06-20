'use client'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { FlaskConical, Thermometer, Zap, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

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
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            New Experiment
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
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
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
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
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
    </DashboardLayout>
  )
}