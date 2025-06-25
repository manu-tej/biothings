'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'

import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { registerServiceWorker } from '@/lib/register-sw'
import { WebSocketProvider } from '@/lib/websocket/WebSocketProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
            refetchInterval: false, // Disable automatic refetch by default
            refetchOnWindowFocus: false, // Don't refetch on window focus
            retry: 1, // Only retry once
            retryDelay: 1000, // 1 second retry delay
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  )

  useEffect(() => {
    // Register service worker for offline support
    registerServiceWorker()
  }, [])

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Unable to initialize application</h2>
            <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
      onError={(error) => {
        console.error('Provider initialization error:', error);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary
          isolate
          fallback={
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                WebSocket connection error. The application will continue to work in offline mode.
              </p>
            </div>
          }
        >
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </ErrorBoundary>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}