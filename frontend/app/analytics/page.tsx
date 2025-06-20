'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as echarts from 'echarts'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity, DollarSign } from 'lucide-react'

export default function AnalyticsPage() {
  const performanceChartRef = useRef<HTMLDivElement>(null)
  const costChartRef = useRef<HTMLDivElement>(null)
  const productivityChartRef = useRef<HTMLDivElement>(null)

  const { data: metrics } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: async () => {
      // Mock analytics data
      return {
        kpis: {
          researchEfficiency: 87.5,
          costPerExperiment: 4250,
          successRate: 92.3,
          timeToCompletion: 14.2
        },
        trends: {
          researchOutput: { value: 15.3, direction: 'up' },
          operationalCosts: { value: -8.7, direction: 'down' },
          agentUtilization: { value: 23.1, direction: 'up' },
          errorRate: { value: -12.4, direction: 'down' }
        }
      }
    },
    refetchInterval: 30000
  })

  useEffect(() => {
    if (!performanceChartRef.current) return
    
    const chart = echarts.init(performanceChartRef.current, 'dark')
    
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['Research Output', 'Agent Efficiency', 'Success Rate'],
        textStyle: { color: '#9CA3AF' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        axisLabel: { color: '#9CA3AF' },
        axisLine: { lineStyle: { color: '#374151' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#9CA3AF' },
        splitLine: { lineStyle: { color: '#374151' } }
      },
      series: [
        {
          name: 'Research Output',
          type: 'line',
          data: [82, 87, 91, 94],
          smooth: true,
          itemStyle: { color: '#3B82F6' }
        },
        {
          name: 'Agent Efficiency',
          type: 'line',
          data: [75, 82, 88, 92],
          smooth: true,
          itemStyle: { color: '#10B981' }
        },
        {
          name: 'Success Rate',
          type: 'line',
          data: [88, 90, 93, 95],
          smooth: true,
          itemStyle: { color: '#8B5CF6' }
        }
      ]
    }
    
    chart.setOption(option)
    
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [])

  useEffect(() => {
    if (!costChartRef.current) return
    
    const chart = echarts.init(costChartRef.current, 'dark')
    
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: { color: '#9CA3AF' }
      },
      series: [
        {
          name: 'Cost Breakdown',
          type: 'pie',
          radius: '50%',
          data: [
            { value: 35, name: 'Research & Development' },
            { value: 25, name: 'Operations' },
            { value: 20, name: 'Infrastructure' },
            { value: 15, name: 'Quality Control' },
            { value: 5, name: 'Other' }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    
    chart.setOption(option)
    
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [])

  useEffect(() => {
    if (!productivityChartRef.current) return
    
    const chart = echarts.init(productivityChartRef.current, 'dark')
    
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['Experiments/Day', 'Success Rate %'],
        textStyle: { color: '#9CA3AF' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        axisLabel: { color: '#9CA3AF' },
        axisLine: { lineStyle: { color: '#374151' } }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Experiments',
          position: 'left',
          axisLabel: { color: '#9CA3AF' },
          splitLine: { lineStyle: { color: '#374151' } }
        },
        {
          type: 'value',
          name: 'Success Rate (%)',
          position: 'right',
          axisLabel: { color: '#9CA3AF' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Experiments/Day',
          type: 'bar',
          data: [12, 15, 18, 14, 16, 8, 6],
          itemStyle: { color: '#3B82F6' }
        },
        {
          name: 'Success Rate %',
          type: 'line',
          yAxisIndex: 1,
          data: [85, 90, 88, 92, 89, 94, 91],
          smooth: true,
          itemStyle: { color: '#10B981' }
        }
      ]
    }
    
    chart.setOption(option)
    
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Insights and performance metrics for your biotech operations
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
              Export Report
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
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
                  {metrics?.kpis?.researchEfficiency}%
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
                  {formatCurrency(metrics?.kpis?.costPerExperiment || 0)}
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
                  {metrics?.kpis?.successRate}%
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
                  {metrics?.kpis?.timeToCompletion} days
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
          {metrics?.trends && Object.entries(metrics.trends).map(([key, trend]: [string, any]) => (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-semibold ${
                      trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {trend.direction === 'up' ? '+' : ''}{trend.value}%
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
            <div className="h-64" ref={performanceChartRef} />
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Cost Breakdown
            </h2>
            <div className="h-64" ref={costChartRef} />
          </div>
        </div>

        {/* Productivity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Productivity
          </h2>
          <div className="h-64" ref={productivityChartRef} />
        </div>
      </div>
    </DashboardLayout>
  )
}