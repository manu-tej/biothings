/**
 * Optimized Component Example
 * Demonstrates all performance optimizations in action
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'

import {
  withMemo,
  VirtualList,
  wsManager,
  apiClient,
  lazyWithPreload,
  usePreloadOnInteraction,
  perfMonitor,
} from '@/lib/performance/optimization-toolkit'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

// Lazy load heavy chart component
const AnalyticsChart = lazyWithPreload(
  () =>
    import('@/components/charts/AnalyticsChart').then((mod) => ({
      default: mod.AnalyticsChart,
    })),
  { fallback: () => <div className="h-64 bg-gray-100 animate-pulse rounded" /> }
)

// Types
interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  metrics: {
    cpu: number
    memory: number
    tasks: number
  }
  lastUpdate: string
}

interface OptimizedDashboardProps {
  initialAgents?: Agent[]
}

// Memoized Agent Card Component
const AgentCard = withMemo<{ agent: Agent; onClick: (id: string) => void }>(
  ({ agent, onClick }) => {
    perfMonitor.mark(`agent-card-render-${agent.id}`)

    // Memoize expensive calculations
    const statusColor = useMemo(() => {
      switch (agent.status) {
        case 'active':
          return 'bg-green-500'
        case 'idle':
          return 'bg-yellow-500'
        case 'error':
          return 'bg-red-500'
        default:
          return 'bg-gray-500'
      }
    }, [agent.status])

    const formattedMetrics = useMemo(
      () => ({
        cpu: `${agent.metrics.cpu.toFixed(1)}%`,
        memory: `${agent.metrics.memory.toFixed(1)}%`,
        tasks: agent.metrics.tasks.toString(),
      }),
      [agent.metrics]
    )

    React.useEffect(() => {
      perfMonitor.measure(`agent-card-render-time-${agent.id}`, `agent-card-render-${agent.id}`)
    })

    return (
      <Card
        className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => onClick(agent.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{agent.name}</h3>
          <Badge className={statusColor}>{agent.status}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-gray-500">CPU:</span>
            <span className="ml-1 font-medium">{formattedMetrics.cpu}</span>
          </div>
          <div>
            <span className="text-gray-500">Memory:</span>
            <span className="ml-1 font-medium">{formattedMetrics.memory}</span>
          </div>
          <div>
            <span className="text-gray-500">Tasks:</span>
            <span className="ml-1 font-medium">{formattedMetrics.tasks}</span>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-400">
          Last update: {new Date(agent.lastUpdate).toLocaleTimeString()}
        </div>
      </Card>
    )
  },
  // Custom comparison function - only re-render if data actually changed
  (prevProps, nextProps) =>
    prevProps.agent.id === nextProps.agent.id &&
    prevProps.agent.status === nextProps.agent.status &&
    prevProps.agent.lastUpdate === nextProps.agent.lastUpdate &&
    JSON.stringify(prevProps.agent.metrics) === JSON.stringify(nextProps.agent.metrics)
)

// Main Optimized Dashboard Component
export default function OptimizedDashboard({ initialAgents = [] }: OptimizedDashboardProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showChart, setShowChart] = useState(false)

  // WebSocket subscription for real-time updates
  React.useEffect(() => {
    perfMonitor.mark('websocket-setup-start')

    const unsubscribe = wsManager.subscribe('agent-updates', (data) => {
      if (data.type === 'agent-update') {
        setAgents((prev) =>
          prev.map((agent) =>
            agent.id === data.agentId
              ? { ...agent, ...data.updates, lastUpdate: new Date().toISOString() }
              : agent
          )
        )
      }
    })

    perfMonitor.measure('websocket-setup', 'websocket-setup-start')

    return unsubscribe
  }, [])

  // Fetch initial data with optimized API client
  React.useEffect(() => {
    perfMonitor.mark('initial-fetch-start')

    apiClient
      .get<Agent[]>('/api/agents', {
        cache: true,
        cacheTTL: 5 * 60 * 1000, // 5 minutes
      })
      .then((data) => {
        setAgents(data)
        perfMonitor.measure('initial-fetch', 'initial-fetch-start')
      })
  }, [])

  // Memoized callbacks
  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgent(agentId)
  }, [])

  const handleShowChart = useCallback(() => {
    setShowChart(true)
  }, [])

  // Preload chart on button hover
  const chartButtonProps = usePreloadOnInteraction(AnalyticsChart)

  // Filter and sort agents
  const sortedAgents = useMemo(
    () =>
      [...agents].sort((a, b) => {
        // Active agents first
        if (a.status === 'active' && b.status !== 'active') return -1
        if (a.status !== 'active' && b.status === 'active') return 1
        // Then by CPU usage
        return b.metrics.cpu - a.metrics.cpu
      }),
    [agents]
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Optimized Agent Dashboard</h1>
        <p className="text-gray-600">
          Demonstrating performance optimizations: memoization, virtualization, lazy loading
        </p>
      </div>

      {/* Performance Stats */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Performance Metrics</h2>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Agents:</span>
            <span className="ml-2 font-medium">{agents.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Active:</span>
            <span className="ml-2 font-medium">
              {agents.filter((a) => a.status === 'active').length}
            </span>
          </div>
          <div>
            <span className="text-gray-500">WebSocket:</span>
            <span className="ml-2 font-medium">
              {wsManager.getConnectionState('agent-updates')}
            </span>
          </div>
          <div>
            <button
              {...chartButtonProps}
              onClick={handleShowChart}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Show Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Virtualized Agent List */}
      <div className="mb-6">
        <h2 className="font-semibold mb-4">Agents (Virtualized List)</h2>
        <VirtualList
          items={sortedAgents}
          height={600}
          itemHeight={120}
          overscan={3}
          className="border rounded"
          renderItem={(agent) => (
            <div className="p-2">
              <AgentCard agent={agent} onClick={handleAgentClick} />
            </div>
          )}
        />
      </div>

      {/* Lazy Loaded Chart */}
      {showChart && (
        <div className="mb-6">
          <h2 className="font-semibold mb-4">Analytics Chart (Lazy Loaded)</h2>
          <React.Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded" />}>
            <AnalyticsChart data={agents} />
          </React.Suspense>
        </div>
      )}

      {/* Selected Agent Details */}
      {selectedAgent && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg p-6 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">
            Agent Details: {agents.find((a) => a.id === selectedAgent)?.name}
          </h2>
          <button
            onClick={() => setSelectedAgent(null)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
          {/* Agent details content */}
        </div>
      )}
    </div>
  )
}

// Performance measurement hook
// eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
function usePerformanceTracking(componentName: string) {
  React.useEffect(() => {
    perfMonitor.mark(`${componentName}-mount`)

    return () => {
      perfMonitor.measure(`${componentName}-lifecycle`, `${componentName}-mount`)
    }
  }, [componentName])
}
