'use client';

import { clsx } from 'clsx';
import React, { forwardRef, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  clickable?: boolean;
  selected?: boolean;
  fullHeight?: boolean;
  testId?: string;
}

const variantStyles = {
  default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  outline: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
  ghost: 'bg-gray-50 dark:bg-gray-900/50',
  elevated: 'bg-white dark:bg-gray-800 shadow-lg',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const roundedStyles = {
  none: '',
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

const shadowStyles = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      rounded = 'lg',
      shadow = variant === 'elevated' ? 'lg' : 'none',
      hoverable = false,
      clickable = false,
      selected = false,
      fullHeight = false,
      children,
      testId,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      'transition-all duration-200',
      variantStyles[variant],
      paddingStyles[padding],
      roundedStyles[rounded],
      shadowStyles[shadow],
      hoverable && 'hover:shadow-lg hover:scale-[1.02]',
      clickable && 'cursor-pointer',
      selected && 'ring-2 ring-blue-500 dark:ring-blue-400',
      fullHeight && 'h-full',
      className
    );

    return (
      <div
        ref={ref}
        className={baseStyles}
        data-testid={testId}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components for better composition
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    if (!children && (title || subtitle)) {
      return (
        <div
          ref={ref}
          className={clsx('flex items-start justify-between mb-4', className)}
          {...props}
        >
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={clsx('mb-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export type CardBodyProps = HTMLAttributes<HTMLDivElement>

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('', className)}
        {...props}
      />
    );
  }
);

CardBody.displayName = 'CardBody';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  separator?: boolean;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, separator = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'mt-4',
          separator && 'pt-4 border-t border-gray-200 dark:border-gray-700',
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';