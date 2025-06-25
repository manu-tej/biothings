'use client';

import React, { useState, useMemo, useCallback, forwardRef } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, MoreHorizontal, Filter, Download } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Checkbox } from '../atoms/Checkbox';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';

export interface DataTableColumn<T = any> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onRowSelect?: (rowId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  onFilter?: (columnId: string, value: string) => void;
  onRowClick?: (row: T, index: number) => void;
  getRowId?: (row: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
  testId?: string;
  virtualized?: boolean;
  rowHeight?: number;
  maxHeight?: string | number;
}

interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

export const DataTable = forwardRef<HTMLDivElement, DataTableProps>(
  (
    {
      data,
      columns,
      loading = false,
      sortable = true,
      filterable = false,
      selectable = false,
      selectedRows = new Set(),
      onRowSelect,
      onSelectAll,
      onSort,
      onFilter,
      onRowClick,
      getRowId = (row, index) => index.toString(),
      emptyMessage = 'No data available',
      className,
      testId,
      virtualized = false,
      rowHeight = 52,
      maxHeight = '400px',
    },
    ref
  ) => {
    const [sortState, setSortState] = useState<SortState | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});

    const sortedAndFilteredData = useMemo(() => {
      let result = [...data];

      // Apply filters
      if (Object.keys(filters).length > 0) {
        result = result.filter(row => {
          return Object.entries(filters).every(([columnId, filterValue]) => {
            if (!filterValue) return true;
            
            const column = columns.find(col => col.id === columnId);
            if (!column) return true;

            let cellValue;
            if (column.accessorFn) {
              cellValue = column.accessorFn(row);
            } else if (column.accessorKey) {
              cellValue = row[column.accessorKey];
            } else {
              return true;
            }

            return String(cellValue || '')
              .toLowerCase()
              .includes(filterValue.toLowerCase());
          });
        });
      }

      // Apply sorting
      if (sortState) {
        const column = columns.find(col => col.id === sortState.columnId);
        if (column) {
          result.sort((a, b) => {
            let aValue, bValue;
            
            if (column.accessorFn) {
              aValue = column.accessorFn(a);
              bValue = column.accessorFn(b);
            } else if (column.accessorKey) {
              aValue = a[column.accessorKey];
              bValue = b[column.accessorKey];
            } else {
              return 0;
            }

            // Handle null/undefined values
            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return sortState.direction === 'asc' ? -1 : 1;
            if (bValue == null) return sortState.direction === 'asc' ? 1 : -1;

            // Compare values
            if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
      }

      return result;
    }, [data, sortState, filters, columns]);

    const handleSort = useCallback((columnId: string) => {
      const column = columns.find(col => col.id === columnId);
      if (!column?.sortable && !sortable) return;

      const newDirection: 'asc' | 'desc' =
        sortState?.columnId === columnId && sortState.direction === 'asc'
          ? 'desc'
          : 'asc';
      
      const newSortState: SortState = { columnId, direction: newDirection };
      setSortState(newSortState);
      onSort?.(columnId, newDirection);
    }, [sortState, sortable, columns, onSort]);

    const handleFilter = useCallback((columnId: string, value: string) => {
      setFilters(prev => ({
        ...prev,
        [columnId]: value
      }));
      onFilter?.(columnId, value);
    }, [onFilter]);

    const handleSelectAll = useCallback((selected: boolean) => {
      onSelectAll?.(selected);
    }, [onSelectAll]);

    const handleRowSelect = useCallback((rowId: string, selected: boolean) => {
      onRowSelect?.(rowId, selected);
    }, [onRowSelect]);

    const getCellValue = useCallback((row: any, column: DataTableColumn) => {
      if (column.accessorFn) {
        return column.accessorFn(row);
      } else if (column.accessorKey) {
        return row[column.accessorKey];
      }
      return '';
    }, []);

    const renderCell = useCallback((value: any, row: any, column: DataTableColumn) => {
      if (column.cell) {
        return column.cell(value, row);
      }
      
      if (value == null) return '';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object') return JSON.stringify(value);
      
      return String(value);
    }, []);

    const allSelected = data.length > 0 && data.every((row, index) => 
      selectedRows.has(getRowId(row, index))
    );
    const someSelected = data.some((row, index) => 
      selectedRows.has(getRowId(row, index))
    );

    if (loading) {
      return (
        <div className={clsx('flex items-center justify-center p-8', className)}>
          <Spinner size="lg" />
        </div>
      );
    }

    return (
      <div ref={ref} className={clsx('w-full', className)} data-testid={testId}>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full bg-white dark:bg-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {selectable && (
                    <th className="w-12 px-4 py-3">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={!allSelected && someSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  {columns.map(column => (
                    <th
                      key={column.id}
                      className={clsx(
                        'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        (column.sortable || sortable) && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                      onClick={() => handleSort(column.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.header}</span>
                        {(column.sortable || sortable) && (
                          <div className="flex flex-col">
                            <ChevronUp 
                              className={clsx(
                                'w-3 h-3 -mb-1',
                                sortState?.columnId === column.id && sortState.direction === 'asc'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              )}
                            />
                            <ChevronDown 
                              className={clsx(
                                'w-3 h-3',
                                sortState?.columnId === column.id && sortState.direction === 'desc'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
                {filterable && (
                  <tr className="bg-gray-25 dark:bg-gray-850">
                    {selectable && <th className="w-12 px-4 py-2"></th>}
                    {columns.map(column => (
                      <th key={`filter-${column.id}`} className="px-4 py-2">
                        {(column.filterable !== false) && (
                          <Input
                            placeholder={`Filter ${column.header.toLowerCase()}...`}
                            value={filters[column.id] || ''}
                            onChange={(e) => handleFilter(column.id, e.target.value)}
                            inputSize="sm"
                            icon={<Filter />}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedAndFilteredData.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={columns.length + (selectable ? 1 : 0)} 
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredData.map((row, index) => {
                    const rowId = getRowId(row, index);
                    const isSelected = selectedRows.has(rowId);
                    
                    return (
                      <tr
                        key={rowId}
                        className={clsx(
                          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                          isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                          onRowClick && 'cursor-pointer'
                        )}
                        onClick={() => onRowClick?.(row, index)}
                      >
                        {selectable && (
                          <td className="w-12 px-4 py-3">
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleRowSelect(rowId, e.target.checked);
                              }}
                            />
                          </td>
                        )}
                        {columns.map(column => {
                          const value = getCellValue(row, column);
                          return (
                            <td
                              key={column.id}
                              className={clsx(
                                'px-4 py-3 text-sm text-gray-900 dark:text-gray-100',
                                column.align === 'center' && 'text-center',
                                column.align === 'right' && 'text-right'
                              )}
                            >
                              {renderCell(value, row, column)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';