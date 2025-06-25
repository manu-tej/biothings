'use client'

import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import React from 'react'

export interface SankeyNode {
  id: string
  name: string
  category?: string
  value?: number
  itemStyle?: {
    color?: string
  }
}

export interface SankeyLink {
  source: string
  target: string
  value: number
  label?: string
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

interface SankeyChartProps {
  data: SankeyData
  width?: number
  height?: number
  className?: string
  onNodeClick?: (node: SankeyNode) => void
  onLinkClick?: (link: SankeyLink) => void
}

export const SankeyChart: React.FC<SankeyChartProps> = ({
  data,
  width = 800,
  height = 400,
  className = '',
  onNodeClick,
  onLinkClick,
}) => {
  const option: EChartsOption = {
    title: {
      text: 'Workflow Dependencies',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: function (params: any) {
        if (params.dataType === 'node') {
          return `${params.data.name}<br/>Value: ${params.data.value || 0}`
        } else if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>Value: ${params.data.value}`
        }
        return ''
      },
    },
    series: [
      {
        type: 'sankey',
        data: data.nodes.map((node) => ({
          name: node.name,
          value: node.value,
          itemStyle: node.itemStyle || {
            color: getNodeColor(node.category),
          },
        })),
        links: data.links.map((link) => ({
          source: link.source,
          target: link.target,
          value: link.value,
        })),
        nodeWidth: 20,
        nodeGap: 8,
        layoutIterations: 32,
        orient: 'horizontal',
        left: '5%',
        right: '5%',
        top: '10%',
        bottom: '10%',
        label: {
          show: true,
          position: 'right',
          fontSize: 12,
          color: '#333',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
          opacity: 0.6,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            opacity: 0.8,
          },
        },
      },
    ],
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
  }

  const handleEvents = {
    click: (params: any) => {
      if (params.dataType === 'node' && onNodeClick) {
        const originalNode = data.nodes.find((node) => node.name === params.data.name)
        if (originalNode) {
          onNodeClick(originalNode)
        }
      } else if (params.dataType === 'edge' && onLinkClick) {
        const originalLink = data.links.find(
          (link) => link.source === params.data.source && link.target === params.data.target
        )
        if (originalLink) {
          onLinkClick(originalLink)
        }
      }
    },
  }

  return (
    <div className={`sankey-chart ${className}`}>
      <ReactECharts
        option={option}
        style={{ width: width, height: height }}
        onEvents={handleEvents}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}

function getNodeColor(category?: string): string {
  const colors: Record<string, string> = {
    input: '#4CAF50',
    process: '#2196F3',
    output: '#FF9800',
    decision: '#9C27B0',
    default: '#607D8B',
  }

  return colors[category || 'default'] || colors.default
}

export default SankeyChart
