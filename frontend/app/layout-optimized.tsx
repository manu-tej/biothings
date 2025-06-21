import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import { optimizedApiClient } from '@/lib/api/client'

// Optimize font loading
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

export const metadata: Metadata = {
  title: 'BioThings - Biotech AI Platform',
  description: 'Next-generation biotech operations platform powered by AI',
}

// Prefetch data at the layout level
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Start prefetching critical data
  if (typeof window === 'undefined') {
    // Server-side: initiate prefetch
    optimizedApiClient.prefetchDashboardData().catch(() => {
      // Silently fail prefetch on server
    })
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="http://localhost:8000" />
        <link rel="dns-prefetch" href="http://localhost:8000" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}