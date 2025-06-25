'use client'

import { Search, Filter } from 'lucide-react'
import React from 'react'

import { equipmentTypes, equipmentStatuses } from '@/lib/laboratory/constants'
import type { EquipmentFilters as Filters } from '@/lib/laboratory/types'

interface EquipmentFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Partial<Filters>) => void
}

export const EquipmentFilters = React.memo(
  ({ filters, onFiltersChange }: EquipmentFiltersProps) => {
    return (
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Type Filter */}
        <div className="min-w-[150px]">
          <select
            value={filters.type}
            onChange={(e) => onFiltersChange({ type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            {equipmentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="min-w-[150px]">
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            {equipmentStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(filters.type !== 'all' || filters.status !== 'all' || filters.search) && (
          <button
            onClick={() => onFiltersChange({ type: 'all', status: 'all', search: '' })}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center"
          >
            <Filter className="w-4 h-4 mr-1" />
            Clear
          </button>
        )}
      </div>
    )
  }
)
