'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
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
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}