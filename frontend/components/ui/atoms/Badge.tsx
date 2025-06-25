'use client';

import React, { forwardRef, HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  rounded?: boolean;
  outline?: boolean;
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  testId?: string;
}

const variantStyles = {
  default: {
    solid: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    outline: 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  },
  primary: {
    solid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    outline: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300',
  },
  secondary: {
    solid: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    outline: 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  },
  success: {
    solid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    outline: 'border-green-300 text-green-700 dark:border-green-600 dark:text-green-300',
  },
  warning: {
    solid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    outline: 'border-yellow-300 text-yellow-700 dark:border-yellow-600 dark:text-yellow-300',
  },
  danger: {
    solid: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    outline: 'border-red-300 text-red-700 dark:border-red-600 dark:text-red-300',
  },
  info: {
    solid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    outline: 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300',
  },
};

const sizeStyles = {
  xs: 'text-xs px-2 py-0.5',
  sm: 'text-sm px-2.5 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

const dotColors = {
  default: 'bg-gray-400',
  primary: 'bg-blue-400',
  secondary: 'bg-gray-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'sm',
      rounded = false,
      outline = false,
      dot = false,
      dotColor,
      icon,
      iconPosition = 'left',
      children,
      testId,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      'inline-flex items-center font-medium',
      rounded ? 'rounded-full' : 'rounded-md',
      outline ? 'border-2' : '',
      outline ? variantStyles[variant].outline : variantStyles[variant].solid,
      sizeStyles[size],
      className
    );

    const dotElement = dot && (
      <span
        className={clsx(
          'w-2 h-2 rounded-full',
          dotColor || dotColors[variant],
          iconPosition === 'left' && children ? 'mr-1.5' : '',
          iconPosition === 'right' && children ? 'ml-1.5' : ''
        )}
      />
    );

    const iconElement = icon && (
      <span
        className={clsx(
          'inline-flex',
          iconPosition === 'left' && children ? 'mr-1' : '',
          iconPosition === 'right' && children ? 'ml-1' : ''
        )}
      >
        {icon}
      </span>
    );

    return (
      <span
        ref={ref}
        className={baseStyles}
        data-testid={testId}
        {...props}
      >
        {(dot || icon) && iconPosition === 'left' && (
          <>
            {dot && dotElement}
            {icon && iconElement}
          </>
        )}
        {children}
        {(dot || icon) && iconPosition === 'right' && (
          <>
            {icon && iconElement}
            {dot && dotElement}
          </>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Compound component for badge groups
export interface BadgeGroupProps extends HTMLAttributes<HTMLDivElement> {
  spacing?: 'xs' | 'sm' | 'md' | 'lg';
  wrap?: boolean;
}

export const BadgeGroup = forwardRef<HTMLDivElement, BadgeGroupProps>(
  ({ className, spacing = 'sm', wrap = true, ...props }, ref) => {
    const spacingStyles = {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'inline-flex items-center',
          wrap ? 'flex-wrap' : '',
          spacingStyles[spacing],
          className
        )}
        {...props}
      />
    );
  }
);

BadgeGroup.displayName = 'BadgeGroup';