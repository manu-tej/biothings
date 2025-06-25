'use client'

import { clsx } from 'clsx'
import {
  Bell,
  BellOff,
  X,
  Check,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Settings,
  Search,
  Trash2,
} from 'lucide-react'
import React, { forwardRef, useState, useMemo, useCallback, useEffect } from 'react'

import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { Card } from '../atoms/Card'
import { Checkbox } from '../atoms/Checkbox'
import { Input } from '../atoms/Input'
import { Select, SelectOption } from '../atoms/Select'
import { Tooltip } from '../atoms/Tooltip'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  persistent?: boolean
  actions?: {
    label: string
    action: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }[]
  source?: string
  category?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  metadata?: Record<string, any>
}

export interface NotificationCenterProps {
  notifications: Notification[]
  onNotificationUpdate?: (notification: Partial<Notification> & { id: string }) => void
  onNotificationRemove?: (notificationId: string) => void
  onNotificationsClear?: (filter?: 'all' | 'read' | 'unread') => void
  onMarkAllRead?: () => void
  maxHeight?: number
  showSearch?: boolean
  showFilters?: boolean
  groupByDate?: boolean
  groupByCategory?: boolean
  autoMarkReadOnView?: boolean
  dismissTimeout?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  variant?: 'popover' | 'sidebar' | 'inline'
  className?: string
  testId?: string
}

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
}

const typeVariants = {
  info: 'info' as const,
  success: 'success' as const,
  warning: 'warning' as const,
  error: 'danger' as const,
}

const priorityColors = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
}

const filterOptions: SelectOption[] = [
  { value: 'all', label: 'All Notifications' },
  { value: 'unread', label: 'Unread Only' },
  { value: 'read', label: 'Read Only' },
]

const typeFilterOptions: SelectOption[] = [
  { value: '', label: 'All Types' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
]

export const NotificationCenter = forwardRef<HTMLDivElement, NotificationCenterProps>(
  (
    {
      notifications,
      onNotificationUpdate,
      onNotificationRemove,
      onNotificationsClear,
      onMarkAllRead,
      maxHeight = 400,
      showSearch = true,
      showFilters = true,
      groupByDate = true,
      groupByCategory = false,
      autoMarkReadOnView = true,
      dismissTimeout = 5000,
      position = 'top-right',
      variant = 'popover',
      className,
      testId,
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('')
    const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
    const [isExpanded, setIsExpanded] = useState(variant === 'inline')

    // Auto-dismiss notifications
    useEffect(() => {
      if (dismissTimeout <= 0) return

      const timers = notifications
        .filter((notification) => !notification.persistent && !notification.read)
        .map((notification) => {
          const timeElapsed = Date.now() - notification.timestamp.getTime()
          const remainingTime = Math.max(0, dismissTimeout - timeElapsed)

          return setTimeout(() => {
            if (autoMarkReadOnView) {
              onNotificationUpdate?.({ id: notification.id, read: true })
            } else {
              onNotificationRemove?.(notification.id)
            }
          }, remainingTime)
        })

      return () => {
        timers.forEach((timer) => clearTimeout(timer))
      }
    }, [
      notifications,
      dismissTimeout,
      autoMarkReadOnView,
      onNotificationUpdate,
      onNotificationRemove,
    ])

    // Filter and group notifications
    const { filteredNotifications, groupedNotifications } = useMemo(() => {
      let filtered = notifications

      // Search filter
      if (searchQuery) {
        filtered = filtered.filter(
          (notification) =>
            notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notification.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notification.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Status filter
      if (statusFilter === 'read') {
        filtered = filtered.filter((notification) => notification.read)
      } else if (statusFilter === 'unread') {
        filtered = filtered.filter((notification) => !notification.read)
      }

      // Type filter
      if (typeFilter) {
        filtered = filtered.filter((notification) => notification.type === typeFilter)
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      // Group notifications
      const grouped: Record<string, Notification[]> = {}

      if (groupByCategory) {
        filtered.forEach((notification) => {
          const key = notification.category || 'Other'
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(notification)
        })
      } else if (groupByDate) {
        filtered.forEach((notification) => {
          const date = notification.timestamp.toDateString()
          if (!grouped[date]) grouped[date] = []
          grouped[date].push(notification)
        })
      } else {
        grouped['All'] = filtered
      }

      return { filteredNotifications: filtered, groupedNotifications: grouped }
    }, [notifications, searchQuery, statusFilter, typeFilter, groupByDate, groupByCategory])

    const unreadCount = notifications.filter((n) => !n.read).length

    const handleNotificationClick = useCallback(
      (notification: Notification) => {
        if (!notification.read && autoMarkReadOnView) {
          onNotificationUpdate?.({ id: notification.id, read: true })
        }
      },
      [autoMarkReadOnView, onNotificationUpdate]
    )

    const handleNotificationAction = useCallback(
      (notificationId: string, action: () => void) => {
        action()
        // Optionally mark as read after action
        onNotificationUpdate?.({ id: notificationId, read: true })
      },
      [onNotificationUpdate]
    )

    const handleSelectNotification = useCallback(
      (notificationId: string, selected: boolean) => {
        const newSelection = new Set(selectedNotifications)
        if (selected) {
          newSelection.add(notificationId)
        } else {
          newSelection.delete(notificationId)
        }
        setSelectedNotifications(newSelection)
      },
      [selectedNotifications]
    )

    const handleSelectAll = useCallback(
      (selected: boolean) => {
        if (selected) {
          const allIds = new Set(filteredNotifications.map((n) => n.id))
          setSelectedNotifications(allIds)
        } else {
          setSelectedNotifications(new Set())
        }
      },
      [filteredNotifications]
    )

    const handleBulkAction = useCallback(
      (action: 'read' | 'unread' | 'remove' | 'archive') => {
        const selectedIds = Array.from(selectedNotifications)

        selectedIds.forEach((id) => {
          switch (action) {
            case 'read':
              onNotificationUpdate?.({ id, read: true })
              break
            case 'unread':
              onNotificationUpdate?.({ id, read: false })
              break
            case 'remove':
              onNotificationRemove?.(id)
              break
            case 'archive':
              // Custom archive logic
              onNotificationUpdate?.({ id, read: true, metadata: { archived: true } })
              break
          }
        })

        setSelectedNotifications(new Set())
      },
      [selectedNotifications, onNotificationUpdate, onNotificationRemove]
    )

    const renderNotification = (notification: Notification) => {
      const TypeIcon = typeIcons[notification.type]
      const isSelected = selectedNotifications.has(notification.id)

      return (
        <div
          key={notification.id}
          className={clsx(
            'group flex items-start gap-3 p-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0',
            'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
            !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10',
            isSelected && 'bg-blue-100 dark:bg-blue-900/30'
          )}
          onClick={() => handleNotificationClick(notification)}
        >
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              handleSelectNotification(notification.id, e.target.checked)
            }}
            checkboxSize="sm"
            className="mt-1"
          />

          <div
            className={clsx(
              'flex-shrink-0 w-5 h-5 mt-1',
              typeVariants[notification.type] === 'info' && 'text-blue-500',
              typeVariants[notification.type] === 'success' && 'text-green-500',
              typeVariants[notification.type] === 'warning' && 'text-yellow-500',
              typeVariants[notification.type] === 'danger' && 'text-red-500'
            )}
          >
            <TypeIcon className="w-full h-full" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-2">
                <div className="flex items-center gap-2">
                  <h4
                    className={clsx(
                      'text-sm font-medium',
                      notification.read
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-900 dark:text-gray-100'
                    )}
                  >
                    {notification.title}
                  </h4>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                  {notification.priority && notification.priority !== 'medium' && (
                    <Badge
                      size="xs"
                      variant={
                        notification.priority === 'urgent'
                          ? 'danger'
                          : notification.priority === 'high'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {notification.priority}
                    </Badge>
                  )}
                </div>
                <p
                  className={clsx(
                    'text-sm mt-1',
                    notification.read
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {notification.message}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {notification.timestamp.toLocaleString()}
                  </span>
                  {notification.source && (
                    <>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {notification.source}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.read && (
                  <Tooltip content="Mark as read">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        onNotificationUpdate?.({ id: notification.id, read: true })
                      }}
                      icon={<Check />}
                    />
                  </Tooltip>
                )}

                <Tooltip content="Remove">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onNotificationRemove?.(notification.id)
                    }}
                    icon={<X />}
                    className="text-red-500 hover:text-red-600"
                  />
                </Tooltip>
              </div>
            </div>

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map((action, index) => (
                  <Button
                    key={index}
                    size="xs"
                    variant={action.variant || 'outline'}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNotificationAction(notification.id, action.action)
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    const renderHeader = () => (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <Badge size="sm" variant="primary">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onMarkAllRead && unreadCount > 0 && (
              <Tooltip content="Mark all as read">
                <Button size="sm" variant="ghost" onClick={onMarkAllRead} icon={<Check />} />
              </Tooltip>
            )}
            {onNotificationsClear && (
              <Tooltip content="Clear all">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onNotificationsClear('all')}
                  icon={<Trash2 />}
                />
              </Tooltip>
            )}
            <Tooltip content="Settings">
              <Button size="sm" variant="ghost" icon={<Settings />} />
            </Tooltip>
          </div>
        </div>

        {(showSearch || showFilters) && (
          <div className="space-y-2">
            {showSearch && (
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notifications..."
                inputSize="sm"
                icon={<Search />}
                clearable
                onClear={() => setSearchQuery('')}
              />
            )}

            {showFilters && (
              <div className="flex gap-2">
                <Select
                  options={filterOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  selectSize="sm"
                  className="flex-1"
                />
                <Select
                  options={typeFilterOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  selectSize="sm"
                  className="flex-1"
                />
              </div>
            )}
          </div>
        )}

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedNotifications.size === filteredNotifications.length}
                indeterminate={
                  selectedNotifications.size > 0 &&
                  selectedNotifications.size < filteredNotifications.length
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                checkboxSize="sm"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedNotifications.size} selected
              </span>
            </div>
            <div className="flex gap-1">
              <Button size="xs" variant="outline" onClick={() => handleBulkAction('read')}>
                Mark Read
              </Button>
              <Button size="xs" variant="outline" onClick={() => handleBulkAction('remove')}>
                Remove
              </Button>
            </div>
          </div>
        )}
      </div>
    )

    const renderContent = () => {
      if (filteredNotifications.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <BellOff className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all' || typeFilter
                ? 'No notifications match your filters'
                : 'No notifications'}
            </p>
          </div>
        )
      }

      return (
        <div className="overflow-auto" style={{ maxHeight: maxHeight }}>
          {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
            <div key={group}>
              {(groupByDate || groupByCategory) && Object.keys(groupedNotifications).length > 1 && (
                <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  {group}
                </div>
              )}
              {groupNotifications.map(renderNotification)}
            </div>
          ))}
        </div>
      )
    }

    return (
      <Card
        ref={ref}
        variant="default"
        padding="none"
        className={clsx(
          'flex flex-col',
          variant === 'popover' && 'shadow-lg border',
          variant === 'sidebar' && 'h-full',
          className
        )}
        testId={testId}
      >
        {renderHeader()}
        {renderContent()}
      </Card>
    )
  }
)

NotificationCenter.displayName = 'NotificationCenter'
