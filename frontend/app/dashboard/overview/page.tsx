'use client'

import React, { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Card } from '@/components/ui/atoms/Card'
import { AlertBanner } from '@/components/ui/molecules/AlertBanner'
import { MetricChart } from '@/components/ui/molecules/MetricChart'
import { StatCard } from '@/components/ui/molecules/StatCard'
// import { ActivityFeed } from '@/components/ui/molecules/ActivityFeed';
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { useWebSocketStore } from '@/lib/stores/websocketStore'

// Chart series interface for MetricChart
interface ChartDataPoint {
  x: string | number | Date
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

export default function OverviewPage() {
  const { agents, workflows, systemHealth, notifications } = useDashboardStore()

  const { connect, disconnect, getConnectionStatus } = useWebSocketStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Connect to WebSocket for real-time updates
        const connectionStatus = getConnectionStatus('overview')
        if (!connectionStatus || connectionStatus === 'disconnected') {
          connect('overview', process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws')
        }
      } catch (error) {
        console.error('Failed to initialize dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeDashboard()

    return () => {
      disconnect('overview')
    }
  }, [connect, disconnect, getConnectionStatus])

  // Convert Maps to arrays for calculations
  const agentsArray = Array.from(agents.values())
  const workflowsArray = Array.from(workflows.values())

  // Calculate system metrics
  const activeAgents = agentsArray.filter((agent) => agent.status === 'active').length
  const runningWorkflows = workflowsArray.filter((workflow) => workflow.status === 'running').length
  const criticalAlerts = notifications.filter((notif) => notif.type === 'error').length

  // Mock chart data (in real app, this would come from systemHealth)
  const systemMetrics: ChartSeries[] = [
    {
      id: 'cpu-usage',
      name: 'CPU Usage',
      data: [65, 68, 72, 70, 75, 78, 80, 77, 74, 71].map((y, x) => ({ x, y })),
      color: '#3b82f6',
    },
    {
      id: 'memory-usage',
      name: 'Memory Usage',
      data: [45, 48, 52, 50, 55, 58, 60, 57, 54, 51].map((y, x) => ({ x, y })),
      color: '#10b981',
    },
    {
      id: 'network-io',
      name: 'Network I/O',
      data: [25, 28, 32, 30, 35, 38, 40, 37, 34, 31].map((y, x) => ({ x, y })),
      color: '#f59e0b',
    },
  ]

  const agentActivitySeries: ChartSeries[] = [
    {
      id: 'active-agents',
      name: 'Active Agents',
      data: [12, 15, 18, 16, 19, 22, 24, 21, 18, 15].map((y, x) => ({ x, y })),
      color: '#8b5cf6',
    },
  ]

  // Prepare activity feed data
  const recentActivities = [
    ...agentsArray.slice(0, 3).map((agent) => ({
      id: `agent-${agent.id}`,
      title: `Agent ${agent.name} status updated`,
      description: `Status changed to ${agent.status}`,
      timestamp: new Date(agent.lastActivity || Date.now()),
      type: 'agent' as const,
      priority: agent.status === 'active' ? ('low' as const) : ('medium' as const),
    })),
    ...workflowsArray.slice(0, 3).map((workflow) => ({
      id: `workflow-${workflow.id}`,
      title: `Workflow ${workflow.name} updated`,
      description: `Status: ${workflow.status}`,
      timestamp: new Date(workflow.startedAt || Date.now()),
      type: 'workflow' as const,
      priority: workflow.status === 'failed' ? ('high' as const) : ('low' as const),
    })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time monitoring of your BioThings ecosystem
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={getConnectionStatus('overview') === 'connected' ? 'success' : 'danger'}
            className="capitalize"
          >
            {getConnectionStatus('overview') === 'connected' ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts > 0 && (
        <AlertBanner
          variant="error"
          title="Critical System Alerts"
          message={`${criticalAlerts} critical issues require immediate attention`}
          actions={[
            {
              id: 'view-alerts',
              label: 'View Alerts',
              onClick: () => {
                /* Navigate to alerts */
              },
            },
          ]}
        />
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <StatCard
          title="Running Workflows"
          value={runningWorkflows.toString()}
          subtitle={`of ${workflowsArray.length} total`}
          trend={{
            value: runningWorkflows,
            percentage:
              workflowsArray.length > 0
                ? Math.round((runningWorkflows / workflowsArray.length) * 100)
                : 0,
            direction: runningWorkflows > workflowsArray.length / 2 ? 'up' : 'down',
          }}
          variant="default"
        />

        <StatCard
          title="System Health"
          value={systemHealth?.overall || 'Unknown'}
          subtitle="Overall system status"
          trend={{
            value: 99,
            percentage: 99,
            direction: 'up',
          }}
          variant="default"
        />

        <StatCard
          title="Data Processed"
          value="1.2M"
          subtitle="Records today"
          trend={{
            value: 1200000,
            percentage: 15,
            direction: 'up',
          }}
          variant="default"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Performance
            </h3>
            <Badge variant="secondary" outline>
              Last 24h
            </Badge>
          </div>
          <MetricChart
            title="Resource Usage"
            series={systemMetrics}
            height={300}
            showLegend={true}
          />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Activity</h3>
            <Badge variant="secondary" outline>
              Real-time
            </Badge>
          </div>
          <MetricChart
            title="Active Agents Over Time"
            series={agentActivitySeries}
            height={300}
            showLegend={false}
          />
        </Card>
      </div>

      {/* Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
            {/* <ActivityFeed
              activities={recentActivities}
              maxItems={10}
            /> */}
            <div className="space-y-3">
              {recentActivities.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border-l-2 border-l-blue-400"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="primary" size="xs" className="capitalize">
                          {activity.type}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {activity.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              Deploy New Agent
            </Button>
            <Button className="w-full justify-start" variant="outline">
              Create Workflow
            </Button>
            <Button className="w-full justify-start" variant="outline">
              Run Diagnostics
            </Button>
            <Button className="w-full justify-start" variant="outline">
              View Logs
            </Button>
            <Button className="w-full justify-start" variant="outline">
              System Settings
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
