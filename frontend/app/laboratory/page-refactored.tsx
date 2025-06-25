'use client'

import { Plus, Beaker, Wrench, BarChart3, Brain } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
// Hooks
import { EquipmentFilters } from '@/components/laboratory/equipment/EquipmentFilters'
import { EquipmentGrid } from '@/components/laboratory/equipment/EquipmentGrid'
import { ExperimentCard } from '@/components/laboratory/experiments/ExperimentCard'
import { NewExperimentModal } from '@/components/laboratory/experiments/NewExperimentModal'
import {
  useExperiments,
  useEquipment,
  useAnalysisResults,
  useSimulations,
} from '@/lib/laboratory/hooks'
import { StringRecord, JSONValue } from '@/lib/types/common.types'

// Components

// Lazy load heavy components
const DataAnalysisPanel = dynamic(
  () => import('@/components/laboratory/data-analysis/DataAnalysisPanel'),
  {
    loading: () => <div className="h-96 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg" />,
    ssr: false,
  }
)

const SimulationPanel = dynamic(
  () => import('@/components/laboratory/simulation/SimulationPanel'),
  {
    loading: () => <div className="h-96 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg" />,
    ssr: false,
  }
)

export default function LaboratoryPageRefactored() {
  const [activeTab, setActiveTab] = useState<
    'experiments' | 'equipment' | 'analysis' | 'simulation'
  >('experiments')
  const [showNewExperiment, setShowNewExperiment] = useState(false)
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null)

  // Data hooks
  const {
    experiments,
    activeExperiments,
    completedExperiments,
    isLoading: experimentsLoading,
    createExperiment,
    updateExperimentStatus,
  } = useExperiments()

  const {
    filteredEquipment,
    availableEquipment,
    filters,
    updateFilters,
    isLoading: equipmentLoading,
  } = useEquipment()

  const { results: analysisResults } = useAnalysisResults(selectedExperiment || undefined)

  const { simulations, activeSimulations, runSimulation } = useSimulations()

  const handleCreateExperiment = async (data: StringRecord<JSONValue>) => {
    await createExperiment.mutateAsync(data)
    setShowNewExperiment(false)
  }

  const stats = {
    activeExperiments: activeExperiments.length,
    completedToday: completedExperiments.filter((e) => {
      const completed = new Date(e.end_date || '')
      const today = new Date()
      return completed.toDateString() === today.toDateString()
    }).length,
    equipmentInUse: filteredEquipment.filter((e) => e.status === 'in_use').length,
    activeSimulations: activeSimulations.length,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Laboratory</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage experiments, equipment, and analysis
            </p>
          </div>
          <button
            onClick={() => setShowNewExperiment(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Experiment
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Experiments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeExperiments}
                </p>
              </div>
              <Beaker className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completedToday}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Equipment in Use</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.equipmentInUse}
                </p>
              </div>
              <Wrench className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Simulations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeSimulations}
                </p>
              </div>
              <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'experiments', label: 'Experiments', icon: Beaker },
              { id: 'equipment', label: 'Equipment', icon: Wrench },
              { id: 'analysis', label: 'Data Analysis', icon: BarChart3 },
              { id: 'simulation', label: 'Simulations', icon: Brain },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'experiments' | 'equipment' | 'analysis' | 'simulation')}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Experiments Tab */}
          {activeTab === 'experiments' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Experiments
              </h2>

              {experimentsLoading ? (
                <div className="grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"
                    />
                  ))}
                </div>
              ) : activeExperiments.length > 0 ? (
                <div className="grid gap-4">
                  {activeExperiments.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      onStatusUpdate={(id, status) => updateExperimentStatus.mutate({ id, status })}
                      onViewDetails={(exp) => {
                        setSelectedExperiment(exp.id)
                        setActiveTab('analysis')
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Beaker className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No active experiments</p>
                  <button
                    onClick={() => setShowNewExperiment(true)}
                    className="mt-4 text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Start a new experiment
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div>
              <EquipmentFilters filters={filters} onFiltersChange={updateFilters} />
              <EquipmentGrid equipment={filteredEquipment} loading={equipmentLoading} />
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <DataAnalysisPanel
              experiments={experiments}
              selectedExperiment={selectedExperiment}
              onExperimentSelect={setSelectedExperiment}
              analysisResults={analysisResults}
            />
          )}

          {/* Simulation Tab */}
          {activeTab === 'simulation' && (
            <SimulationPanel
              simulations={simulations}
              onRunSimulation={runSimulation.mutate}
              experiments={completedExperiments}
            />
          )}
        </div>
      </div>

      {/* New Experiment Modal */}
      <NewExperimentModal
        isOpen={showNewExperiment}
        onClose={() => setShowNewExperiment(false)}
        onSubmit={handleCreateExperiment}
        availableAgents={['Research Agent 1', 'Research Agent 2', 'Lab Assistant']}
        availableEquipment={availableEquipment.map((eq) => ({ id: eq.id, name: eq.name }))}
      />
    </DashboardLayout>
  )
}
