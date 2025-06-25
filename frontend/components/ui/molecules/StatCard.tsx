'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus, MoreHorizontal } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';

export interface TrendData {
  value: number;
  percentage: number;
  direction: 'up' | 'down' | 'neutral';
  period?: string;
}

export interface StatCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  unit?: string;
  trend?: TrendData;
  icon?: React.ReactNode;
  iconColor?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'highlighted';
  loading?: boolean;
  onClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
  testId?: string;
}

const iconColorStyles = {
  blue: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  green: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  red: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  yellow: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  purple: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  gray: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
};

const sizeStyles = {
  sm: {
    icon: 'w-8 h-8 p-1.5',
    iconSize: 'w-5 h-5',
    value: 'text-lg font-semibold',
    title: 'text-sm font-medium',
    subtitle: 'text-xs',
    trend: 'text-xs',
  },
  md: {
    icon: 'w-10 h-10 p-2',
    iconSize: 'w-6 h-6',
    value: 'text-2xl font-bold',
    title: 'text-base font-medium',
    subtitle: 'text-sm',
    trend: 'text-sm',
  },
  lg: {
    icon: 'w-12 h-12 p-2.5',
    iconSize: 'w-7 h-7',
    value: 'text-3xl font-bold',
    title: 'text-lg font-medium',
    subtitle: 'text-base',
    trend: 'text-base',
  },
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      subtitle,
      value,
      unit,
      trend,
      icon,
      iconColor = 'blue',
      size = 'md',
      variant = 'default',
      loading = false,
      onClick,
      onMenuClick,
      className,
      testId,
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    
    const formatValue = (val: string | number) => {
      if (typeof val === 'number') {
        return val.toLocaleString();
      }
      return val;
    };

    const getTrendIcon = (direction: TrendData['direction']) => {
      switch (direction) {
        case 'up':
          return <TrendingUp className={sizes.iconSize} />;
        case 'down':
          return <TrendingDown className={sizes.iconSize} />;
        case 'neutral':
        default:
          return <Minus className={sizes.iconSize} />;
      }
    };

    const getTrendColor = (direction: TrendData['direction']) => {
      switch (direction) {
        case 'up':
          return 'text-green-600 dark:text-green-400';
        case 'down':
          return 'text-red-600 dark:text-red-400';
        case 'neutral':
        default:
          return 'text-gray-600 dark:text-gray-400';
      }
    };

    const cardVariant = variant === 'minimal' ? 'ghost' : variant === 'highlighted' ? 'elevated' : 'default';
    
    const cardContent = (
      <>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={clsx(
                  'rounded-lg flex items-center justify-center',
                  sizes.icon,
                  iconColorStyles[iconColor]
                )}>
                  <span className={sizes.iconSize}>{icon}</span>
                </div>
              )}
              <div>
                <h3 className={clsx(
                  'text-gray-900 dark:text-gray-100',
                  sizes.title
                )}>
                  {title}
                </h3>
                {subtitle && (
                  <p className={clsx(
                    'text-gray-600 dark:text-gray-400 mt-1',
                    sizes.subtitle
                  )}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {onMenuClick && (
              <Button
                size="xs"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuClick();
                }}
                icon={<MoreHorizontal />}
              />
            )}
          </div>
        </CardHeader>
        
        <CardBody>
          <div className="space-y-2">
            <div className="flex items-baseline gap-1">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
              ) : (
                <>
                  <span className={clsx(
                    'text-gray-900 dark:text-gray-100',
                    sizes.value
                  )}>
                    {formatValue(value)}
                  </span>
                  {unit && (
                    <span className={clsx(
                      'text-gray-600 dark:text-gray-400 font-normal',
                      sizes.trend
                    )}>
                      {unit}
                    </span>
                  )}
                </>
              )}
            </div>
            
            {trend && !loading && (
              <div className="flex items-center gap-2">
                <div className={clsx(
                  'flex items-center gap-1',
                  getTrendColor(trend.direction)
                )}>
                  {getTrendIcon(trend.direction)}
                  <span className={clsx('font-medium', sizes.trend)}>
                    {Math.abs(trend.percentage)}%
                  </span>
                </div>
                <span className={clsx(
                  'text-gray-600 dark:text-gray-400',
                  sizes.trend
                )}>
                  {trend.period ? `vs ${trend.period}` : 'vs previous period'}
                </span>
              </div>
            )}
            
            {loading && trend && (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            )}
          </div>
        </CardBody>
      </>
    );

    return (
      <Card
        ref={ref}
        variant={cardVariant}
        clickable={!!onClick}
        onClick={onClick}
        className={className}
        testId={testId}
      >
        {cardContent}
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';

// Compound component for stat card groups
export interface StatCardGroupProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatCardGroup = forwardRef<HTMLDivElement, StatCardGroupProps>(
  ({ children, columns = 3, gap = 'md', className }, ref) => {
    const gapStyles = {
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
    };

    const columnStyles = {
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'grid',
          columnStyles[columns],
          gapStyles[gap],
          className
        )}
      >
        {children}
      </div>
    );
  }
);

StatCardGroup.displayName = 'StatCardGroup';