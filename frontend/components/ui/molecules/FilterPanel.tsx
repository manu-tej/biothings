'use client';

import { clsx } from 'clsx';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import React, { forwardRef, useState } from 'react';

import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Checkbox } from '../atoms/Checkbox';
import { Input } from '../atoms/Input';
import { Select, SelectOption } from '../atoms/Select';

export interface FilterOption {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'range';
  options?: SelectOption[];
  value?: any;
  placeholder?: string;
}

export interface FilterPanelProps {
  filters: FilterOption[];
  values: Record<string, any>;
  onFilterChange: (filterId: string, value: any) => void;
  onClearAll: () => void;
  onApply?: () => void;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showApplyButton?: boolean;
  showClearButton?: boolean;
  showActiveCount?: boolean;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  testId?: string;
}

const sizeStyles = {
  sm: {
    title: 'text-sm font-medium',
    spacing: 'space-y-2',
    padding: 'p-3',
  },
  md: {
    title: 'text-base font-medium',
    spacing: 'space-y-3',
    padding: 'p-4',
  },
  lg: {
    title: 'text-lg font-medium',
    spacing: 'space-y-4',
    padding: 'p-5',
  },
};

export const FilterPanel = forwardRef<HTMLDivElement, FilterPanelProps>(
  (
    {
      filters,
      values,
      onFilterChange,
      onClearAll,
      onApply,
      title = 'Filters',
      collapsible = true,
      defaultCollapsed = false,
      showApplyButton = false,
      showClearButton = true,
      showActiveCount = true,
      orientation = 'vertical',
      size = 'md',
      className,
      testId,
    },
    ref
  ) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const sizes = sizeStyles[size];

    // Count active filters
    const activeFilterCount = filters.reduce((count, filter) => {
      const value = values[filter.id];
      if (value === undefined || value === null || value === '') return count;
      if (Array.isArray(value) && value.length === 0) return count;
      return count + 1;
    }, 0);

    const handleFilterChange = (filterId: string, value: any) => {
      onFilterChange(filterId, value);
    };

    const handleClearAll = () => {
      onClearAll();
    };

    const renderFilterInput = (filter: FilterOption) => {
      const value = values[filter.id];

      switch (filter.type) {
        case 'text':
          return (
            <Input
              key={filter.id}
              value={value || ''}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
              placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}...`}
              inputSize={size}
              clearable
              onClear={() => handleFilterChange(filter.id, '')}
            />
          );

        case 'select':
          return (
            <Select
              key={filter.id}
              options={filter.options || []}
              value={value || ''}
              onChange={(val) => handleFilterChange(filter.id, val)}
              placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}...`}
              selectSize={size}
              clearable
            />
          );

        case 'multiselect':
          return (
            <div key={filter.id} className="space-y-2">
              {filter.options?.map(option => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={Array.isArray(value) ? value.includes(option.value) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value);
                    handleFilterChange(filter.id, newValues);
                  }}
                  checkboxSize={size}
                />
              ))}
            </div>
          );

        case 'checkbox':
          return (
            <Checkbox
              key={filter.id}
              label={filter.label}
              checked={!!value}
              onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
              checkboxSize={size}
            />
          );

        case 'date':
          return (
            <Input
              key={filter.id}
              type="date"
              value={value || ''}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
              inputSize={size}
            />
          );

        case 'range':
          return (
            <div key={filter.id} className="grid grid-cols-2 gap-2">
              <Input
                value={value?.min || ''}
                onChange={(e) => handleFilterChange(filter.id, { ...value, min: e.target.value })}
                placeholder="Min"
                inputSize={size}
              />
              <Input
                value={value?.max || ''}
                onChange={(e) => handleFilterChange(filter.id, { ...value, max: e.target.value })}
                placeholder="Max"
                inputSize={size}
              />
            </div>
          );

        default:
          return null;
      }
    };

    const renderActiveFilters = () => {
      if (!showActiveCount || activeFilterCount === 0) return null;

      const activeFilters = filters.filter(filter => {
        const value = values[filter.id];
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      });

      return (
        <div className="flex flex-wrap gap-1 mt-2">
          {activeFilters.map(filter => {
            const value = values[filter.id];
            let displayValue = value;
            
            if (Array.isArray(value)) {
              displayValue = value.length > 1 ? `${value.length} selected` : value[0];
            } else if (filter.type === 'select' && filter.options) {
              const option = filter.options.find(opt => opt.value === value);
              displayValue = option?.label || value;
            }

            return (
              <Badge
                key={filter.id}
                size="xs"
                variant="primary"
                className="cursor-pointer"
                onClick={() => handleFilterChange(filter.id, filter.type === 'multiselect' ? [] : '')}
              >
                {filter.label}: {displayValue}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            );
          })}
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
        <div className={sizes.padding}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className={clsx(sizes.title, 'text-gray-900 dark:text-gray-100')}>
                {title}
              </h3>
              {showActiveCount && activeFilterCount > 0 && (
                <Badge size="xs" variant="primary">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {showClearButton && activeFilterCount > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={handleClearAll}
                >
                  Clear all
                </Button>
              )}
              {collapsible && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  icon={isCollapsed ? <ChevronDown /> : <ChevronUp />}
                />
              )}
            </div>
          </div>

          {/* Active Filters */}
          {renderActiveFilters()}

          {/* Filter Controls */}
          {(!collapsible || !isCollapsed) && (
            <>
              <div className={clsx(
                'mt-4',
                orientation === 'vertical' ? sizes.spacing : 'flex flex-wrap gap-4'
              )}>
                {filters.map(filter => (
                  <div key={filter.id} className={orientation === 'horizontal' ? 'flex-1 min-w-0' : ''}>
                    {filter.type !== 'checkbox' && (
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {filter.label}
                      </label>
                    )}
                    {renderFilterInput(filter)}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              {(showApplyButton || (showClearButton && activeFilterCount > 0)) && (
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    {showClearButton && activeFilterCount > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearAll}
                      >
                        Clear all filters
                      </Button>
                    )}
                  </div>
                  {showApplyButton && (
                    <Button
                      size="sm"
                      onClick={onApply}
                      disabled={activeFilterCount === 0}
                    >
                      Apply filters
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    );
  }
);

FilterPanel.displayName = 'FilterPanel';