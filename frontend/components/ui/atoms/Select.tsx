'use client'

import { clsx } from 'clsx'
import { ChevronDown, Search, Check } from 'lucide-react'
import React, { forwardRef, useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  hint?: string
  error?: string
  selectSize?: 'sm' | 'md' | 'lg'
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  fullWidth?: boolean
  rounded?: boolean
  state?: 'default' | 'error' | 'success' | 'warning'
  className?: string
  testId?: string
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-3 text-lg',
}

const stateStyles = {
  default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400',
  success: 'border-green-500 focus:border-green-500 focus:ring-green-500 dark:border-green-400',
  warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-400',
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Select an option',
      label,
      hint,
      error,
      selectSize = 'md',
      searchable = false,
      clearable: _clearable = false,
      disabled = false,
      fullWidth = false,
      rounded = false,
      state = 'default',
      className,
      testId,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const selectedOption = options.find((opt) => opt.value === value)

    const filteredOptions = searchable
      ? options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
      : options

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          setSearchTerm('')
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, [isOpen, searchable])

    const handleSelect = (option: SelectOption) => {
      if (!option.disabled) {
        onChange?.(option.value)
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault()
        handleSelect(filteredOptions[highlightedIndex])
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    const triggerStyles = clsx(
      'relative w-full bg-white dark:bg-gray-900 border rounded-lg',
      'flex items-center justify-between cursor-pointer',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      disabled && 'opacity-50 cursor-not-allowed',
      rounded ? 'rounded-full' : 'rounded-lg',
      sizeStyles[selectSize],
      stateStyles[state],
      fullWidth && 'w-full',
      className
    )

    const dropdownStyles = clsx(
      'absolute z-50 w-full mt-1',
      'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
      'rounded-lg shadow-lg',
      'max-h-60 overflow-auto'
    )

    const message = error || hint
    const messageColor = error
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-600 dark:text-gray-400'

    return (
      <div ref={ref} className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div ref={dropdownRef} className="relative">
          <div
            className={triggerStyles}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={isOpen ? 'select-dropdown' : undefined}
            aria-disabled={disabled}
            data-testid={testId}
          >
            <span
              className={clsx('truncate', !selectedOption && 'text-gray-500 dark:text-gray-400')}
            >
              {selectedOption ? (
                <span className="flex items-center gap-2">
                  {selectedOption.icon}
                  {selectedOption.label}
                </span>
              ) : (
                placeholder
              )}
            </span>
            <ChevronDown
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform duration-200',
                isOpen && 'transform rotate-180'
              )}
            />
          </div>

          {isOpen && (
            <div id="select-dropdown" className={dropdownStyles}>
              {searchable && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className={clsx(
                        'w-full pl-9 pr-3 py-2 text-sm',
                        'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                        'rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      )}
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>
              )}

              <ul className="py-1" role="listbox">
                {filteredOptions.length === 0 ? (
                  <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No options found
                  </li>
                ) : (
                  filteredOptions.map((option, index) => (
                    <li
                      key={option.value}
                      className={clsx(
                        'px-4 py-2 cursor-pointer flex items-center justify-between',
                        'transition-colors duration-150',
                        option.disabled
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-900 dark:text-gray-100',
                        !option.disabled &&
                          (highlightedIndex === index
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'),
                        option.value === value && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      role="option"
                      aria-selected={option.value === value}
                      aria-disabled={option.disabled}
                    >
                      <span className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </span>
                      {option.value === value && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
        {message && <p className={clsx('mt-1 text-sm', messageColor)}>{message}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
