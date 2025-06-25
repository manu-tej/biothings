import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BioThings AI Platform',
  description: 'LLM-powered biotech automation and monitoring platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary
          showDetails={process.env.NODE_ENV === 'development'}
          onError={(error, errorInfo) => {
            // Log to monitoring service in production
            if (process.env.NODE_ENV === 'production') {
              console.error('Global error boundary:', error, errorInfo)
              // TODO: Send to monitoring service
            }
          }}
        >
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}