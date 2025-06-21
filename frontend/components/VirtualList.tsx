'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'

interface VirtualListProps<T> {
  items: T[]
  height: number
  itemHeight: number | ((index: number) => number)
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className = ''
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  
  // Calculate item heights
  const getItemHeight = useCallback((index: number) => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
  }, [itemHeight])
  
  // Calculate which items are visible
  const calculateVisibleRange = useCallback(() => {
    if (!items.length) return { start: 0, end: 0 }
    
    let accumulatedHeight = 0
    let start = 0
    let end = items.length
    
    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i)
      if (accumulatedHeight + height > scrollTop) {
        start = Math.max(0, i - overscan)
        break
      }
      accumulatedHeight += height
    }
    
    // Find end index
    accumulatedHeight = 0
    for (let i = start; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + height) {
        end = Math.min(items.length, i + overscan)
        break
      }
      accumulatedHeight += getItemHeight(i)
    }
    
    return { start, end }
  }, [items.length, scrollTop, height, overscan, getItemHeight])
  
  const { start, end } = calculateVisibleRange()
  
  // Calculate total height
  const totalHeight = items.reduce((acc, _, index) => acc + getItemHeight(index), 0)
  
  // Calculate offset for visible items
  const getItemOffset = (index: number) => {
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i)
    }
    return offset
  }
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])
  
  return (
    <div
      ref={scrollRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%'
        }}
      >
        {items.slice(start, end).map((item, index) => {
          const actualIndex = start + index
          const offset = getItemOffset(actualIndex)
          const height = getItemHeight(actualIndex)
          
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: offset,
                left: 0,
                right: 0,
                height
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          )
        })}
      </div>
    </div>
  )
}