'use client'

import { clsx } from 'clsx'
import { Download, Maximize2, RefreshCw } from 'lucide-react'
import React, { forwardRef, useState } from 'react'

import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { Card, CardHeader, CardBody } from '../atoms/Card'
import { Spinner } from '../atoms/Spinner'

export interface ChartDataPoint {
  x: string | number | Date
  y: number
  label?: string
  color?: string
}

export interface ChartSeries {
  id: string
  name: string
  data: ChartDataPoint[]
  color?: string
  type?: 'line' | 'bar' | 'area'
}

export interface MetricChartProps {
  title: string
  subtitle?: string
  series: ChartSeries[]
  type?: 'line' | 'bar' | 'area' | 'pie' | 'donut'
  loading?: boolean
  error?: string
  noData?: boolean
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  showTooltip?: boolean
  timeRange?: string
  lastUpdated?: Date
  refreshInterval?: number
  onRefresh?: () => void
  onExport?: () => void
  onFullscreen?: () => void
  actions?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  testId?: string
  // Chart component to render - accepts any chart library component
  children?: React.ReactNode
}

const sizeStyles = {
  sm: {
    height: 200,
    title: 'text-sm font-medium',
    subtitle: 'text-xs',
  },
  md: {
    height: 300,
    title: 'text-base font-medium',
    subtitle: 'text-sm',
  },
  lg: {
    height: 400,
    title: 'text-lg font-medium',
    subtitle: 'text-base',
  },
}

export const MetricChart = forwardRef<HTMLDivElement, MetricChartProps>(
  (
    {
      title,
      subtitle,
      series,
      type: _type = 'line',
      loading = false,
      error,
      noData = false,
      height,
      showLegend = true,
      showGrid: _showGrid = true,
      showTooltip: _showTooltip = true,
      timeRange,
      lastUpdated,
      refreshInterval: _refreshInterval,
      onRefresh,
      onExport,
      onFullscreen,
      actions,
      size = 'md',
      className,
      testId,
      children,
    },
    ref
  ) => {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const sizes = sizeStyles[size]
    const chartHeight = height || sizes.height

    const handleRefresh = async () => {
      if (!onRefresh || isRefreshing) return

      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    const formatLastUpdated = (date: Date) => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

      if (diff < 60) return 'Just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return date.toLocaleDateString()
    }

    const renderActions = () => {
      const actionButtons = []

      if (onRefresh) {
        actionButtons.push(
          <Button
            key="refresh"
            size="xs"
            variant="ghost"
            onClick={handleRefresh}
            loading={isRefreshing}
            icon={<RefreshCw />}
            title="Refresh chart"
          />
        )
      }

      if (onExport) {
        actionButtons.push(
          <Button
            key="export"
            size="xs"
            variant="ghost"
            onClick={onExport}
            icon={<Download />}
            title="Export chart"
          />
        )
      }

      if (onFullscreen) {
        actionButtons.push(
          <Button
            key="fullscreen"
            size="xs"
            variant="ghost"
            onClick={onFullscreen}
            icon={<Maximize2 />}
            title="View fullscreen"
          />
        )
      }

      return actionButtons
    }

    const renderEmptyState = () => {
      if (loading) {
        return (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading chart data...</p>
            </div>
          </div>
        )
      }

      if (error) {
        return (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <span className="text-red-600 dark:text-red-400 text-xl">⚠</span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Failed to load chart
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{error}</p>
              {onRefresh && (
                <Button size="sm" variant="outline" onClick={handleRefresh} loading={isRefreshing}>
                  Try again
                </Button>
              )}
            </div>
          </div>
        )
      }

      if (noData || series.length === 0 || series.every((s) => s.data.length === 0)) {
        return (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-gray-400 text-xl">📊</span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                No data available
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Data will appear here when available
              </p>
            </div>
          </div>
        )
      }

      return null
    }

    const renderLegend = () => {
      if (!showLegend || series.length <= 1) return null

      return (
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {series.map((serie) => (
            <div key={serie.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: serie.color || '#3b82f6' }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{serie.name}</span>
            </div>
          ))}
        </div>
      )
    }

    const isEmpty =
      loading || error || noData || series.length === 0 || series.every((s) => s.data.length === 0)

    return (
      <Card ref={ref} variant="default" padding="md" className={className} testId={testId}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={clsx(sizes.title, 'text-gray-900 dark:text-gray-100')}>{title}</h3>
                {timeRange && (
                  <Badge size="xs" variant="secondary">
                    {timeRange}
                  </Badge>
                )}
              </div>
              {subtitle && (
                <p className={clsx(sizes.subtitle, 'text-gray-600 dark:text-gray-400')}>
                  {subtitle}
                </p>
              )}
              {lastUpdated && !loading && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Updated {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {actions}
              {renderActions()}
            </div>
          </div>
        </CardHeader>

        <CardBody className="pt-0">
          {isEmpty ? (
            renderEmptyState()
          ) : (
            <div style={{ height: chartHeight }}>
              {children ? (
                children
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Chart component not provided
                  </p>
                </div>
              )}
            </div>
          )}

          {!isEmpty && renderLegend()}
        </CardBody>
      </Card>
    )
  }
)

MetricChart.displayName = 'MetricChart'

// Chart wrapper with common configurations
export const LineChart = forwardRef<HTMLDivElement, Omit<MetricChartProps, 'type'>>(
  (props, ref) => <MetricChart ref={ref} {...props} type="line" />
)

export const BarChart = forwardRef<HTMLDivElement, Omit<MetricChartProps, 'type'>>((props, ref) => (
  <MetricChart ref={ref} {...props} type="bar" />
))

export const AreaChart = forwardRef<HTMLDivElement, Omit<MetricChartProps, 'type'>>(
  (props, ref) => <MetricChart ref={ref} {...props} type="area" />
)

LineChart.displayName = 'LineChart'
BarChart.displayName = 'BarChart'
AreaChart.displayName = 'AreaChart'
