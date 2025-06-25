'use client'

import { clsx } from 'clsx'
import React from 'react'

import { Badge } from '@/components/ui/atoms/Badge'

export interface ActivityItem {
  id: string
  title: string
  description: string
  timestamp: Date
  type: 'agent' | 'workflow' | 'system' | 'user'
  priority: 'low' | 'medium' | 'high'
}

export interface ActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
  showTimestamp?: boolean
  className?: string
}

const typeColors = {
  agent: 'primary',
  workflow: 'success',
  system: 'warning',
  user: 'info',
} as const

const priorityStyles = {
  low: 'border-l-2 border-l-gray-300',
  medium: 'border-l-2 border-l-yellow-400',
  high: 'border-l-2 border-l-red-400',
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  maxItems = 10,
  showTimestamp = true,
  className,
}) => {
  const displayActivities = activities.slice(0, maxItems)

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return timestamp.toLocaleDateString()
  }

  if (displayActivities.length === 0) {
    return (
      <div className={clsx('text-center py-8', className)}>
        <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {displayActivities.map((activity) => (
        <div
          key={activity.id}
          className={clsx(
            'p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50',
            priorityStyles[activity.priority]
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={typeColors[activity.type]} size="xs" className="capitalize">
                  {activity.type}
                </Badge>
                {showTimestamp && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {activity.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {activity.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ActivityFeed
