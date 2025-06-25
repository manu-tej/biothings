'use client'

import { clsx } from 'clsx'
import { Search, X, AlertCircle, Check } from 'lucide-react'
import React, { forwardRef, InputHTMLAttributes, useState } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search' | 'number'
  inputSize?: 'sm' | 'md' | 'lg'
  state?: 'default' | 'error' | 'success' | 'warning'
  label?: string
  hint?: string
  error?: string
  success?: string
  warning?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  clearable?: boolean
  onClear?: () => void
  fullWidth?: boolean
  rounded?: boolean
  testId?: string
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-3 text-lg',
}

const iconSizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

const stateStyles = {
  default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400',
  success: 'border-green-500 focus:border-green-500 focus:ring-green-500 dark:border-green-400',
  warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-400',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = 'default',
      inputSize = 'md',
      state = 'default',
      label,
      hint,
      error,
      success,
      warning,
      icon,
      iconPosition = 'left',
      clearable = false,
      onClear,
      fullWidth = false,
      rounded = false,
      disabled,
      value,
      onChange,
      testId,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value || '')
    const hasValue = clearable && (value !== undefined ? value : internalValue)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) {
        setInternalValue(e.target.value)
      }
      onChange?.(e)
    }

    const handleClear = () => {
      if (!value) {
        setInternalValue('')
      }
      onClear?.()
    }

    const variantIcon = variant === 'search' ? <Search /> : icon
    const stateIcon =
      state === 'error' ? (
        <AlertCircle />
      ) : state === 'success' ? (
        <Check />
      ) : state === 'warning' ? (
        <AlertCircle />
      ) : null

    const displayIcon = variantIcon || (iconPosition === 'right' && stateIcon)
    const rightIcon = stateIcon || (clearable && hasValue)

    const inputStyles = clsx(
      'block border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800',
      rounded ? 'rounded-full' : 'rounded-lg',
      sizeStyles[inputSize],
      stateStyles[state],
      displayIcon && iconPosition === 'left' && 'pl-10',
      rightIcon && 'pr-10',
      fullWidth && 'w-full',
      className
    )

    const message = error || success || warning || hint
    const messageColor = error
      ? 'text-red-600 dark:text-red-400'
      : success
        ? 'text-green-600 dark:text-green-400'
        : warning
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-gray-600 dark:text-gray-400'

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {displayIcon && iconPosition === 'left' && (
            <div
              className={clsx(
                'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400',
                iconSizeStyles[inputSize]
              )}
            >
              {displayIcon}
            </div>
          )}
          <input
            ref={ref}
            type={variant === 'number' ? 'number' : 'text'}
            className={inputStyles}
            disabled={disabled}
            value={value !== undefined ? value : internalValue}
            onChange={handleChange}
            data-testid={testId}
            {...(state === 'error' && { 'aria-invalid': 'true' })}
            aria-describedby={message ? `${testId}-message` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {stateIcon && !clearable && (
                <span
                  className={clsx(
                    iconSizeStyles[inputSize],
                    state === 'error'
                      ? 'text-red-500'
                      : state === 'success'
                        ? 'text-green-500'
                        : state === 'warning'
                          ? 'text-yellow-500'
                          : ''
                  )}
                >
                  {stateIcon}
                </span>
              )}
              {clearable && hasValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={clsx(
                    'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                    'transition-colors duration-200',
                    iconSizeStyles[inputSize]
                  )}
                  aria-label="Clear input"
                >
                  <X />
                </button>
              )}
            </div>
          )}
        </div>
        {message && (
          <p id={`${testId}-message`} className={clsx('mt-1 text-sm', messageColor)}>
            {message}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
