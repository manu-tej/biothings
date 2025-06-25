'use client';

import { clsx } from 'clsx';
import { Check, Minus } from 'lucide-react';
import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  checkboxSize?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  testId?: string;
}

const sizeStyles = {
  sm: {
    checkbox: 'w-4 h-4',
    icon: 'w-3 h-3',
    label: 'text-sm',
    description: 'text-xs',
  },
  md: {
    checkbox: 'w-5 h-5',
    icon: 'w-3.5 h-3.5',
    label: 'text-base',
    description: 'text-sm',
  },
  lg: {
    checkbox: 'w-6 h-6',
    icon: 'w-4 h-4',
    label: 'text-lg',
    description: 'text-base',
  },
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      checkboxSize = 'md',
      indeterminate = false,
      error = false,
      fullWidth = false,
      disabled = false,
      checked,
      testId,
      ...props
    },
    ref
  ) => {
    const checkboxRef = React.useRef<HTMLInputElement>(null);
    const mergedRef = ref || checkboxRef;

    React.useEffect(() => {
      if (mergedRef && 'current' in mergedRef && mergedRef.current) {
        mergedRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate, mergedRef]);

    const sizes = sizeStyles[checkboxSize];
    
    const checkboxStyles = clsx(
      'relative appearance-none border-2 rounded transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      sizes.checkbox,
      error
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500',
      checked || indeterminate
        ? error
          ? 'bg-red-500 border-red-500'
          : 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
        : 'bg-white dark:bg-gray-900',
      disabled && 'opacity-50 cursor-not-allowed',
      !disabled && 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-400'
    );

    const iconStyles = clsx(
      'absolute inset-0 flex items-center justify-center text-white pointer-events-none',
      sizes.icon
    );

    const wrapperStyles = clsx(
      'inline-flex items-start gap-3',
      fullWidth && 'w-full',
      className
    );

    const labelStyles = clsx(
      'select-none',
      sizes.label,
      'text-gray-900 dark:text-gray-100',
      !disabled && 'cursor-pointer',
      disabled && 'opacity-50'
    );

    const descriptionStyles = clsx(
      'mt-1',
      sizes.description,
      'text-gray-600 dark:text-gray-400',
      disabled && 'opacity-50'
    );

    const checkbox = (
      <div className="relative inline-block">
        <input
          ref={mergedRef}
          type="checkbox"
          className={checkboxStyles}
          disabled={disabled}
          checked={checked}
          data-testid={testId}
          aria-describedby={description ? `${testId}-description` : undefined}
          {...props}
        />
        <div className={iconStyles}>
          {indeterminate ? (
            <Minus strokeWidth={3} />
          ) : checked ? (
            <Check strokeWidth={3} />
          ) : null}
        </div>
      </div>
    );

    if (!label && !description) {
      return checkbox;
    }

    return (
      <label className={wrapperStyles}>
        {checkbox}
        <div className="flex-1">
          {label && <span className={labelStyles}>{label}</span>}
          {description && (
            <p id={`${testId}-description`} className={descriptionStyles}>
              {description}
            </p>
          )}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';