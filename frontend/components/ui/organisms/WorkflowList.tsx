'use client';

import React, { forwardRef, useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { 
  Workflow, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  RefreshCw,
  Download,
  MoreHorizontal,
  Eye,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select, SelectOption } from '../atoms/Select';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { Checkbox } from '../atoms/Checkbox';
import { WorkflowCard, WorkflowCardProps } from '../molecules/WorkflowCard';

export interface WorkflowListItem extends Omit<WorkflowCardProps, 'onAction'> {
  id: string;
  lastModified?: Date;
  createdBy?: string;
  tags?: string[];
}

export interface WorkflowListProps {
  workflows: WorkflowListItem[];
  loading?: boolean;
  error?: string | null;
  onWorkflowAction?: (workflowId: string, action: string) => void;
  onRefresh?: () => void;
  onExport?: (workflowIds: string[]) => void;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  virtualScrolling?: boolean;
  itemHeight?: number;
  maxHeight?: number;
  pageSize?: number;
  selectedWorkflows?: Set<string>;
  onSelectionChange?: (workflowIds: Set<string>) => void;
  emptyState?: React.ReactNode;
  className?: string;
  testId?: string;
}

type SortField = 'name' | 'status' | 'lastModified' | 'createdBy' | 'progress';
type SortDirection = 'asc' | 'desc';

const statusOptions: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'paused', label: 'Paused' },
  { value: 'pending', label: 'Pending' },
];

const sortOptions: SelectOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'lastModified', label: 'Last Modified' },
  { value: 'createdBy', label: 'Created By' },
  { value: 'progress', label: 'Progress' },
];

export const WorkflowList = forwardRef<HTMLDivElement, WorkflowListProps>(
  (
    {
      workflows,
      loading = false,
      error = null,
      onWorkflowAction,
      onRefresh,
      onExport,
      searchable = true,
      filterable = true,
      sortable = true,
      selectable = true,
      virtualScrolling = false,
      itemHeight = 120,
      maxHeight = 600,
      pageSize = 50,
      selectedWorkflows = new Set(),
      onSelectionChange,
      emptyState,
      className,
      testId,
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortField, setSortField] = useState<SortField>('lastModified');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(0);

    // Filter and sort workflows
    const processedWorkflows = useMemo(() => {
      let filtered = workflows;

      // Search filter
      if (searchQuery) {
        filtered = filtered.filter(workflow => 
          workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workflow.createdBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workflow.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      // Status filter
      if (statusFilter) {
        filtered = filtered.filter(workflow => workflow.status.status === statusFilter);
      }

      // Sort
      if (sortable) {
        filtered.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (sortField) {
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'status':
              aValue = a.status;
              bValue = b.status;
              break;
            case 'lastModified':
              aValue = a.lastModified?.getTime() || 0;
              bValue = b.lastModified?.getTime() || 0;
              break;
            case 'createdBy':
              aValue = a.createdBy?.toLowerCase() || '';
              bValue = b.createdBy?.toLowerCase() || '';
              break;
            case 'progress':
              aValue = a.status.progress || 0;
              bValue = b.status.progress || 0;
              break;
            default:
              return 0;
          }

          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }

      return filtered;
    }, [workflows, searchQuery, statusFilter, sortField, sortDirection]);

    // Pagination
    const paginatedWorkflows = useMemo(() => {
      if (virtualScrolling) return processedWorkflows;
      
      const start = currentPage * pageSize;
      const end = start + pageSize;
      return processedWorkflows.slice(start, end);
    }, [processedWorkflows, currentPage, pageSize, virtualScrolling]);

    const totalPages = Math.ceil(processedWorkflows.length / pageSize);

    const handleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };

    const handleSelectAll = useCallback((checked: boolean) => {
      if (checked) {
        const allIds = new Set([...Array.from(selectedWorkflows), ...paginatedWorkflows.map(w => w.id)]);
        onSelectionChange?.(allIds);
      } else {
        const remainingIds = new Set(Array.from(selectedWorkflows).filter(id => 
          !paginatedWorkflows.some(w => w.id === id)
        ));
        onSelectionChange?.(remainingIds);
      }
    }, [selectedWorkflows, paginatedWorkflows, onSelectionChange]);

    const handleSelectWorkflow = useCallback((workflowId: string, checked: boolean) => {
      const newSelection = new Set(selectedWorkflows);
      if (checked) {
        newSelection.add(workflowId);
      } else {
        newSelection.delete(workflowId);
      }
      onSelectionChange?.(newSelection);
    }, [selectedWorkflows, onSelectionChange]);

    const allCurrentPageSelected = paginatedWorkflows.length > 0 && 
      paginatedWorkflows.every(w => selectedWorkflows.has(w.id));
    const someCurrentPageSelected = paginatedWorkflows.some(w => selectedWorkflows.has(w.id));

    const renderWorkflowItem = useCallback((workflow: WorkflowListItem) => {
      const isSelected = selectedWorkflows.has(workflow.id);
      
      return (
        <div key={workflow.id} className="p-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
          <div className="flex items-center gap-3">
            {selectable && (
              <Checkbox
                checked={isSelected}
                onChange={(e) => handleSelectWorkflow(workflow.id, e.target.checked)}
                checkboxSize="sm"
              />
            )}
            <div className="flex-1">
              <WorkflowCard
                {...workflow}
                variant="compact"
                actions={{
                  onStart: () => onWorkflowAction?.(workflow.id, 'start'),
                  onPause: () => onWorkflowAction?.(workflow.id, 'pause'),
                  onStop: () => onWorkflowAction?.(workflow.id, 'stop'),
                  onView: () => onWorkflowAction?.(workflow.id, 'view'),
                  onEdit: () => onWorkflowAction?.(workflow.id, 'edit'),
                  onDelete: () => onWorkflowAction?.(workflow.id, 'delete'),
                }}
                className="border-0 shadow-none"
              />
            </div>
          </div>
        </div>
      );
    }, [selectable, selectedWorkflows, handleSelectWorkflow, onWorkflowAction]);

    const renderHeader = () => (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Workflows
            </h2>
            <Badge size="sm" variant="secondary">
              {processedWorkflows.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {selectedWorkflows.size > 0 && (
              <>
                <Badge size="sm" variant="primary">
                  {selectedWorkflows.size} selected
                </Badge>
                {onExport && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onExport(Array.from(selectedWorkflows))}
                    icon={<Download />}
                  >
                    Export
                  </Button>
                )}
              </>
            )}
            {onRefresh && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefresh}
                icon={<RefreshCw className={loading ? 'animate-spin' : ''} />}
                disabled={loading}
              />
            )}
          </div>
        </div>

        {/* Search and Filters */}
        {(searchable || filterable || sortable) && (
          <div className="flex gap-3">
            {searchable && (
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workflows..."
                  inputSize="sm"
                  icon={<Search />}
                  clearable
                  onClear={() => setSearchQuery('')}
                />
              </div>
            )}
            {filterable && (
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
                selectSize="sm"
                className="w-48"
              />
            )}
            {sortable && (
              <div className="flex items-center gap-1">
                <Select
                  options={sortOptions}
                  value={sortField}
                  onChange={(value) => setSortField(value as SortField)}
                  selectSize="sm"
                  className="w-40"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  icon={sortDirection === 'asc' ? <SortAsc /> : <SortDesc />}
                />
              </div>
            )}
          </div>
        )}

        {/* Bulk Selection */}
        {selectable && paginatedWorkflows.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Checkbox
              checked={allCurrentPageSelected}
              indeterminate={someCurrentPageSelected && !allCurrentPageSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              checkboxSize="sm"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Select all on page
            </span>
          </div>
        )}
      </div>
    );

    const renderContent = () => {
      if (error) {
        return (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-2">Error loading workflows</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
              {onRefresh && (
                <Button size="sm" variant="outline" onClick={onRefresh} className="mt-2">
                  Try Again
                </Button>
              )}
            </div>
          </div>
        );
      }

      if (loading && workflows.length === 0) {
        return (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-gray-600 dark:text-gray-400">Loading workflows...</span>
            </div>
          </div>
        );
      }

      if (processedWorkflows.length === 0) {
        return (
          <div className="flex items-center justify-center h-32">
            {emptyState || (
              <div className="text-center">
                <Workflow className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery || statusFilter ? 'No workflows match your filters' : 'No workflows found'}
                </p>
              </div>
            )}
          </div>
        );
      }

      return (
        <div 
          className="overflow-auto"
          style={{ maxHeight: virtualScrolling ? maxHeight : undefined }}
        >
          {paginatedWorkflows.map(renderWorkflowItem)}
        </div>
      );
    };

    const renderPagination = () => {
      if (virtualScrolling || totalPages <= 1) return null;

      return (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, processedWorkflows.length)} of {processedWorkflows.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <Card
        ref={ref}
        variant="default"
        padding="none"
        className={className}
        testId={testId}
      >
        {renderHeader()}
        {renderContent()}
        {renderPagination()}
      </Card>
    );
  }
);

WorkflowList.displayName = 'WorkflowList';