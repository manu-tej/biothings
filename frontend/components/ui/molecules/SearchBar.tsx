'use client';

import { clsx } from 'clsx';
import { Search, Filter, ChevronDown } from 'lucide-react';
import React, { forwardRef, useState, useRef, useEffect } from 'react';

import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';

export interface SearchSuggestion {
  id: string;
  text: string;
  category?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SearchFilter {
  id: string;
  label: string;
  active: boolean;
  count?: number;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  filters?: SearchFilter[];
  onFilterToggle?: (filterId: string) => void;
  showFilters?: boolean;
  showSuggestions?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'minimal';
  className?: string;
  testId?: string;
}

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onSearch,
      placeholder = 'Search...',
      suggestions = [],
      filters = [],
      onFilterToggle,
      showFilters = true,
      showSuggestions = true,
      loading = false,
      size = 'md',
      variant = 'default',
      className,
      testId,
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
          setFocused(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setShowDropdown(newValue.length > 0 && showSuggestions && suggestions.length > 0);
    };

    const handleInputFocus = () => {
      setFocused(true);
      if (value.length > 0 && showSuggestions && suggestions.length > 0) {
        setShowDropdown(true);
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSearch?.(value);
      setShowDropdown(false);
    };

    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
      onChange(suggestion.text);
      onSearch?.(suggestion.text);
      setShowDropdown(false);
    };

    const handleClear = () => {
      onChange('');
      setShowDropdown(false);
    };

    const activeFiltersCount = filters.filter(f => f.active).length;

    return (
      <div
        ref={containerRef}
        className={clsx('relative w-full', className)}
        data-testid={testId}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={value}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              inputSize={size}
              icon={<Search />}
              clearable
              onClear={handleClear}
              className={clsx(
                variant === 'filled' && 'bg-gray-100 dark:bg-gray-800 border-transparent',
                variant === 'minimal' && 'border-transparent shadow-none',
                focused && 'ring-2 ring-blue-500 dark:ring-blue-400'
              )}
            />
          </div>

          {showFilters && filters.length > 0 && (
            <div className="relative">
              <Button
                type="button"
                size={size}
                variant="outline"
                onClick={() => setShowDropdown(!showDropdown)}
                icon={<Filter />}
                className="relative"
              >
                Filters
                {activeFiltersCount > 0 && (
                  <Badge
                    size="xs"
                    variant="primary"
                    className="absolute -top-1 -right-1"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </form>

        {/* Dropdown */}
        {showDropdown && (
          <Card
            variant="default"
            padding="sm"
            className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg border"
          >
            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Suggestions
                </h4>
                {suggestions.map((suggestion) => {
                  const SuggestionIcon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="flex items-center gap-2 w-full p-2 text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {SuggestionIcon && (
                        <SuggestionIcon className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {suggestion.text}
                      </span>
                      {suggestion.category && (
                        <Badge size="xs" variant="secondary">
                          {suggestion.category}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filters */}
            {showFilters && filters.length > 0 && (
              <div className={clsx(
                'space-y-1',
                suggestions.length > 0 && 'mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'
              )}>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Filters
                </h4>
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => onFilterToggle?.(filter.id)}
                    className={clsx(
                      'flex items-center justify-between w-full p-2 text-left rounded-md transition-colors',
                      filter.active
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <span className="text-sm font-medium">
                      {filter.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {filter.count !== undefined && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {filter.count}
                        </span>
                      )}
                      {filter.active && (
                        <Badge size="xs" variant="primary">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
