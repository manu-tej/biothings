'use client'

import * as echarts from 'echarts'
import React, { useEffect, useRef } from 'react'

interface PerformanceChartProps {
  data: Array<{
    timestamp: Date
    fps: number
    memory: number
  }>
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return

    const chart = echarts.init(chartRef.current, 'dark')

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['FPS', 'Memory (MB)'],
        textStyle: { color: '#9CA3AF' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.timestamp.toLocaleTimeString()),
        axisLabel: {
          color: '#9CA3AF',
          interval: Math.floor(data.length / 6) // Show ~6 labels
        },
        axisLine: { lineStyle: { color: '#374151' } }
      },
      yAxis: [
        {
          type: 'value',
          name: 'FPS',
          position: 'left',
          min: 0,
          max: 120,
          axisLabel: { color: '#9CA3AF' },
          splitLine: { lineStyle: { color: '#374151' } }
        },
        {
          type: 'value',
          name: 'Memory (MB)',
          position: 'right',
          min: 0,
          axisLabel: { color: '#9CA3AF' }
        }
      ],
      series: [
        {
          name: 'FPS',
          type: 'line',
          data: data.map(d => d.fps),
          smooth: true,
          itemStyle: { color: '#10B981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
              ]
            }
          },
          markLine: {
            data: [
              {
                yAxis: 60,
                label: {
                  formatter: 'Target: 60 FPS',
                  color: '#9CA3AF'
                },
                lineStyle: {
                  color: '#F59E0B',
                  type: 'dashed'
                }
              }
            ]
          }
        },
        {
          name: 'Memory (MB)',
          type: 'line',
          yAxisIndex: 1,
          data: data.map(d => d.memory),
          smooth: true,
          itemStyle: { color: '#3B82F6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ]
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
  }, [data])

  return <div ref={chartRef} className="w-full h-64" />
}