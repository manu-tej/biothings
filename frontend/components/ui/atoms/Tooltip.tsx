'use client'

import { clsx } from 'clsx'
import React, { forwardRef, ReactNode, useState, useRef, useEffect } from 'react'

export interface TooltipProps {
  children: ReactNode
  content: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  delay?: number
  arrow?: boolean
  className?: string
  contentClassName?: string
  testId?: string
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      children,
      content,
      position = 'top',
      align = 'center',
      delay = 200,
      arrow = true,
      className,
      contentClassName,
      testId,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const timeoutRef = useRef<NodeJS.Timeout>()
    const triggerRef = useRef<HTMLDivElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const calculatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current || !isVisible) return

        const triggerRect = triggerRef.current.getBoundingClientRect()
        const tooltipRect = tooltipRef.current.getBoundingClientRect()
        const spacing = 8

        let top = 0
        let left = 0

        // Calculate base position
        switch (position) {
          case 'top':
            top = triggerRect.top - tooltipRect.height - spacing
            left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
            break
          case 'bottom':
            top = triggerRect.bottom + spacing
            left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
            break
          case 'left':
            top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
            left = triggerRect.left - tooltipRect.width - spacing
            break
          case 'right':
            top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
            left = triggerRect.right + spacing
            break
        }

        // Apply alignment adjustments
        if (position === 'top' || position === 'bottom') {
          if (align === 'start') {
            left = triggerRect.left
          } else if (align === 'end') {
            left = triggerRect.right - tooltipRect.width
          }
        } else if (position === 'left' || position === 'right') {
          if (align === 'start') {
            top = triggerRect.top
          } else if (align === 'end') {
            top = triggerRect.bottom - tooltipRect.height
          }
        }

        // Prevent tooltip from going off-screen
        const padding = 8
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        if (left < padding) left = padding
        if (left + tooltipRect.width > viewportWidth - padding) {
          left = viewportWidth - tooltipRect.width - padding
        }
        if (top < padding) top = padding
        if (top + tooltipRect.height > viewportHeight - padding) {
          top = viewportHeight - tooltipRect.height - padding
        }

        setCoords({ top, left })
      }

      calculatePosition()
      window.addEventListener('scroll', calculatePosition)
      window.addEventListener('resize', calculatePosition)

      return () => {
        window.removeEventListener('scroll', calculatePosition)
        window.removeEventListener('resize', calculatePosition)
      }
    }, [isVisible, position, align])

    const showTooltip = () => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true)
      }, delay)
    }

    const hideTooltip = () => {
      clearTimeout(timeoutRef.current)
      setIsVisible(false)
    }

    const arrowStyles = clsx(
      'absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45',
      position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
      position === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
      position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
      position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
    )

    const tooltipStyles = clsx(
      'fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700',
      'rounded-md shadow-lg pointer-events-none',
      'transition-opacity duration-200',
      isVisible ? 'opacity-100' : 'opacity-0',
      contentClassName
    )

    return (
      <>
        <div
          ref={triggerRef}
          className={clsx('inline-block', className)}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          onFocus={showTooltip}
          onBlur={hideTooltip}
          data-testid={testId}
        >
          {children}
        </div>
        {isVisible && content && (
          <div
            ref={tooltipRef}
            className={tooltipStyles}
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
          >
            {content}
            {arrow && <div className={arrowStyles} />}
          </div>
        )}
      </>
    )
  }
)

Tooltip.displayName = 'Tooltip'
