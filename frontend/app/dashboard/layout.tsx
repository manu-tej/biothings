'use client'

import { clsx } from 'clsx'
import React, { useEffect } from 'react'

import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { CommandPalette } from '@/components/ui/organisms/CommandPalette'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Sidebar } from '@/components/ui/organisms/Sidebar'
import { performanceMonitor } from '@/lib/monitoring/PerformanceMonitor'
import { useUIStore } from '@/lib/stores/uiStore'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { layout: _layout } = useUIStore()

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.start()

    return () => {
      performanceMonitor.stop()
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <ErrorBoundary
        isolate
        showDetails={false}
        fallback={
          <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Sidebar unavailable</p>
          </div>
        }
      >
        <Sidebar />
      </ErrorBoundary>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Header */}
        <ErrorBoundary
          isolate
          showDetails={false}
          fallback={
            <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Navigation error occurred</p>
            </div>
          }
        >
          <PageHeader />
        </ErrorBoundary>

        {/* Main Content */}
        <main
          className={clsx(
            'flex-1 overflow-x-hidden overflow-y-auto',
            'transition-all duration-300 ease-in-out'
          )}
        >
          <ErrorBoundary
            showDetails={process.env.NODE_ENV === 'development'}
            onError={(error, errorInfo) => {
              console.error('Dashboard content error:', error)
              // TODO: Send to monitoring service
              performanceMonitor.logError('dashboard_content_error', {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
              })
            }}
          >
            <div className="h-full w-full">{children}</div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Command Palette - Global overlay */}
      <ErrorBoundary isolate showDetails={false} fallback={null}>
        <CommandPalette />
      </ErrorBoundary>
    </div>
  )
}
