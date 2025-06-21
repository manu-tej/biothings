'use client'

import React from 'react'
import { BarChart3, TrendingUp, FileText } from 'lucide-react'
import type { Experiment, AnalysisResult } from '@/lib/laboratory/types'

interface DataAnalysisPanelProps {
  experiments: Experiment[]
  selectedExperiment: string | null
  onExperimentSelect: (id: string | null) => void
  analysisResults: AnalysisResult[]
}

export default function DataAnalysisPanel({
  experiments,
  selectedExperiment,
  onExperimentSelect,
  analysisResults
}: DataAnalysisPanelProps) {
  const completedExperiments = experiments.filter(e => e.status === 'completed')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Experiment Selector */}
      <div className="lg:col-span-1">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Select Experiment
        </h3>
        <div className="space-y-2">
          {completedExperiments.map(exp => (
            <button
              key={exp.id}
              onClick={() => onExperimentSelect(exp.id)}
              className={`
                w-full text-left p-3 rounded-lg border transition-colors
                ${selectedExperiment === exp.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {exp.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Completed {new Date(exp.end_date!).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Results */}
      <div className="lg:col-span-2">
        {selectedExperiment ? (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Analysis Results
            </h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">87%</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Data Points</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">1,234</p>
                  </div>
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reports</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">5</p>
                  </div>
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                Recent Analysis
              </h4>
              <div className="space-y-3">
                {analysisResults.slice(0, 5).map(result => (
                  <div key={result.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.type}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {result.confidence && (
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {Math.round(result.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              Select an experiment to view analysis results
            </p>
          </div>
        )}
      </div>
    </div>
  )
}