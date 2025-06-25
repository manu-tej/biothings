'use client'

import { Zap, Clock, Database, Wifi, Activity, BarChart3, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import React, { useState, useEffect } from 'react'

import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { batchClient } from '@/lib/api/batch-client'
import { useWebSocketInfo } from '@/lib/websocket/hooks'

// Lazy load chart
const PerformanceChart = dynamic(() => import('@/components/performance/PerformanceChart'), {
  loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />,
  ssr: false,
})

interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  cacheHitRate: number
  apiLatency: number
  wsConnections: number
  renderTime: number
}

export default function PerformanceMonitoringPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    cacheHitRate: 0,
    apiLatency: 0,
    wsConnections: 0,
    renderTime: 0,
  })

  const [performanceHistory, setPerformanceHistory] = useState<
    Array<{
      timestamp: Date
      fps: number
      memory: number
    }>
  >([])

  const wsInfo = useWebSocketInfo()
  const cacheStats = batchClient.getCacheStats()

  // Collect performance metrics
  useEffect(() => {
    const collectMetrics = async () => {
      // FPS calculation
      let lastTime = performance.now()
      let frames = 0
      const measureFPS = () => {
        frames++
        const currentTime = performance.now()
        if (currentTime >= lastTime + 1000) {
          const fps = Math.round((frames * 1000) / (currentTime - lastTime))
          frames = 0
          lastTime = currentTime
          return fps
        }
        return null
      }

      // Start FPS monitoring
      const fpsInterval = setInterval(() => {
        requestAnimationFrame(() => {
          const fps = measureFPS()
          if (fps !== null) {
            setMetrics((prev) => ({ ...prev, fps }))
          }
        })
      }, 16) // ~60fps

      // Memory monitoring
      const memoryInterval = setInterval(() => {
        if ('memory' in performance && (performance as any).memory) {
          const memoryUsage = Math.round((performance as any).memory.usedJSHeapSize / 1048576) // Convert to MB
          setMetrics((prev) => ({ ...prev, memoryUsage }))

          // Add to history
          setPerformanceHistory((prev) => {
            const newHistory = [
              ...prev,
              {
                timestamp: new Date(),
                fps: metrics.fps,
                memory: memoryUsage,
              },
            ]
            // Keep last 60 data points (1 minute of data)
            return newHistory.slice(-60)
          })
        }
      }, 1000)

      // Cleanup
      return () => {
        clearInterval(fpsInterval)
        clearInterval(memoryInterval)
      }
    }

    collectMetrics()
  }, [])

  // Update other metrics
  useEffect(() => {
    setMetrics((prev) => ({
      ...prev,
      wsConnections: wsInfo.length,
      cacheHitRate:
        cacheStats.size > 0
          ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)
          : 0,
    }))
  }, [wsInfo, cacheStats])

  // Calculate performance score
  const performanceScore = React.useMemo(() => {
    let score = 100

    // Deduct points for poor metrics
    if (metrics.fps < 60) score -= (60 - metrics.fps) * 0.5
    if (metrics.memoryUsage > 200) score -= (metrics.memoryUsage - 200) * 0.1
    if (metrics.cacheHitRate < 80) score -= (80 - metrics.cacheHitRate) * 0.2
    if (metrics.apiLatency > 200) score -= (metrics.apiLatency - 200) * 0.05

    return Math.max(0, Math.round(score))
  }, [metrics])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Performance Monitoring
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time application performance metrics
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Performance Score</p>
            <p className={`text-4xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* FPS */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Frame Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.fps} FPS
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {metrics.fps >= 60 ? (
                <span className="text-green-600">Smooth performance</span>
              ) : metrics.fps >= 30 ? (
                <span className="text-yellow-600">Acceptable performance</span>
              ) : (
                <span className="text-red-600">Poor performance</span>
              )}
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.memoryUsage} MB
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  metrics.memoryUsage < 100
                    ? 'bg-green-600'
                    : metrics.memoryUsage < 200
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                }`}
                style={{ width: `${Math.min(100, (metrics.memoryUsage / 300) * 100)}%` }}
              />
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {cacheStats.size > 0 ? `${metrics.cacheHitRate}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">Cache size: {cacheStats.size} items</div>
          </div>

          {/* WebSocket Connections */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <Wifi className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">WebSocket Connections</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.wsConnections}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">Max connections: 3</div>
          </div>

          {/* API Latency */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">API Latency</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.apiLatency || 'N/A'} ms
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">Batch requests enabled</div>
          </div>

          {/* Render Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Render Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.renderTime || 'N/A'} ms
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">Component memoization active</div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance History
          </h2>
          <PerformanceChart data={performanceHistory} />
        </div>

        {/* WebSocket Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            WebSocket Connections
          </h2>
          <div className="space-y-3">
            {wsInfo.map((conn, index) => (
              <div
                key={conn.key}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{conn.key}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Topics: {conn.topics.join(', ') || 'None'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      conn.state === 'connected'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : conn.state === 'connecting'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {conn.state}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last: {conn.lastActivity.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimization Tips */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Optimization Recommendations
          </h2>
          <div className="space-y-3">
            {metrics.fps < 60 && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Low Frame Rate Detected
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Consider reducing the number of animated elements or enabling hardware
                    acceleration.
                  </p>
                </div>
              </div>
            )}

            {metrics.memoryUsage > 200 && (
              <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">High Memory Usage</p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Memory usage is high. Check for memory leaks or consider implementing
                    pagination.
                  </p>
                </div>
              </div>
            )}

            {metrics.cacheHitRate < 50 && cacheStats.size > 0 && (
              <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Low Cache Hit Rate</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Many API requests are not hitting the cache. Consider increasing cache duration.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
