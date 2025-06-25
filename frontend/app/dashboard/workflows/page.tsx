'use client';

import { Plus, Download, RefreshCw, Play, Pause } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/atoms/Badge';
import { Button } from '@/components/ui/atoms/Button';
import { Card } from '@/components/ui/atoms/Card';
import { SearchBar } from '@/components/ui/molecules/SearchBar';
import { WorkflowCard } from '@/components/ui/molecules/WorkflowCard';
import { useDashboardStore } from '@/lib/stores/dashboardStore';
import { WorkflowStatus } from '@/lib/stores/dashboardStore';
import { useWebSocketStore } from '@/lib/stores/websocketStore';

export default function WorkflowsPage() {
  const {
    workflows,
    selectedWorkflowId,
    selectWorkflow,
  } = useDashboardStore();

  const { connect, disconnect, getConnectionStatus } = useWebSocketStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const initializeWorkflowsPage = async () => {
      try {
        // Connect to workflows WebSocket channel
        const connectionStatus = getConnectionStatus('workflows');
        if (!connectionStatus || connectionStatus === 'disconnected') {
          connect('workflows', process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws');
        }
      } catch (error) {
        console.error('Failed to initialize workflows page:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWorkflowsPage();

    return () => {
      disconnect('workflows');
    };
  }, [connect, disconnect, getConnectionStatus]);

  // Convert Map to array for filtering and display
  const workflowsArray = Array.from(workflows.values());

  // Filter workflows based on search query and status
  const filteredWorkflows = workflowsArray.filter((workflow) => {
    const matchesSearch = !searchQuery || 
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const runningWorkflows = workflowsArray.filter(w => w.status === 'running').length;
  const completedWorkflows = workflowsArray.filter(w => w.status === 'completed').length;
  const failedWorkflows = workflowsArray.filter(w => w.status === 'failed').length;
  const pendingWorkflows = workflowsArray.filter(w => w.status === 'pending').length;

  const handleWorkflowSelect = (workflow: WorkflowStatus) => {
    selectWorkflow(workflow.id);
  };

  const handleCreateWorkflow = () => {
    console.log('Create new workflow');
  };

  const handleStartAll = () => {
    console.log('Start all pending workflows');
  };

  const handlePauseAll = () => {
    console.log('Pause all running workflows');
  };

  const handleExportWorkflows = () => {
    console.log('Export workflows data');
  };

  const handleRefresh = () => {
    console.log('Refresh workflows');
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
            Workflow Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage your automated workflows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            variant={getConnectionStatus('workflows') === 'connected' ? 'success' : 'danger'}
            className="capitalize"
          >
            {getConnectionStatus('workflows') === 'connected' ? 'Connected' : 'Disconnected'}
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
            onClick={handleExportWorkflows}
            icon={<Download />}
          >
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePauseAll}
            icon={<Pause />}
            disabled={runningWorkflows === 0}
          >
            Pause All
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleStartAll}
            icon={<Play />}
            disabled={pendingWorkflows === 0}
          >
            Start All
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleCreateWorkflow}
            icon={<Plus />}
          >
            New Workflow
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {workflowsArray.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Workflows
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {runningWorkflows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Running
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedWorkflows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Completed
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {failedWorkflows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Failed
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <SearchBar
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredWorkflows.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⚡</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No workflows found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first workflow to get started'
              }
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <Button
                onClick={handleCreateWorkflow}
                icon={<Plus />}
                variant="primary"
              >
                Create Workflow
              </Button>
            )}
          </div>
        ) : (
          filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              id={workflow.id}
              name={workflow.name}
              status={{
                status: workflow.status === 'pending' ? 'draft' :
                        workflow.status === 'running' ? 'running' :
                        workflow.status === 'completed' ? 'completed' :
                        workflow.status === 'failed' ? 'failed' : 'cancelled',
                progress: workflow.progress,
                currentStep: workflow.currentStep,
                totalSteps: 10, // Mock value
                completedSteps: Math.floor((workflow.progress / 100) * 10),
                startTime: workflow.startedAt,
                estimatedCompletion: workflow.estimatedCompletion,
              }}
              selected={selectedWorkflowId === workflow.id}
              selectable={true}
              onSelect={() => handleWorkflowSelect(workflow)}
              actions={{
                onStart: workflow.status === 'pending' ? () => {
                  console.log(`Start workflow ${workflow.id}`);
                } : undefined,
                onPause: workflow.status === 'running' ? () => {
                  console.log(`Pause workflow ${workflow.id}`);
                } : undefined,
                onStop: (workflow.status === 'running' || workflow.status === 'pending') ? () => {
                  console.log(`Stop workflow ${workflow.id}`);
                } : undefined,
                onView: () => handleWorkflowSelect(workflow),
              }}
            />
          ))
        )}
      </div>

      {/* Results Info */}
      {filteredWorkflows.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {filteredWorkflows.length} of {workflowsArray.length} workflows
          </span>
          {(searchQuery || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
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