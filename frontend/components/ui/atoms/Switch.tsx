'use client';

import { clsx } from 'clsx';
import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  switchSize?: 'sm' | 'md' | 'lg';
  labelPosition?: 'left' | 'right';
  error?: boolean;
  fullWidth?: boolean;
  testId?: string;
}

const sizeStyles = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
    label: 'text-sm',
    description: 'text-xs',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
    label: 'text-base',
    description: 'text-sm',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translate: 'translate-x-7',
    label: 'text-lg',
    description: 'text-base',
  },
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      label,
      description,
      switchSize = 'md',
      labelPosition = 'right',
      error = false,
      fullWidth = false,
      disabled = false,
      checked = false,
      testId,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[switchSize];
    
    const trackStyles = clsx(
      'relative inline-flex rounded-full transition-colors duration-200',
      'focus-within:ring-2 focus-within:ring-offset-2',
      sizes.track,
      error
        ? 'focus-within:ring-red-500'
        : 'focus-within:ring-blue-500',
      checked
        ? error
          ? 'bg-red-500'
          : 'bg-blue-600 dark:bg-blue-500'
        : 'bg-gray-200 dark:bg-gray-700',
      disabled && 'opacity-50 cursor-not-allowed',
      !disabled && 'cursor-pointer'
    );

    const thumbStyles = clsx(
      'absolute top-0.5 left-0.5 bg-white rounded-full shadow-lg',
      'transform transition-transform duration-200',
      sizes.thumb,
      checked && sizes.translate
    );

    const wrapperStyles = clsx(
      'inline-flex items-start gap-3',
      labelPosition === 'left' && 'flex-row-reverse',
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

    const switchElement = (
      <div className={trackStyles}>
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          disabled={disabled}
          checked={checked}
          data-testid={testId}
          aria-describedby={description ? `${testId}-description` : undefined}
          {...props}
        />
        <span className={thumbStyles} />
      </div>
    );

    if (!label && !description) {
      return switchElement;
    }

    return (
      <label className={wrapperStyles}>
        {switchElement}
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

Switch.displayName = 'Switch';