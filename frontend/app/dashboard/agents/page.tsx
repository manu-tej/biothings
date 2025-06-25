'use client';

import { Plus, Filter, Download, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/atoms/Badge';
import { Button } from '@/components/ui/atoms/Button';
import { Card } from '@/components/ui/atoms/Card';
import { Select } from '@/components/ui/atoms/Select';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AgentCard } from '@/components/ui/molecules/AgentCard';
import { FilterPanel } from '@/components/ui/molecules/FilterPanel';
import { SearchBar } from '@/components/ui/molecules/SearchBar';
import { useDashboardStore, type Agent } from '@/lib/stores/dashboardStore';
import { useWebSocketStore } from '@/lib/stores/websocketStore';

export default function AgentsPage() {
  const {
    agents,
    selectedAgentId,
    selectAgent,
  } = useDashboardStore();

  const { connect, disconnect, getConnectionStatus } = useWebSocketStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const initializeAgentsPage = async () => {
      try {
        // Connect to agents WebSocket channel
        const connectionStatus = getConnectionStatus('agents');
        if (!connectionStatus || connectionStatus === 'disconnected') {
          connect('agents', process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws');
        }
      } catch (_error) {
        // TODO: Replace with proper logging service
      } finally {
        setIsLoading(false);
      }
    };

    initializeAgentsPage();

    return () => {
      disconnect('agents');
    };
  }, [connect, disconnect, getConnectionStatus]);

  // Convert Map to array for filtering and display
  const agentsArray = Array.from(agents.values());

  // Filter agents based on search query and filters
  const filteredAgents = agentsArray.filter((agent) => {
    const matchesSearch = !searchQuery || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesType = typeFilter === 'all' || agent.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Get unique types and statuses for filters
  const uniqueTypes = Array.from(new Set(agentsArray.map(agent => agent.type)));
  const uniqueStatuses = Array.from(new Set(agentsArray.map(agent => agent.status)));

  // Calculate summary stats
  const activeAgents = agentsArray.filter(agent => agent.status === 'active').length;
  const errorAgents = agentsArray.filter(agent => agent.status === 'error').length;
  const idleAgents = agentsArray.filter(agent => agent.status === 'idle').length;

  const handleAgentSelect = (agent: Agent) => {
    selectAgent(agent.id);
  };

  const handleCreateAgent = () => {
    // TODO: Open create agent modal/form
    // TODO: Implement create agent functionality
  };

  const handleExportAgents = () => {
    // TODO: Export agents data
    // TODO: Implement export agents functionality
  };

  const handleRefresh = () => {
    // TODO: Refresh agents data
    // TODO: Implement refresh agents functionality
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Agent Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage your AI agents
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            variant={getConnectionStatus('agents') === 'connected' ? 'success' : 'danger'}
            className="capitalize"
          >
            {getConnectionStatus('agents') === 'connected' ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            icon={<RefreshCw />}
          >
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportAgents}
            icon={<Download />}
          >
            Export
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleCreateAgent}
            icon={<Plus />}
          >
            New Agent
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <ErrorBoundary isolate showDetails={false}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {agentsArray.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Agents
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeAgents}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Active
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {idleAgents}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Idle
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {errorAgents}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Error
              </div>
            </div>
          </Card>
        </div>
      </ErrorBoundary>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <SearchBar
            placeholder="Search agents..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              ...uniqueStatuses.map(status => ({
                value: status,
                label: status.charAt(0).toUpperCase() + status.slice(1)
              }))
            ]}
          />
          
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'All Types' },
              ...uniqueTypes.map(type => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1)
              }))
            ]}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter />}
          >
            Filters
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <FilterPanel
            filters={[
              {
                id: 'lastActivity',
                label: 'Last Activity',
                type: 'date',
                placeholder: 'Select date...',
              },
              {
                id: 'cpuUsage',
                label: 'CPU Usage',
                type: 'range',
                placeholder: 'Enter CPU usage range...',
              },
              {
                id: 'memoryUsage',
                label: 'Memory Usage',
                type: 'range',
                placeholder: 'Enter memory usage range...',
              },
            ]}
            values={{}}
            onFilterChange={(_filterId: string, _value: any) => {
              // Filter changed
            }}
            onClearAll={() => {
              // Clear all filters
            }}
          />
        </Card>
      )}

      {/* Agents Grid */}
      <ErrorBoundary 
        isolate 
        showDetails={false}
        fallback={
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              Unable to display agents. Please refresh the page.
            </p>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No agents found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first agent to get started'
              }
            </p>
            {(!searchQuery && statusFilter === 'all' && typeFilter === 'all') && (
              <Button
                onClick={handleCreateAgent}
                icon={<Plus />}
                variant="primary"
              >
                Create Agent
              </Button>
            )}
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <ErrorBoundary
              key={agent.id}
              isolate
              showDetails={false}
              fallback={
                <Card className="p-4">
                  <p className="text-center text-gray-500">Unable to display agent</p>
                </Card>
              }
            >
              <AgentCard
                id={agent.id}
                name={agent.name}
                type={agent.type}
                status={{
                  status: agent.status,
                  lastSeen: agent.lastActivity,
                  uptime: agent.metrics.uptime,
                  tasksCompleted: agent.metrics.tasksCompleted,
                }}
                metrics={{
                  cpuUsage: agent.metrics.cpuUsage,
                  memoryUsage: agent.metrics.memoryUsage,
                }}
                tags={agent.capabilities}
                selected={selectedAgentId === agent.id}
                selectable={true}
                onSelect={() => handleAgentSelect(agent)}
                actions={{
                  onStart: () => {
                    // TODO: Implement start agent functionality
                  },
                  onStop: () => {
                    // TODO: Implement stop agent functionality
                  },
                  onView: () => handleAgentSelect(agent),
                }}
              />
            </ErrorBoundary>
          ))
        )}
        </div>
      </ErrorBoundary>

      {/* Results Info */}
      {filteredAgents.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {filteredAgents.length} of {agentsArray.length} agents
          </span>
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}