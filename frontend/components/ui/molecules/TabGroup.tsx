'use client'

import { clsx } from 'clsx'
import { X } from 'lucide-react'
import React, { useState, forwardRef, useCallback } from 'react'

import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'

export interface TabItem {
  id: string
  label: string
  content?: React.ReactNode
  icon?: React.ReactNode
  badge?: string | number
  disabled?: boolean
  closeable?: boolean
  href?: string
}

export interface TabGroupProps {
  tabs: TabItem[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'horizontal' | 'vertical'
  fullWidth?: boolean
  scrollable?: boolean
  className?: string
  tabsClassName?: string
  contentClassName?: string
  testId?: string
}

const sizeStyles = {
  sm: {
    tab: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
    badge: 'xs',
  },
  md: {
    tab: 'px-4 py-2 text-base',
    icon: 'w-5 h-5',
    badge: 'sm',
  },
  lg: {
    tab: 'px-6 py-3 text-lg',
    icon: 'w-6 h-6',
    badge: 'md',
  },
} as const

const variantStyles = {
  default: {
    container: 'border-b border-gray-200 dark:border-gray-700',
    tab: 'border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600',
    activeTab: 'border-blue-500 text-blue-600 dark:text-blue-400',
    inactiveTab: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
  },
  pills: {
    container: '',
    tab: 'rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800',
    activeTab: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    inactiveTab: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
  },
  underline: {
    container: '',
    tab: 'border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600',
    activeTab: 'border-blue-500 text-blue-600 dark:text-blue-400',
    inactiveTab: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
  },
  minimal: {
    container: '',
    tab: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    activeTab: 'text-blue-600 dark:text-blue-400 bg-gray-50 dark:bg-gray-800/50',
    inactiveTab: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
  },
}

export const TabGroup = forwardRef<HTMLDivElement, TabGroupProps>(
  (
    {
      tabs,
      activeTab,
      onTabChange,
      onTabClose,
      variant = 'default',
      size = 'md',
      orientation = 'horizontal',
      fullWidth = false,
      scrollable = false,
      className,
      tabsClassName,
      contentClassName,
      testId,
    },
    ref
  ) => {
    const [internalActiveTab, setInternalActiveTab] = useState(activeTab || tabs[0]?.id)

    const currentActiveTab = activeTab !== undefined ? activeTab : internalActiveTab
    const activeTabContent = tabs.find((tab) => tab.id === currentActiveTab)?.content

    const sizes = sizeStyles[size]
    const styles = variantStyles[variant]

    const handleTabClick = useCallback(
      (tab: TabItem) => {
        if (tab.disabled) return

        if (tab.href) {
          window.location.href = tab.href
          return
        }

        if (activeTab === undefined) {
          setInternalActiveTab(tab.id)
        }
        onTabChange?.(tab.id)
      },
      [activeTab, onTabChange]
    )

    const handleTabClose = useCallback(
      (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation()
        onTabClose?.(tabId)
      },
      [onTabClose]
    )

    const tabsContainerClass = clsx(
      'flex',
      orientation === 'horizontal' ? 'flex-row' : 'flex-col',
      orientation === 'horizontal' && scrollable && 'overflow-x-auto',
      orientation === 'vertical' && scrollable && 'overflow-y-auto',
      fullWidth && orientation === 'horizontal' && 'w-full',
      styles.container,
      tabsClassName
    )

    const tabListClass = clsx(
      'flex',
      orientation === 'horizontal' ? 'flex-row' : 'flex-col',
      fullWidth && orientation === 'horizontal' && 'w-full',
      scrollable && 'flex-shrink-0'
    )

    return (
      <div
        ref={ref}
        className={clsx('w-full', orientation === 'vertical' && 'flex gap-6', className)}
        data-testid={testId}
      >
        <div className={tabsContainerClass}>
          <div className={tabListClass} role="tablist">
            {tabs.map((tab) => {
              const isActive = tab.id === currentActiveTab
              const isDisabled = tab.disabled

              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-disabled={isDisabled}
                  disabled={isDisabled}
                  className={clsx(
                    'inline-flex items-center gap-2 font-medium transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    sizes.tab,
                    styles.tab,
                    isActive ? styles.activeTab : styles.inactiveTab,
                    fullWidth && orientation === 'horizontal' && 'flex-1 justify-center',
                    variant === 'pills' && 'rounded-lg',
                    orientation === 'vertical' && 'justify-start w-full'
                  )}
                  onClick={() => handleTabClick(tab)}
                >
                  {tab.icon && <span className={clsx('inline-flex', sizes.icon)}>{tab.icon}</span>}
                  <span className="truncate">{tab.label}</span>
                  {tab.badge && (
                    <Badge size={sizes.badge} variant={isActive ? 'primary' : 'secondary'}>
                      {tab.badge}
                    </Badge>
                  )}
                  {tab.closeable && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={(e) => handleTabClose(e, tab.id)}
                      icon={<X />}
                      className="ml-1 hover:bg-red-100 dark:hover:bg-red-900/30"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTabContent && (
          <div
            className={clsx('mt-4', orientation === 'vertical' && 'mt-0 flex-1', contentClassName)}
            role="tabpanel"
          >
            {activeTabContent}
          </div>
        )}
      </div>
    )
  }
)

TabGroup.displayName = 'TabGroup'

// Controlled tab hook for external state management
export const useTabGroup = (defaultTab?: string) => {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return {
    activeTab,
    setActiveTab,
    onTabChange: setActiveTab,
  }
}
