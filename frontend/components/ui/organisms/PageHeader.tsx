'use client'

import { clsx } from 'clsx'
import { Bell, Search, User, Moon, Sun, Monitor, Settings, LogOut, ChevronDown } from 'lucide-react'
import React from 'react'
import { useState, useRef, useEffect } from 'react'

import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { useUIStore } from '@/lib/stores/uiStore'
import { useWebSocketStore } from '@/lib/stores/websocketStore'

import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { Input } from '../atoms/Input'

export interface PageHeaderProps {
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({ className }) => {
  const { preferences, activeFilters, setTheme, updateFilters } = useUIStore()
  const { notifications } = useDashboardStore()
  const { getConnectionStatus } = useWebSocketStore()

  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadNotifications = notifications.filter((n) => !n.read)
  const connectionStatus = getConnectionStatus('dashboard')

  const handleThemeToggle = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(preferences.theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
  }

  const getThemeIcon = () => {
    switch (preferences.theme) {
      case 'light':
        return <Sun className="w-4 h-4" />
      case 'dark':
        return <Moon className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  const handleSearch = (query: string) => {
    updateFilters({ globalSearch: query })
  }

  return (
    <header
      className={clsx(
        'flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Left Section - Search */}
      <div className="flex items-center space-x-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Input
            placeholder="Search agents, workflows, or settings..."
            value={activeFilters.globalSearch}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<Search />}
            className="w-full"
          />
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-2">
        {/* Connection Status */}
        <Badge
          variant={connectionStatus === 'connected' ? 'success' : 'danger'}
          size="sm"
          className="hidden md:flex"
        >
          {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
        </Badge>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThemeToggle}
          icon={getThemeIcon()}
          className="p-2"
          title={`Current theme: ${preferences.theme}`}
        />

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            icon={<Bell className="w-4 h-4" />}
            className="p-2 relative"
          >
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
              </span>
            )}
          </Button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  <Badge variant="secondary" size="xs">
                    {unreadNotifications.length} new
                  </Badge>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={clsx(
                        'p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer',
                        !notification.read && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={clsx(
                            'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                            notification.type === 'error' && 'bg-red-500',
                            notification.type === 'warning' && 'bg-yellow-500',
                            notification.type === 'success' && 'bg-green-500',
                            notification.type === 'info' && 'bg-blue-500'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {notification.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 5 && (
                <div className="p-3 text-center border-t border-gray-200 dark:border-gray-700">
                  <Button variant="ghost" size="sm">
                    View all notifications
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </Button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Admin User</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">admin@biothings.ai</p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
