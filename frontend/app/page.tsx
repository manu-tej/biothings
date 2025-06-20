'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import SystemMetrics from '@/components/dashboard/SystemMetrics'
import AgentOverview from '@/components/dashboard/AgentOverview'
import WorkflowStatus from '@/components/dashboard/WorkflowStatus'
import RealtimeAlerts from '@/components/dashboard/RealtimeAlerts'
import { useWebSocket } from '@/lib/hooks/useWebSocket'

export default function DashboardPage() {
  const { isConnected, sendMessage, lastMessage } = useWebSocket()
  
  useEffect(() => {
    if (lastMessage) {
      console.log('WebSocket message:', lastMessage)
    }
  }, [lastMessage])

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
          <div className="flex items-center space-x-2">
            <span className={`status-indicator ${isConnected ? 'active' : 'inactive'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <SystemMetrics />
          </div>
          <div className="lg:col-span-1">
            <RealtimeAlerts />
          </div>
        </div>

        {/* Agent and Workflow Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AgentOverview />
          <WorkflowStatus />
        </div>
      </div>
    </DashboardLayout>
  )
}