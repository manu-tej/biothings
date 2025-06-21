'use client'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { useDashboardData } from '@/lib/api/batch-hooks'
import { 
  Users, 
  Activity, 
  AlertCircle, 
  TrendingUp,
  Beaker,
  Brain
} from 'lucide-react'

// Import optimized components
import AgentOverviewOptimized from '@/components/dashboard/AgentOverview-Optimized'
import WorkflowStatus from '@/components/dashboard/WorkflowStatus'
import RealtimeAlerts from '@/components/dashboard/RealtimeAlerts'
import SystemMetrics from '@/components/dashboard/SystemMetrics'

/**
 * Optimized Dashboard using batch API
 * Fetches all data in a single batched request
 */
export default function DashboardOptimized() {
  // Fetch all dashboard data in one batched request
  const { data, isLoading, error } = useDashboardData()

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Failed to load dashboard data
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 text-primary-600 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Loading skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Calculate stats from batched data
  const stats = {
    activeAgents: Array.isArray(data.agents) ? data.agents.filter((a: any) => a.status === 'active').length : 0,
    runningWorkflows: Array.isArray(data.workflows) ? data.workflows.filter((w: any) => w.status === 'running').length : 0,
    activeExperiments: Array.isArray(data.experiments) ? data.experiments.filter((e: any) => e.status === 'in_progress').length : 0,
    criticalAlerts: Array.isArray(data.alerts) ? data.alerts.filter((a: any) => a.severity === 'critical').length : 0
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time overview of your biotech operations
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Agents</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeAgents}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  of {Array.isArray(data.agents) ? data.agents.length : 0} total
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Running Workflows</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.runningWorkflows}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {Array.isArray(data.workflows) ? data.workflows.length : 0} total today
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Experiments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeExperiments}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  across all labs
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <Beaker className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Critical Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.criticalAlerts}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  requires attention
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Trend Metrics */}
        {data.metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(data.metrics).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {value.current}
                    </p>
                  </div>
                  <div className={`flex items-center ${value.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm ml-1">{Math.abs(value.trend)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AgentOverviewOptimized />
          <WorkflowStatus />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SystemMetrics />
          <RealtimeAlerts />
        </div>
      </div>
    </DashboardLayout>
  )
}