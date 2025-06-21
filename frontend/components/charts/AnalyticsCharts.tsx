'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface ChartData {
  performanceData?: {
    labels: string[]
    datasets: Array<{
      name: string
      data: number[]
    }>
  }
  costBreakdown?: Array<{
    name: string
    value: number
  }>
  productivityData?: {
    dates: string[]
    productivity: number[]
    efficiency: number[]
  }
}

interface AnalyticsChartsProps {
  data: ChartData
}

export function PerformanceChart({ data }: { data: ChartData['performanceData'] }) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || !data) return
    
    const chart = echarts.init(chartRef.current, 'dark')
    
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        data: data.datasets.map(d => d.name),
        textStyle: { color: '#9CA3AF' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.labels,
        axisLabel: { color: '#9CA3AF' },
        axisLine: { lineStyle: { color: '#374151' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#9CA3AF' },
        splitLine: { lineStyle: { color: '#374151' } }
      },
      series: data.datasets.map((dataset, index) => ({
        name: dataset.name,
        type: 'line',
        data: dataset.data,
        smooth: true,
        itemStyle: { color: ['#3B82F6', '#10B981', '#8B5CF6'][index] }
      }))
    }
    
    chart.setOption(option)
    
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [data])

  return <div ref={chartRef} className="w-full h-full" />
}

export function CostBreakdownChart({ data }: { data: ChartData['costBreakdown'] }) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || !data) return
    
    const chart = echarts.init(chartRef.current, 'dark')
    
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: '#9CA3AF' }
      },
      series: [{
        name: 'Cost Breakdown',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#1F2937',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
            color: '#E5E7EB'
          }
        },
        labelLine: { show: false },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: { color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index] }
        }))
      }]
    }
    
    chart.setOption(option)
    
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [data])

  return <div ref={chartRef} className="w-full h-full" />
}

export function ProductivityChart({ data }: { data: ChartData['productivityData'] }) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || !data) return
    
    const chart = echarts.init(chartRef.current, 'dark')
    
    const option = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['Productivity', 'Efficiency'],
        textStyle: { color: '#9CA3AF' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.dates,
        axisLabel: { color: '#9CA3AF' },
        axisLine: { lineStyle: { color: '#374151' } }
      },
      yAxis: [{
        type: 'value',
        name: 'Productivity',
        position: 'left',
        axisLabel: { color: '#9CA3AF' },
        splitLine: { lineStyle: { color: '#374151' } }
      }, {
        type: 'value',
        name: 'Efficiency %',
        position: 'right',
        axisLabel: { color: '#9CA3AF' }
      }],
      series: [{
        name: 'Productivity',
        type: 'bar',
        data: data.productivity,
        itemStyle: { color: '#3B82F6' }
      }, {
        name: 'Efficiency',
        type: 'line',
        yAxisIndex: 1,
        data: data.efficiency,
        itemStyle: { color: '#10B981' }
      }]
    }
    
    chart.setOption(option)
    
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [data])

  return <div ref={chartRef} className="w-full h-full" />
}