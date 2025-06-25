'use client'

import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  DollarSign,
  Download,
  RefreshCw,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { apiClient } from '@/lib/api/client'

// Lazy load chart components
const PerformanceChart = dynamic(
  () =>
    import('@/components/charts/AnalyticsCharts').then((mod) => ({
      default: mod.PerformanceChart,
    })),
  {
    loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />,
    ssr: false,
  }
)

const CostBreakdownChart = dynamic(
  () =>
    import('@/components/charts/AnalyticsCharts').then((mod) => ({
      default: mod.CostBreakdownChart,
    })),
  {
    loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />,
    ssr: false,
  }
)

const ProductivityChart = dynamic(
  () =>
    import('@/components/charts/AnalyticsCharts').then((mod) => ({
      default: mod.ProductivityChart,
    })),
  {
    loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />,
    ssr: false,
  }
)

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('week')
  const [isExporting, setIsExporting] = useState(false)

  const {
    data: metrics,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['analytics-metrics', dateRange],
    queryFn: () => apiClient.getAnalyticsMetrics(dateRange),
    refetchInterval: 300000, // 5 minutes
  })

  const generateAIInsights = async () => {
    if (!metrics) return 'No data available for insights'

    // In a real implementation, this would call an AI service
    const insights = []

    // Analyze KPIs
    if (metrics.kpis.researchEfficiency > 90) {
      insights.push(
        '🎯 Research efficiency is excellent at ' + metrics.kpis.researchEfficiency.toFixed(1) + '%'
      )
    } else if (metrics.kpis.researchEfficiency < 80) {
      insights.push(
        '⚠️ Research efficiency needs improvement at ' +
          metrics.kpis.researchEfficiency.toFixed(1) +
          '%'
      )
    }

    if (metrics.kpis.costPerExperiment > 5000) {
      insights.push(
        '💰 Consider cost optimization - experiments are averaging $' +
          metrics.kpis.costPerExperiment.toFixed(0)
      )
    }

    // Analyze trends
    const positiveMetrics = Object.entries(metrics.trends)
      .filter(([_, trend]: [string, any]) => trend.direction === 'up' && trend.value > 10)
      .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim())

    if (positiveMetrics.length > 0) {
      insights.push('📈 Strong growth in: ' + positiveMetrics.join(', '))
    }

    // Add recommendations
    insights.push('\n📊 Recommendations:')
    insights.push('• Continue monitoring agent utilization patterns')
    insights.push('• Review equipment maintenance schedules')
    insights.push('• Consider scaling successful experiments')

    return insights.join('\n')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Insights and performance metrics for your biotech operations
            </p>
          </div>
          <div className="flex space-x-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                setIsExporting(true)
                try {
                  const blob = await apiClient.exportAnalyticsReport(dateRange, 'pdf')
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                } catch (error) {
                  console.error('Export failed:', error)
                  alert('Failed to export report')
                } finally {
                  setIsExporting(false)
                }
              }}
              disabled={isExporting}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
            </button>
            <button
              onClick={async () => {
                const insights = await generateAIInsights()
                alert(insights)
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Generate Insights
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Research Efficiency</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '...' : `${metrics?.kpis?.researchEfficiency.toFixed(1)}%`}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cost per Experiment</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '...' : formatCurrency(metrics?.kpis?.costPerExperiment || 0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '...' : `${metrics?.kpis?.successRate.toFixed(1)}%`}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time to Completion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '...' : `${metrics?.kpis?.timeToCompletion.toFixed(1)} days`}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <Activity className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Trend Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics?.trends &&
            Object.entries(metrics.trends).map(([key, trend]: [string, any]) => (
              <div
                key={key}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-lg font-semibold ${
                          trend.direction === 'up'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {trend.direction === 'up' ? '+' : ''}
                        {trend.value}%
                      </span>
                      {trend.direction === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance Trends
            </h2>
            {metrics?.performanceData && <PerformanceChart data={metrics.performanceData} />}
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Cost Breakdown
            </h2>
            {metrics?.costBreakdown && <CostBreakdownChart data={metrics.costBreakdown} />}
          </div>
        </div>

        {/* Productivity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Productivity
          </h2>
          {metrics?.productivityData && <ProductivityChart data={metrics.productivityData} />}
        </div>
      </div>
    </DashboardLayout>
  )
}
