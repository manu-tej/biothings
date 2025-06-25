'use client'

import { Download, RefreshCw, Calendar, TrendingUp, BarChart3 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Card } from '@/components/ui/atoms/Card'
import { Select } from '@/components/ui/atoms/Select'
import { DataTable } from '@/components/ui/molecules/DataTable'
import { MetricChart } from '@/components/ui/molecules/MetricChart'
import { StatCard } from '@/components/ui/molecules/StatCard'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { useWebSocketStore } from '@/lib/stores/websocketStore'

// Chart series interface for MetricChart
interface ChartDataPoint {
  x: any
  y: number
  label?: string
  color?: string
}

interface ChartSeries {
  id: string
  name: string
  data: ChartDataPoint[]
  color?: string
  type?: 'line' | 'bar' | 'area'
}

export default function AnalyticsPage() {
  const { agents, workflows, systemHealth: _systemHealth } = useDashboardStore()

  const { connect, disconnect, getConnectionStatus } = useWebSocketStore()
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('performance')

  useEffect(() => {
    const initializeAnalyticsPage = async () => {
      try {
        // Connect to analytics WebSocket channel
        const connectionStatus = getConnectionStatus('analytics')
        if (!connectionStatus || connectionStatus === 'disconnected') {
          connect('analytics', process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws')
        }
      } catch (_error) {
        // Handle initialization error silently
      } finally {
        setIsLoading(false)
      }
    }

    initializeAnalyticsPage()

    return () => {
      disconnect('analytics')
    }
  }, [connect, disconnect, getConnectionStatus])

  // Convert Maps to arrays for calculations
  const agentsArray = Array.from(agents.values())
  const _workflowsArray = Array.from(workflows.values())

  // Calculate analytics metrics
  const totalTasks = agentsArray.reduce(
    (sum, agent) => sum + (agent.metrics.tasksCompleted || 0),
    0
  )
  const avgResponseTime =
    agentsArray.length > 0
      ? agentsArray.reduce((sum, agent) => sum + (agent.metrics.averageResponseTime || 0), 0) /
        agentsArray.length
      : 0
  const successRate =
    agentsArray.length > 0
      ? agentsArray.reduce((sum, agent) => sum + (agent.metrics.successRate || 0), 0) /
        agentsArray.length
      : 0
  const activeAgents = agentsArray.filter((agent) => agent.status === 'active').length

  // Mock time-series data (in real app, this would come from API based on timeRange)
  const generateTimeSeriesData = (baseValue: number, variance: number, points: number) => {
    return Array.from({ length: points }, (_, i) => ({
      x: i,
      y: Math.max(0, baseValue + (Math.random() - 0.5) * variance),
    }))
  }

  const performanceMetrics: ChartSeries[] = [
    {
      id: 'tasks-completed',
      name: 'Tasks Completed',
      data: generateTimeSeriesData(150, 50, 24),
      color: '#3b82f6',
    },
    {
      id: 'success-rate',
      name: 'Success Rate %',
      data: generateTimeSeriesData(95, 10, 24),
      color: '#10b981',
    },
    {
      id: 'response-time',
      name: 'Avg Response Time (ms)',
      data: generateTimeSeriesData(120, 40, 24),
      color: '#f59e0b',
    },
  ]

  const agentUtilization: ChartSeries[] = [
    {
      id: 'cpu-usage',
      name: 'CPU Usage %',
      data: generateTimeSeriesData(65, 20, 24),
      color: '#8b5cf6',
    },
    {
      id: 'memory-usage',
      name: 'Memory Usage %',
      data: generateTimeSeriesData(45, 15, 24),
      color: '#ef4444',
    },
  ]

  const workflowAnalytics: ChartSeries[] = [
    {
      id: 'workflows-completed',
      name: 'Completed',
      data: generateTimeSeriesData(25, 8, 24),
      color: '#10b981',
    },
    {
      id: 'workflows-failed',
      name: 'Failed',
      data: generateTimeSeriesData(3, 2, 24),
      color: '#ef4444',
    },
  ]

  // Table data for top performing agents
  const topAgentsData = agentsArray
    .sort((a, b) => (b.metrics.tasksCompleted || 0) - (a.metrics.tasksCompleted || 0))
    .slice(0, 10)
    .map((agent, index) => ({
      rank: index + 1,
      name: agent.name,
      type: agent.type,
      tasksCompleted: agent.metrics.tasksCompleted || 0,
      successRate: `${(agent.metrics.successRate || 0).toFixed(1)}%`,
      avgResponseTime: `${(agent.metrics.averageResponseTime || 0).toFixed(0)}ms`,
      status: agent.status,
    }))

  const tableColumns = [
    {
      id: 'rank',
      header: 'Rank',
      accessorKey: 'rank' as keyof (typeof topAgentsData)[0],
      sortable: true,
    },
    {
      id: 'name',
      header: 'Agent Name',
      accessorKey: 'name' as keyof (typeof topAgentsData)[0],
      sortable: true,
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type' as keyof (typeof topAgentsData)[0],
      sortable: true,
    },
    {
      id: 'tasksCompleted',
      header: 'Tasks',
      accessorKey: 'tasksCompleted' as keyof (typeof topAgentsData)[0],
      sortable: true,
    },
    {
      id: 'successRate',
      header: 'Success Rate',
      accessorKey: 'successRate' as keyof (typeof topAgentsData)[0],
      sortable: true,
    },
    {
      id: 'avgResponseTime',
      header: 'Avg Response',
      accessorKey: 'avgResponseTime' as keyof (typeof topAgentsData)[0],
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status' as keyof (typeof topAgentsData)[0],
      sortable: true,
      cell: (value: string) => (
        <Badge
          variant={
            value === 'active'
              ? 'success'
              : value === 'error'
                ? 'danger'
                : value === 'idle'
                  ? 'warning'
                  : 'secondary'
          }
          size="xs"
        >
          {value}
        </Badge>
      ),
    },
  ]

  const handleExportAnalytics = () => {
    // TODO: Implement export analytics functionality
  }

  const handleRefresh = () => {
    // TODO: Implement refresh analytics functionality
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & Insights</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Performance metrics and trends across your BioThings ecosystem
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={getConnectionStatus('analytics') === 'connected' ? 'success' : 'danger'}
            className="capitalize"
          >
            {getConnectionStatus('analytics') === 'connected' ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} icon={<RefreshCw />}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAnalytics} icon={<Download />}>
            Export
          </Button>
        </div>
      </div>

      {/* Time Range and Metric Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Select
              value={timeRange}
              onChange={setTimeRange}
              options={[
                { value: '1h', label: 'Last Hour' },
                { value: '24h', label: 'Last 24 Hours' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
              ]}
            />
          </div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <Select
              value={selectedMetric}
              onChange={setSelectedMetric}
              options={[
                { value: 'performance', label: 'Performance Metrics' },
                { value: 'utilization', label: 'Resource Utilization' },
                { value: 'workflows', label: 'Workflow Analytics' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Tasks"
          value={totalTasks.toLocaleString()}
          subtitle={`${timeRange} period`}
          trend={{
            value: totalTasks,
            percentage: 12,
            direction: 'up',
          }}
          variant="default"
          icon={<TrendingUp />}
        />

        <StatCard
          title="Avg Response Time"
          value={`${avgResponseTime.toFixed(0)}ms`}
          subtitle="Across all agents"
          trend={{
            value: avgResponseTime,
            percentage: 5,
            direction: 'down',
          }}
          variant="default"
        />

        <StatCard
          title="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          subtitle="Task completion rate"
          trend={{
            value: successRate,
            percentage: 2,
            direction: 'up',
          }}
          variant="default"
        />

        <StatCard
          title="Active Agents"
          value={activeAgents.toString()}
          subtitle={`of ${agentsArray.length} total`}
          trend={{
            value: activeAgents,
            percentage:
              agentsArray.length > 0 ? Math.round((activeAgents / agentsArray.length) * 100) : 0,
            direction: 'up',
          }}
          variant="default"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedMetric === 'performance' && (
          <>
            <Card className="p-6">
              <MetricChart
                title="Performance Trends"
                subtitle="Key performance indicators over time"
                series={performanceMetrics}
                height={350}
                showLegend={true}
                timeRange={timeRange}
              />
            </Card>
            <Card className="p-6">
              <MetricChart
                title="Agent Utilization"
                subtitle="Resource usage across agents"
                series={agentUtilization}
                height={350}
                showLegend={true}
                timeRange={timeRange}
              />
            </Card>
          </>
        )}

        {selectedMetric === 'utilization' && (
          <>
            <Card className="p-6">
              <MetricChart
                title="CPU & Memory Usage"
                subtitle="System resource utilization"
                series={agentUtilization}
                height={350}
                showLegend={true}
                timeRange={timeRange}
              />
            </Card>
            <Card className="p-6">
              <MetricChart
                title="Network Activity"
                subtitle="Data throughput and connections"
                series={[
                  {
                    id: 'network-throughput',
                    name: 'Throughput (MB/s)',
                    data: generateTimeSeriesData(45, 15, 24),
                    color: '#06b6d4',
                  },
                ]}
                height={350}
                showLegend={true}
                timeRange={timeRange}
              />
            </Card>
          </>
        )}

        {selectedMetric === 'workflows' && (
          <>
            <Card className="p-6">
              <MetricChart
                title="Workflow Completion"
                subtitle="Success vs failure rates"
                series={workflowAnalytics}
                height={350}
                showLegend={true}
                timeRange={timeRange}
              />
            </Card>
            <Card className="p-6">
              <MetricChart
                title="Workflow Duration"
                subtitle="Average time to completion"
                series={[
                  {
                    id: 'avg-duration',
                    name: 'Avg Duration (min)',
                    data: generateTimeSeriesData(15, 5, 24),
                    color: '#8b5cf6',
                  },
                ]}
                height={350}
                showLegend={true}
                timeRange={timeRange}
              />
            </Card>
          </>
        )}
      </div>

      {/* Top Performers Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Performing Agents
          </h3>
          <Badge variant="secondary" outline>
            {timeRange} period
          </Badge>
        </div>
        <DataTable
          data={topAgentsData}
          columns={tableColumns}
          sortable={true}
          filterable={true}
          emptyMessage="No agent performance data available"
        />
      </Card>
    </div>
  )
}
