'use client'

import { clsx } from 'clsx'
import React, { forwardRef } from 'react'

export interface ContentLayoutProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  centered?: boolean
  fullHeight?: boolean
  scrollable?: boolean
  background?: 'transparent' | 'white' | 'gray' | 'gradient'
  className?: string
  testId?: string
}

const maxWidthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-none',
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
}

const spacingStyles = {
  none: '',
  sm: 'space-y-4',
  md: 'space-y-6',
  lg: 'space-y-8',
  xl: 'space-y-12',
}

const backgroundStyles = {
  transparent: '',
  white: 'bg-white dark:bg-gray-900',
  gray: 'bg-gray-50 dark:bg-gray-800',
  gradient: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800',
}

export const ContentLayout = forwardRef<HTMLDivElement, ContentLayoutProps>(
  (
    {
      children,
      maxWidth = 'full',
      padding = 'md',
      spacing = 'md',
      centered = false,
      fullHeight = false,
      scrollable = false,
      background = 'transparent',
      className,
      testId,
    },
    ref
  ) => {
    return (
      <main
        ref={ref}
        className={clsx(
          'w-full',
          fullHeight && 'min-h-screen',
          scrollable && 'overflow-y-auto',
          backgroundStyles[background],
          className
        )}
        data-testid={testId}
      >
        <div
          className={clsx(
            'w-full',
            maxWidthStyles[maxWidth],
            paddingStyles[padding],
            spacingStyles[spacing],
            centered && 'mx-auto',
            fullHeight && 'min-h-full'
          )}
        >
          {children}
        </div>
      </main>
    )
  }
)

ContentLayout.displayName = 'ContentLayout'
