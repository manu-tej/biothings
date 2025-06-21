'use client'

import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { useWebSocket } from '@/lib/hooks/useWebSocket'

// Dynamic imports with loading states
const SystemMetrics = dynamic(() => import('@/components/dashboard/SystemMetrics'), {
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg" />,
  ssr: false
})

const AgentOverview = dynamic(() => import('@/components/dashboard/OptimizedAgentOverview'), {
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />,
  ssr: false
})

const WorkflowStatus = dynamic(() => import('@/components/dashboard/WorkflowStatus'), {
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />,
  ssr: false
})

const RealtimeAlerts = dynamic(() => import('@/components/dashboard/RealtimeAlerts'), {
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg" />,
  ssr: false
})

export default function DashboardPage() {
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  
  useWebSocket({
    onConnect: () => {
      setConnectionStatus('connected')
      console.log('Dashboard WebSocket connected')
    },
    onDisconnect: () => {
      setConnectionStatus('disconnected')
    },
    onMessage: (data) => {
      console.log('Dashboard received:', data)
    }
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              BioThings Command Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time monitoring and control of your biotech operations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 
                 'Offline'}
              </span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg" />}>
              <SystemMetrics />
            </Suspense>
          </div>
          <div className="lg:col-span-1">
            <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg" />}>
              <RealtimeAlerts />
            </Suspense>
          </div>
        </div>

        {/* Agent and Workflow Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />}>
            <AgentOverview />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />}>
            <WorkflowStatus />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  )
}