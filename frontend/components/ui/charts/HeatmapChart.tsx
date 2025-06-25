'use client';

import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import React from 'react';

export interface HeatmapDataPoint {
  x: number | string;
  y: number | string;
  value: number;
  label?: string;
}

export interface HeatmapConfig {
  title?: string;
  xAxisLabels: string[];
  yAxisLabels: string[];
  colorScheme?: 'default' | 'blue' | 'green' | 'red' | 'purple';
  showValues?: boolean;
  minValue?: number;
  maxValue?: number;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  config: HeatmapConfig;
  width?: number;
  height?: number;
  className?: string;
  onCellClick?: (dataPoint: HeatmapDataPoint) => void;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  config,
  width = 800,
  height = 400,
  className = '',
  onCellClick,
}) => {
  // Transform data for ECharts format
  const transformedData = data.map(point => [
    point.x,
    point.y,
    point.value,
  ]);

  // Calculate min and max values if not provided
  const values = data.map(d => d.value);
  const minValue = config.minValue ?? Math.min(...values);
  const maxValue = config.maxValue ?? Math.max(...values);

  const colorSchemes = {
    default: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
    blue: ['#08519c', '#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#deebf7', '#f7fbff'],
    green: ['#00441b', '#006d2c', '#238b45', '#41ab5d', '#74c476', '#a1d99b', '#c7e9c0', '#e5f5e0', '#f7fcf5'],
    red: ['#67000d', '#a50f15', '#cb181d', '#ef3b2c', '#fb6a4a', '#fc9272', '#fcbba1', '#fee0d2', '#fff5f0'],
    purple: ['#3f007d', '#54278f', '#6a51a3', '#807dba', '#9e9ac8', '#bcbddc', '#dadaeb', '#efedf5', '#fcfbfd'],
  };

  const option: EChartsOption = {
    title: config.title ? {
      text: config.title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    } : undefined,
    tooltip: {
      position: 'top',
      formatter: function(params: any) {
        const [x, y, value] = params.data;
        const dataPoint = data.find(d => d.x === x && d.y === y);
        return `${config.xAxisLabels[x]} - ${config.yAxisLabels[y]}<br/>Value: ${value}${dataPoint?.label ? `<br/>${dataPoint.label}` : ''}`;
      },
    },
    grid: {
      height: '50%',
      top: config.title ? '15%' : '10%',
      left: '15%',
      right: '5%',
    },
    xAxis: {
      type: 'category',
      data: config.xAxisLabels,
      splitArea: {
        show: true,
      },
      axisLabel: {
        rotate: config.xAxisLabels.some(label => label.length > 8) ? 45 : 0,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'category',
      data: config.yAxisLabels,
      splitArea: {
        show: true,
      },
      axisLabel: {
        fontSize: 11,
      },
    },
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '10%',
      inRange: {
        color: colorSchemes[config.colorScheme || 'default'],
      },
      textStyle: {
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Heatmap',
        type: 'heatmap',
        data: transformedData,
        label: {
          show: config.showValues || false,
          fontSize: 10,
          color: '#000',
          formatter: function(params: any) {
            return params.data[2].toFixed(1);
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
    animation: true,
    animationDuration: 1000,
  };

  const handleEvents = {
    click: (params: any) => {
      if (onCellClick) {
        const [x, y, value] = params.data;
        const dataPoint = data.find(d => d.x === x && d.y === y);
        if (dataPoint) {
          onCellClick(dataPoint);
        }
      }
    },
  };

  return (
    <div className={`heatmap-chart ${className}`}>
      <ReactECharts
        option={option}
        style={{ width: width, height: height }}
        onEvents={handleEvents}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

// Helper function to generate sample agent activity data
export const generateAgentActivityData = (agents: string[], timeSlots: string[]): HeatmapDataPoint[] => {
  const data: HeatmapDataPoint[] = [];
  
  agents.forEach((agent, agentIndex) => {
    timeSlots.forEach((timeSlot, timeIndex) => {
      // Generate realistic activity pattern
      const baseActivity = Math.random() * 100;
      const timeMultiplier = getTimeMultiplier(timeIndex, timeSlots.length);
      const agentMultiplier = getAgentMultiplier(agentIndex);
      
      const value = Math.round(baseActivity * timeMultiplier * agentMultiplier);
      
      data.push({
        x: timeIndex,
        y: agentIndex,
        value: value,
        label: `${agent} activity at ${timeSlot}`,
      });
    });
  });
  
  return data;
};

function getTimeMultiplier(timeIndex: number, totalSlots: number): number {
  // Create a pattern that simulates typical work hours (higher activity during day)
  const hourOfDay = (timeIndex / totalSlots) * 24;
  
  if (hourOfDay >= 9 && hourOfDay <= 17) {
    return 0.8 + Math.random() * 0.4; // High activity during work hours
  } else if (hourOfDay >= 7 && hourOfDay <= 9 || hourOfDay >= 17 && hourOfDay <= 20) {
    return 0.4 + Math.random() * 0.4; // Medium activity in transition hours
  } else {
    return 0.1 + Math.random() * 0.3; // Low activity during night/early morning
  }
}

function getAgentMultiplier(agentIndex: number): number {
  // Different agents have different activity levels
  const patterns = [1.0, 0.8, 1.2, 0.9, 1.1, 0.7, 1.3];
  return patterns[agentIndex % patterns.length];
}

export default HeatmapChart;