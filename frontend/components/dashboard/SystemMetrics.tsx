'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useMetricsWebSocket } from '@/lib/hooks/useWebSocket'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  icon: React.ReactNode
  trend?: number
  status?: 'good' | 'warning' | 'critical'
}

function MetricCard({ title, value, unit, icon, trend, status = 'good' }: MetricCardProps) {
  const statusColors = {
    good: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
    warning: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20',
    critical: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${statusColors[status]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className="flex items-center space-x-1 text-sm">
            {trend > 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">+{trend}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400">{trend}%</span>
              </>
            )}
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value}
        {unit && <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

export default function SystemMetrics() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const queryClient = useQueryClient()
  const [metricsHistory, setMetricsHistory] = useState<any[]>([])

  // Fetch current metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => apiClient.getMetrics(),
    refetchInterval: 300000 // 5 minutes - reduced frequency since we have WebSocket
  })

  // Generate initial historical data for chart
  const { data: history } = useQuery({
    queryKey: ['metrics-history'],
    queryFn: async () => {
      // Generate mock historical data for demonstration
      const now = new Date()
      const mockHistory = []
      for (let i = 29; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60000) // Every minute
        mockHistory.push({
          timestamp: timestamp.toISOString(),
          cpu_percent: 25 + Math.random() * 20, // 25-45%
          memory_percent: 45 + Math.random() * 15, // 45-60%
          active_agents: 5,
          active_workflows: 2
        })
      }
      return mockHistory
    },
    refetchInterval: false // Don't refetch, we'll use WebSocket for updates
  })

  // Initialize metrics history
  useEffect(() => {
    if (history) {
      setMetricsHistory(history)
    }
  }, [history])

  // WebSocket for real-time metrics updates
  const { isConnected, connectionState } = useMetricsWebSocket((newMetrics) => {
    // Update current metrics
    queryClient.setQueryData(['system-metrics'], {
      system: newMetrics.system || newMetrics,
      agents: newMetrics.agents || {
        total_agents: newMetrics.total_agents || 5,
        active_agents: newMetrics.active_agents || 5,
        agent_types: newMetrics.agent_types || {}
      },
      websocket_connections: newMetrics.websocket_connections || 1,
      timestamp: newMetrics.timestamp || new Date().toISOString()
    })

    // Update metrics history for chart
    setMetricsHistory(prev => {
      const newEntry = {
        timestamp: newMetrics.timestamp || new Date().toISOString(),
        cpu_percent: newMetrics.system?.cpu_percent || newMetrics.cpu_percent || 0,
        memory_percent: newMetrics.system?.memory_percent || newMetrics.memory_percent || 0,
        active_agents: newMetrics.agents?.active_agents || newMetrics.active_agents || 0,
        active_workflows: newMetrics.active_workflows || 0
      }
      
      // Keep last 30 entries
      const updated = [...prev.slice(-29), newEntry]
      return updated
    })
  })

  useEffect(() => {
    if (!chartRef.current || !metricsHistory || metricsHistory.length === 0) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark')
    }

    const timestamps = metricsHistory.map((item: any) => 
      new Date(item.timestamp).toLocaleTimeString()
    )
    const cpuData = metricsHistory.map((item: any) => item.cpu_percent)
    const memoryData = metricsHistory.map((item: any) => item.memory_percent)

    const option: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['CPU Usage', 'Memory Usage'],
        textStyle: {
          color: '#9CA3AF'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timestamps,
        axisLabel: {
          color: '#9CA3AF'
        },
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%',
          color: '#9CA3AF'
        },
        splitLine: {
          lineStyle: {
            color: '#374151'
          }
        }
      },
      series: [
        {
          name: 'CPU Usage',
          type: 'line',
          data: cpuData,
          smooth: true,
          itemStyle: {
            color: '#3B82F6'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0)' }
              ]
            }
          }
        },
        {
          name: 'Memory Usage',
          type: 'line',
          data: memoryData,
          smooth: true,
          itemStyle: {
            color: '#10B981'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.5)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0)' }
              ]
            }
          }
        }
      ]
    }

    chartInstance.current.setOption(option)

    // Resize chart on window resize
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [metricsHistory])

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />
  }

  const systemData = metrics?.system || { cpu_percent: 0, memory_percent: 0 }
  const agentData = metrics?.agents || { active_agents: 0, total_agents: 0 }
  const cpuPercent = systemData.cpu_percent || 0
  const memoryPercent = systemData.memory_percent || 0
  const cpuStatus = cpuPercent > 80 ? 'critical' : cpuPercent > 60 ? 'warning' : 'good'
  const memoryStatus = memoryPercent > 85 ? 'critical' : memoryPercent > 70 ? 'warning' : 'good'

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Performance
            </h2>
            {/* Connection status indicator */}
            <div className={`w-2 h-2 rounded-full ${
              connectionState === 'connected' ? 'bg-green-500' :
              connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              connectionState === 'error' ? 'bg-red-500' :
              'bg-gray-400'
            }`} title={`WebSocket: ${connectionState}`} />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isConnected ? 'Live' : 'Polling'}
          </span>
        </div>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="CPU Usage"
            value={cpuPercent.toFixed(1)}
            unit="%"
            icon={<Cpu className="w-5 h-5" />}
            trend={2.5}
            status={cpuStatus}
          />
          <MetricCard
            title="Memory Usage"
            value={memoryPercent.toFixed(1)}
            unit="%"
            icon={<HardDrive className="w-5 h-5" />}
            trend={-1.2}
            status={memoryStatus}
          />
          <MetricCard
            title="Active Agents"
            value={agentData.active_agents || 0}
            icon={<Activity className="w-5 h-5" />}
            status="good"
          />
          <MetricCard
            title="Total Agents"
            value={agentData.total_agents || 0}
            icon={<Zap className="w-5 h-5" />}
            status="good"
          />
        </div>

        {/* Performance Chart */}
        <div className="h-64" ref={chartRef} />
      </div>
    </div>
  )
}