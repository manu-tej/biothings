'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Badge } from '../atoms/Badge';

export interface ProgressSegment {
  id: string;
  label: string;
  value: number;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  pattern?: 'solid' | 'striped' | 'gradient';
}

export interface ProgressBarProps {
  segments: ProgressSegment[];
  total?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabels?: boolean;
  showPercentages?: boolean;
  showTooltips?: boolean;
  animated?: boolean;
  rounded?: boolean;
  className?: string;
  testId?: string;
}

const sizeStyles = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
  xl: 'h-6',
};

const colorStyles = {
  blue: 'bg-blue-500 dark:bg-blue-400',
  green: 'bg-green-500 dark:bg-green-400',
  red: 'bg-red-500 dark:bg-red-400',
  yellow: 'bg-yellow-500 dark:bg-yellow-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
  gray: 'bg-gray-500 dark:bg-gray-400',
};

const gradientStyles = {
  blue: 'bg-gradient-to-r from-blue-400 to-blue-600',
  green: 'bg-gradient-to-r from-green-400 to-green-600',
  red: 'bg-gradient-to-r from-red-400 to-red-600',
  yellow: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
  purple: 'bg-gradient-to-r from-purple-400 to-purple-600',
  gray: 'bg-gradient-to-r from-gray-400 to-gray-600',
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      segments,
      total,
      size = 'md',
      showLabels = true,
      showPercentages = false,
      showTooltips = false,
      animated = true,
      rounded = true,
      className,
      testId,
    },
    ref
  ) => {
    // Calculate total if not provided
    const calculatedTotal = total || segments.reduce((sum, segment) => sum + segment.value, 0);
    
    // Calculate percentages
    const segmentsWithPercentages = segments.map(segment => ({
      ...segment,
      percentage: calculatedTotal > 0 ? (segment.value / calculatedTotal) * 100 : 0,
    }));

    const getSegmentStyle = (segment: ProgressSegment & { percentage: number }) => {
      const baseColor = segment.color || 'blue';
      
      let backgroundClass;
      if (segment.pattern === 'gradient') {
        backgroundClass = gradientStyles[baseColor];
      } else {
        backgroundClass = colorStyles[baseColor];
      }

      const style: React.CSSProperties = {
        width: `${segment.percentage}%`,
      };

      let className = clsx(
        backgroundClass,
        animated && 'transition-all duration-500 ease-out',
        segment.pattern === 'striped' && 'bg-stripes'
      );

      return { style, className };
    };

    return (
      <div ref={ref} className={className} data-testid={testId}>
        {/* Labels */}
        {showLabels && (
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-wrap gap-2">
              {segmentsWithPercentages.map(segment => (
                <div key={segment.id} className="flex items-center gap-1">
                  <div
                    className={clsx(
                      'w-3 h-3 rounded-sm',
                      segment.pattern === 'gradient' 
                        ? gradientStyles[segment.color || 'blue']
                        : colorStyles[segment.color || 'blue']
                    )}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {segment.label}
                  </span>
                  {showPercentages && (
                    <Badge size="xs" variant="secondary">
                      {segment.percentage.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {calculatedTotal.toLocaleString()}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div
          className={clsx(
            'w-full bg-gray-200 dark:bg-gray-700 overflow-hidden',
            sizeStyles[size],
            rounded ? 'rounded-full' : 'rounded-sm'
          )}
        >
          <div className="flex h-full">
            {segmentsWithPercentages.map((segment, index) => {
              const { style, className: segmentClassName } = getSegmentStyle(segment);
              
              return (
                <div
                  key={segment.id}
                  className={segmentClassName}
                  style={style}
                  title={showTooltips ? `${segment.label}: ${segment.value} (${segment.percentage.toFixed(1)}%)` : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Value labels below bar */}
        {showLabels && (
          <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>0</span>
            <span>{calculatedTotal.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

// Simple single-segment progress bar
export interface SimpleProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: ProgressSegment['color'];
  size?: ProgressBarProps['size'];
  showPercentage?: boolean;
  animated?: boolean;
  rounded?: boolean;
  className?: string;
  testId?: string;
}

export const SimpleProgressBar = forwardRef<HTMLDivElement, SimpleProgressBarProps>(
  (
    {
      value,
      max = 100,
      label,
      color = 'blue',
      size = 'md',
      showPercentage = true,
      animated = true,
      rounded = true,
      className,
      testId,
    },
    ref
  ) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    
    return (
      <div ref={ref} className={className} data-testid={testId}>
        {(label || showPercentage) && (
          <div className="flex justify-between items-center mb-2">
            {label && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
            )}
            {showPercentage && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
        )}
        
        <div
          className={clsx(
            'w-full bg-gray-200 dark:bg-gray-700 overflow-hidden',
            sizeStyles[size],
            rounded ? 'rounded-full' : 'rounded-sm'
          )}
        >
          <div
            className={clsx(
              'h-full transition-all duration-500 ease-out',
              colorStyles[color],
              animated && 'transition-all duration-500 ease-out'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

SimpleProgressBar.displayName = 'SimpleProgressBar';