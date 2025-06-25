'use client';

import { clsx } from 'clsx';
import { 
  ChevronRight, 
  ChevronDown, 
  Users, 
  Search,
  Filter,
  MoreHorizontal,
  Maximize2,
  Minimize2
} from 'lucide-react';
import React, { forwardRef, useState, useMemo, useCallback } from 'react';

import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Checkbox } from '../atoms/Checkbox';
import { Input } from '../atoms/Input';
import { AgentCard, AgentCardProps } from '../molecules/AgentCard';
// import { SearchBar } from '../molecules/SearchBar';

export interface HierarchyNode {
  id: string;
  name: string;
  type: 'group' | 'agent';
  level: number;
  parentId?: string;
  children?: HierarchyNode[];
  agent?: Omit<AgentCardProps, 'id' | 'name'>;
  metadata?: {
    description?: string;
    agentCount?: number;
    status?: 'active' | 'inactive' | 'mixed';
  };
}

export interface AgentHierarchyProps {
  nodes: HierarchyNode[];
  onNodeSelect?: (nodeId: string, selected: boolean) => void;
  onNodeExpand?: (nodeId: string, expanded: boolean) => void;
  onAgentAction?: (agentId: string, action: string) => void;
  selectedNodes?: Set<string>;
  expandedNodes?: Set<string>;
  searchable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  virtualScrolling?: boolean;
  maxHeight?: number;
  compactMode?: boolean;
  showMetrics?: boolean;
  groupActions?: {
    onGroupAction?: (groupId: string, action: string) => void;
    availableActions?: string[];
  };
  className?: string;
  testId?: string;
}

const virtualizedItemHeight = {
  agent: { compact: 80, normal: 120, detailed: 160 },
  group: { compact: 50, normal: 60, detailed: 70 },
};

export const AgentHierarchy = forwardRef<HTMLDivElement, AgentHierarchyProps>(
  (
    {
      nodes,
      onNodeSelect,
      onNodeExpand,
      onAgentAction,
      selectedNodes = new Set(),
      expandedNodes = new Set(),
      searchable = true,
      filterable = true,
      selectable = true,
      virtualScrolling = true,
      maxHeight = 600,
      compactMode = false,
      showMetrics = true,
      groupActions,
      className,
      testId,
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<string[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Flatten hierarchy for virtual scrolling and filtering
    const flattenedNodes = useMemo(() => {
      const flatten = (nodes: HierarchyNode[], level = 0): HierarchyNode[] => {
        const result: HierarchyNode[] = [];
        
        for (const node of nodes) {
          result.push({ ...node, level });
          
          if (node.type === 'group' && expandedNodes.has(node.id) && node.children) {
            result.push(...flatten(node.children, level + 1));
          }
        }
        
        return result;
      };
      
      return flatten(nodes);
    }, [nodes, expandedNodes]);

    // Filter nodes based on search and filters
    const filteredNodes = useMemo(() => {
      let filtered = flattenedNodes;

      // Search filter
      if (searchQuery) {
        filtered = filtered.filter(node => 
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (node.agent?.description?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      // Status filter
      if (filterStatus.length > 0) {
        filtered = filtered.filter(node => {
          if (node.type === 'agent' && node.agent?.status) {
            return filterStatus.includes(node.agent.status.status);
          }
          if (node.type === 'group' && node.metadata?.status) {
            return filterStatus.includes(node.metadata.status);
          }
          return true;
        });
      }

      // Type filter
      if (filterType.length > 0) {
        filtered = filtered.filter(node => {
          if (node.type === 'agent' && node.agent?.type) {
            return filterType.includes(node.agent.type);
          }
          return node.type === 'group' ? filterType.includes('group') : true;
        });
      }

      return filtered;
    }, [flattenedNodes, searchQuery, filterStatus, filterType]);

    const handleNodeToggle = useCallback((nodeId: string) => {
      const isExpanded = expandedNodes.has(nodeId);
      onNodeExpand?.(nodeId, !isExpanded);
    }, [expandedNodes, onNodeExpand]);

    const handleNodeSelect = useCallback((nodeId: string) => {
      const isSelected = selectedNodes.has(nodeId);
      onNodeSelect?.(nodeId, !isSelected);
    }, [selectedNodes, onNodeSelect]);

    const renderGroupNode = (node: HierarchyNode) => {
      const isExpanded = expandedNodes.has(node.id);
      const isSelected = selectedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div
          key={node.id}
          className={clsx(
            'flex items-center gap-2 py-2 px-3 rounded-lg transition-colors',
            'hover:bg-gray-50 dark:hover:bg-gray-800/50',
            isSelected && 'bg-blue-50 dark:bg-blue-900/20',
            compactMode ? 'h-12' : 'h-15'
          )}
          style={{ paddingLeft: `${node.level * 20 + 12}px` }}
        >
          {hasChildren && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => handleNodeToggle(node.id)}
              icon={isExpanded ? <ChevronDown /> : <ChevronRight />}
              className="p-1"
            />
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          {selectable && (
            <Checkbox
              checked={isSelected}
              onChange={() => handleNodeSelect(node.id)}
              checkboxSize="sm"
            />
          )}
          
          <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {node.name}
              </h4>
              {node.metadata?.agentCount !== undefined && (
                <Badge size="xs" variant="secondary">
                  {node.metadata.agentCount}
                </Badge>
              )}
              {node.metadata?.status && (
                <Badge
                  size="xs"
                  variant={
                    node.metadata.status === 'active' ? 'success' :
                    node.metadata.status === 'inactive' ? 'secondary' : 'warning'
                  }
                  dot
                >
                  {node.metadata.status}
                </Badge>
              )}
            </div>
            {node.metadata?.description && !compactMode && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {node.metadata.description}
              </p>
            )}
          </div>
          
          {groupActions && (
            <Button
              size="xs"
              variant="ghost"
              icon={<MoreHorizontal />}
              onClick={() => groupActions.onGroupAction?.(node.id, 'menu')}
            />
          )}
        </div>
      );
    };

    const renderAgentNode = (node: HierarchyNode) => {
      if (!node.agent) return null;
      
      const isSelected = selectedNodes.has(node.id);
      
      return (
        <div
          key={node.id}
          style={{ paddingLeft: `${node.level * 20}px` }}
          className="py-1"
        >
          <AgentCard
            id={node.id}
            name={node.name}
            {...node.agent}
            variant={compactMode ? 'compact' : 'default'}
            size={compactMode ? 'sm' : 'md'}
            selectable={selectable}
            selected={isSelected}
            onSelect={() => handleNodeSelect(node.id)}
            actions={{
              ...node.agent.actions,
              onStart: () => onAgentAction?.(node.id, 'start'),
              onPause: () => onAgentAction?.(node.id, 'pause'),
              onStop: () => onAgentAction?.(node.id, 'stop'),
              onSettings: () => onAgentAction?.(node.id, 'settings'),
              onView: () => onAgentAction?.(node.id, 'view'),
            }}
          />
        </div>
      );
    };

    const renderNode = (node: HierarchyNode) => {
      return node.type === 'group' ? renderGroupNode(node) : renderAgentNode(node);
    };

    const containerHeight = isFullscreen ? '100vh' : maxHeight;

    return (
      <Card
        ref={ref}
        variant="default"
        padding="none"
        className={clsx(
          'flex flex-col',
          isFullscreen && 'fixed inset-0 z-50',
          className
        )}
        testId={testId}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Agent Hierarchy
              </h2>
              <Badge size="sm" variant="secondary">
                {filteredNodes.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {selectable && selectedNodes.size > 0 && (
                <Badge size="sm" variant="primary">
                  {selectedNodes.size} selected
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
                icon={isFullscreen ? <Minimize2 /> : <Maximize2 />}
              />
            </div>
          </div>
          
          {(searchable || filterable) && (
            <div className="flex gap-2">
              {searchable && (
                <div className="flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search agents and groups..."
                    inputSize="sm"
                    icon={<Search />}
                    clearable
                    onClear={() => setSearchQuery('')}
                  />
                </div>
              )}
              {filterable && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Filter />}
                >
                  Filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-auto"
          style={{ maxHeight: containerHeight }}
        >
          {filteredNodes.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500 dark:text-gray-400">
                No agents or groups found
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredNodes.map(renderNode)}
            </div>
          )}
        </div>

        {/* Footer */}
        {(selectable && selectedNodes.size > 0) && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedNodes.size} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Bulk Actions
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => selectedNodes.forEach(id => onNodeSelect?.(id, false))}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }
);

AgentHierarchy.displayName = 'AgentHierarchy';