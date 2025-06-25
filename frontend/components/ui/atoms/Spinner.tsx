'use client';

import { clsx } from 'clsx';
import React, { forwardRef, HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'current';
  variant?: 'circle' | 'dots' | 'bars';
  label?: string;
  fullScreen?: boolean;
  testId?: string;
}

const sizeStyles = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorStyles = {
  primary: 'text-blue-600 dark:text-blue-500',
  secondary: 'text-gray-600 dark:text-gray-400',
  white: 'text-white',
  current: 'text-current',
};

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      className,
      size = 'md',
      color = 'primary',
      variant = 'circle',
      label = 'Loading...',
      fullScreen = false,
      testId,
      ...props
    },
    ref
  ) => {
    const spinnerContent = (
      <>
        {variant === 'circle' && (
          <svg
            className={clsx('animate-spin', sizeStyles[size], colorStyles[color])}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {variant === 'dots' && (
          <div className={clsx('flex gap-1', colorStyles[color])}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-full bg-current animate-pulse',
                  size === 'xs' ? 'w-1 h-1' :
                  size === 'sm' ? 'w-1.5 h-1.5' :
                  size === 'md' ? 'w-2 h-2' :
                  size === 'lg' ? 'w-2.5 h-2.5' :
                  'w-3 h-3'
                )}
                style={{
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        )}
        
        {variant === 'bars' && (
          <div className={clsx('flex gap-1', colorStyles[color])}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={clsx(
                  'bg-current animate-pulse',
                  size === 'xs' ? 'w-0.5 h-3' :
                  size === 'sm' ? 'w-1 h-4' :
                  size === 'md' ? 'w-1 h-6' :
                  size === 'lg' ? 'w-1.5 h-8' :
                  'w-2 h-12'
                )}
                style={{
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '600ms',
                }}
              />
            ))}
          </div>
        )}
        
        <span className="sr-only">{label}</span>
      </>
    );

    if (fullScreen) {
      return (
        <div
          ref={ref}
          className={clsx(
            'fixed inset-0 z-50 flex items-center justify-center',
            'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
            className
          )}
          data-testid={testId}
          role="status"
          {...props}
        >
          <div className="flex flex-col items-center gap-4">
            {spinnerContent}
            {label !== 'Loading...' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={clsx('inline-flex items-center justify-center', className)}
        data-testid={testId}
        role="status"
        {...props}
      >
        {spinnerContent}
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';