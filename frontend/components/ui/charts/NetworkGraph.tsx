'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

export interface NetworkNode {
  id: string;
  name: string;
  category?: string;
  value?: number;
  symbolSize?: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  value?: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

interface NetworkGraphProps {
  data: NetworkData;
  width?: number;
  height?: number;
  className?: string;
  layout?: 'force' | 'circular' | 'none';
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  width = 800,
  height = 600,
  className = '',
  layout = 'force',
  onNodeClick,
  onLinkClick,
}) => {
  const option = {
    title: {
      text: 'Agent Relationships',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        if (params.dataType === 'node') {
          return `${params.data.name}<br/>Category: ${params.data.category || 'Unknown'}<br/>Value: ${params.data.value || 0}`;
        } else if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}${params.data.value ? `<br/>Weight: ${params.data.value}` : ''}`;
        }
        return '';
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['executive', 'manager', 'worker', 'analyzer', 'coordinator', 'specialist'],
    },
    series: [
      {
        name: 'Agent Network',
        type: 'graph',
        layout: layout,
        data: data.nodes.map(node => ({
          id: node.id,
          name: node.name,
          category: node.category,
          value: node.value,
          symbolSize: node.symbolSize || (node.value ? Math.sqrt(node.value) * 2 + 10 : 20),
          itemStyle: {
            color: getCategoryColor(node.category),
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 12,
            color: '#333',
          },
        })),
        links: data.links.map(link => ({
          source: link.source,
          target: link.target,
          value: link.value,
          lineStyle: {
            color: '#aaa',
            width: link.value ? Math.sqrt(link.value) + 1 : 2,
            opacity: 0.6,
          },
        })),
        categories: [
          { name: 'executive', itemStyle: { color: '#e74c3c' } },
          { name: 'manager', itemStyle: { color: '#f39c12' } },
          { name: 'worker', itemStyle: { color: '#3498db' } },
          { name: 'analyzer', itemStyle: { color: '#9b59b6' } },
          { name: 'coordinator', itemStyle: { color: '#2ecc71' } },
          { name: 'specialist', itemStyle: { color: '#e67e22' } },
        ],
        roam: true,
        focusNodeAdjacency: true,
        force: layout === 'force' ? {
          repulsion: 1000,
          gravity: 0.1,
          edgeLength: 150,
          layoutAnimation: true,
        } : undefined,
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 4,
          },
        },
        animationDuration: 1500,
        animationEasingUpdate: 'quinticInOut',
      },
    ],
  };

  const handleEvents = {
    click: (params: any) => {
      if (params.dataType === 'node' && onNodeClick) {
        const originalNode = data.nodes.find(node => node.id === params.data.id);
        if (originalNode) {
          onNodeClick(originalNode);
        }
      } else if (params.dataType === 'edge' && onLinkClick) {
        const originalLink = data.links.find(
          link => link.source === params.data.source && link.target === params.data.target
        );
        if (originalLink) {
          onLinkClick(originalLink);
        }
      }
    },
  };

  return (
    <div className={`network-graph ${className}`}>
      <ReactECharts
        option={option}
        style={{ width: width, height: height }}
        onEvents={handleEvents}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    executive: '#e74c3c',
    manager: '#f39c12',
    worker: '#3498db',
    analyzer: '#9b59b6',
    coordinator: '#2ecc71',
    specialist: '#e67e22',
    default: '#95a5a6',
  };
  
  return colors[category || 'default'] || colors.default;
}

// Helper function to generate sample agent network data
export const generateAgentNetworkData = (agents: any[]): NetworkData => {
  const nodes: NetworkNode[] = agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    category: agent.type,
    value: agent.metrics?.tasksCompleted || Math.floor(Math.random() * 100),
    symbolSize: 20 + (agent.metrics?.tasksCompleted || 0) / 5,
  }));

  const links: NetworkLink[] = [];
  
  // Generate realistic relationships
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      
      // Create connections based on categories and random factors
      const connectionProbability = getConnectionProbability(node1.category, node2.category);
      
      if (Math.random() < connectionProbability) {
        const strength = Math.floor(Math.random() * 10) + 1;
        links.push({
          source: node1.id,
          target: node2.id,
          value: strength,
        });
      }
    }
  }

  return { nodes, links };
};

function getConnectionProbability(category1?: string, category2?: string): number {
  const connections: Record<string, Record<string, number>> = {
    executive: { manager: 0.8, coordinator: 0.6, worker: 0.3, analyzer: 0.4, specialist: 0.2 },
    manager: { executive: 0.8, worker: 0.9, coordinator: 0.7, analyzer: 0.5, specialist: 0.4 },
    coordinator: { executive: 0.6, manager: 0.7, worker: 0.8, analyzer: 0.6, specialist: 0.5 },
    worker: { manager: 0.9, coordinator: 0.8, worker: 0.4, analyzer: 0.3, specialist: 0.2 },
    analyzer: { executive: 0.4, manager: 0.5, coordinator: 0.6, worker: 0.3, specialist: 0.7 },
    specialist: { executive: 0.2, manager: 0.4, coordinator: 0.5, analyzer: 0.7, specialist: 0.3 },
  };

  const cat1 = category1 || 'worker';
  const cat2 = category2 || 'worker';
  
  return connections[cat1]?.[cat2] || connections[cat2]?.[cat1] || 0.2;
}

export default NetworkGraph;