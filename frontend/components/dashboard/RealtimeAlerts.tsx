'use client'

import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  X,
  Bell,
  BellOff
} from 'lucide-react'
import { useAlertsWebSocket } from '@/lib/hooks/useWebSocket'
import { apiClient, type Alert as APIAlert } from '@/lib/api/client'

interface Alert extends APIAlert {
  agent_id?: string
  acknowledged?: boolean
}

const severityConfig = {
  info: {
    icon: <Info className="w-4 h-4" />,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-200',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-800 dark:text-red-200',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  critical: {
    icon: <AlertCircle className="w-4 h-4" />,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-800 dark:text-red-200',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
    borderColor: 'border-green-200 dark:border-green-800'
  }
}

interface AlertItemProps {
  alert: Alert
  onDismiss: (id: string) => void
}

const AlertItem = React.memo(({ alert, onDismiss }: AlertItemProps) => {
  const config = severityConfig[alert.severity]
  const timeAgo = React.useMemo(() => {
    const alertTime = new Date(alert.timestamp)
    const now = new Date()
    const diffSeconds = Math.floor((now.getTime() - alertTime.getTime()) / 1000)
    
    if (diffSeconds < 60) return 'Just now'
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    return `${diffHours}h ago`
  }, [alert.timestamp])
  
  const handleDismiss = React.useCallback(() => {
    onDismiss(alert.id)
  }, [alert.id, onDismiss])

  return (
    <div className={`
      p-3 rounded-lg border ${config.bgColor} ${config.borderColor} 
      ${alert.acknowledged ? 'opacity-60' : ''}
      transition-all duration-300
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`mt-0.5 ${config.textColor}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {alert.type}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {alert.message}
            </p>
            {alert.agent_id && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Agent: {alert.agent_id}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {timeAgo}
      </p>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if the alert data changes
  return prevProps.alert.id === nextProps.alert.id &&
         prevProps.alert.acknowledged === nextProps.alert.acknowledged &&
         prevProps.onDismiss === nextProps.onDismiss
})

export default function RealtimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Fetch initial alerts
  const { data: initialAlerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiClient.getAlerts()
  })

  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts)
    }
  }, [initialAlerts])

  // Handle WebSocket alerts with dedicated hook
  const { isConnected, connectionState } = useAlertsWebSocket((alertData) => {
    const newAlert: Alert = {
      id: alertData.id || `alert-${Date.now()}`,
      severity: alertData.severity || 'info',
      type: alertData.type || 'system',
      message: alertData.message || '',
      timestamp: alertData.timestamp || new Date().toISOString(),
      agent_id: alertData.agent_id,
      acknowledged: alertData.acknowledged
    }
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 20)) // Keep last 20 alerts
    
    // Play sound for warning/error alerts
    if (soundEnabled && (newAlert.severity === 'warning' || newAlert.severity === 'error' || newAlert.severity === 'critical')) {
      // Play notification sound (would need audio file)
      const audio = new Audio('/notification.mp3')
      audio.play().catch(() => {})
    }
  })

  const dismissAlert = React.useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }, [])

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alerts
          </h2>
          {unacknowledgedCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {unacknowledgedCount}
            </span>
          )}
          {/* Connection status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' :
            connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            connectionState === 'error' ? 'bg-red-500' :
            'bg-gray-400'
          }`} title={`WebSocket: ${connectionState}`} />
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title={soundEnabled ? 'Mute alerts' : 'Enable alert sounds'}
        >
          {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {alerts.length > 0 ? (
          alerts.map(alert => (
            <AlertItem 
              key={alert.id} 
              alert={alert} 
              onDismiss={dismissAlert}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active alerts</p>
            <p className="text-sm mt-1">System operating normally</p>
          </div>
        )}
      </div>

      {alerts.length > 10 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            View all alerts →
          </button>
        </div>
      )}
    </div>
  )
}