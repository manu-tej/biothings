'use client'

import { clsx } from 'clsx'
import {
  Grid3X3,
  Plus,
  Settings,
  Eye,
  EyeOff,
  Move,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import React, { forwardRef, useState, useMemo, useCallback } from 'react'

import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { Card } from '../atoms/Card'
import { Tooltip } from '../atoms/Tooltip'

export interface DashboardGridItem {
  id: string
  title: string
  component: React.ComponentType<any>
  props?: Record<string, any>
  size: {
    width: number // Grid columns (1-12)
    height: number // Grid rows
  }
  position?: {
    x: number // Grid column start (0-based)
    y: number // Grid row start (0-based)
  }
  minSize?: {
    width: number
    height: number
  }
  maxSize?: {
    width: number
    height: number
  }
  resizable?: boolean
  draggable?: boolean
  removable?: boolean
  collapsible?: boolean
  collapsed?: boolean
  visible?: boolean
  category?: string
  priority?: number
}

export interface DashboardGridProps {
  items: DashboardGridItem[]
  onItemsChange?: (items: DashboardGridItem[]) => void
  columns?: number
  rowHeight?: number
  gap?: number
  editable?: boolean
  responsive?: boolean
  autoLayout?: boolean
  showGrid?: boolean
  allowAdd?: boolean
  allowRemove?: boolean
  allowResize?: boolean
  allowDrag?: boolean
  onAddItem?: () => void
  onRemoveItem?: (itemId: string) => void
  onItemEdit?: (itemId: string) => void
  emptyState?: React.ReactNode
  className?: string
  testId?: string
}

export const DashboardGrid = forwardRef<HTMLDivElement, DashboardGridProps>(
  (
    {
      items,
      onItemsChange,
      columns = 12,
      rowHeight = 200,
      gap = 16,
      editable = false,
      responsive = true,
      autoLayout = false,
      showGrid = false,
      allowAdd = true,
      allowRemove = true,
      allowResize = true,
      allowDrag = true,
      onAddItem,
      onRemoveItem,
      onItemEdit,
      emptyState,
      className,
      testId,
    },
    ref
  ) => {
    const [draggedItem, setDraggedItem] = useState<string | null>(null)
    const [dragOverPosition, setDragOverPosition] = useState<{ x: number; y: number } | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [fullscreenItem, setFullscreenItem] = useState<string | null>(null)

    // Calculate layout
    const layout = useMemo(() => {
      const visibleItems = items.filter((item) => item.visible !== false)

      if (autoLayout) {
        // Auto-arrange items
        let currentX = 0
        let currentY = 0
        let maxRowHeight = 0

        return visibleItems.map((item) => {
          // Check if item fits in current row
          if (currentX + item.size.width > columns) {
            // Move to next row
            currentX = 0
            currentY += maxRowHeight
            maxRowHeight = 0
          }

          const position = { x: currentX, y: currentY }
          currentX += item.size.width
          maxRowHeight = Math.max(maxRowHeight, item.size.height)

          return { ...item, position }
        })
      }

      // Use explicit positions or fallback to auto-layout
      return visibleItems.map((item, index) => {
        if (item.position) {
          return item
        }

        // Simple auto-positioning for items without explicit position
        const x = (index * 3) % columns
        const y = Math.floor((index * 3) / columns) * 2
        return { ...item, position: { x, y } }
      })
    }, [items, columns, autoLayout])

    // Calculate grid height
    const gridHeight = useMemo(() => {
      const maxY = layout.reduce((max, item) => {
        const itemBottom = (item.position?.y || 0) + item.size.height
        return Math.max(max, itemBottom)
      }, 0)
      return maxY * rowHeight + (maxY - 1) * gap
    }, [layout, rowHeight, gap])

    const handleItemUpdate = useCallback(
      (itemId: string, updates: Partial<DashboardGridItem>) => {
        if (!onItemsChange) return

        const updatedItems = items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
        onItemsChange(updatedItems)
      },
      [items, onItemsChange]
    )

    const handleDragStart = useCallback(
      (itemId: string) => {
        if (!allowDrag || !editable) return
        setDraggedItem(itemId)
      },
      [allowDrag, editable]
    )

    const handleDragOver = useCallback((e: React.DragEvent, x: number, y: number) => {
      e.preventDefault()
      setDragOverPosition({ x, y })
    }, [])

    const handleDrop = useCallback(
      (e: React.DragEvent, x: number, y: number) => {
        e.preventDefault()
        if (!draggedItem) return

        handleItemUpdate(draggedItem, { position: { x, y } })
        setDraggedItem(null)
        setDragOverPosition(null)
      },
      [draggedItem, handleItemUpdate]
    )

    const handleItemToggle = useCallback(
      (itemId: string) => {
        const item = items.find((i) => i.id === itemId)
        if (!item?.collapsible) return

        handleItemUpdate(itemId, { collapsed: !item.collapsed })
      },
      [items, handleItemUpdate]
    )

    const handleItemRemove = useCallback(
      (itemId: string) => {
        if (!allowRemove || !editable) return

        if (onRemoveItem) {
          onRemoveItem(itemId)
        } else if (onItemsChange) {
          const filteredItems = items.filter((item) => item.id !== itemId)
          onItemsChange(filteredItems)
        }
      },
      [allowRemove, editable, onRemoveItem, onItemsChange, items]
    )

    const handleFullscreen = useCallback(
      (itemId: string) => {
        setFullscreenItem(fullscreenItem === itemId ? null : itemId)
        setIsFullscreen(fullscreenItem !== itemId)
      },
      [fullscreenItem]
    )

    const renderGridItem = (item: DashboardGridItem) => {
      const { position, size, collapsed, component: Component, props: componentProps } = item
      const isFullscreenActive = fullscreenItem === item.id

      if (!position) return null

      const gridItemStyle = isFullscreenActive
        ? {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1000,
          }
        : {
            gridColumn: `${position.x + 1} / span ${size.width}`,
            gridRow: `${position.y + 1} / span ${collapsed ? 1 : size.height}`,
          }

      return (
        <div
          key={item.id}
          style={gridItemStyle}
          className={clsx(
            'relative group',
            allowDrag && editable && 'cursor-move',
            draggedItem === item.id && 'opacity-50'
          )}
          draggable={allowDrag && editable}
          onDragStart={() => handleDragStart(item.id)}
        >
          <Card
            variant="default"
            padding="none"
            className={clsx(
              'h-full transition-shadow',
              'group-hover:shadow-lg',
              isFullscreenActive && 'shadow-2xl'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.title}
                </h3>
                {item.category && (
                  <Badge size="xs" variant="secondary">
                    {item.category}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.collapsible && (
                  <Tooltip content={collapsed ? 'Expand' : 'Collapse'}>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleItemToggle(item.id)}
                      icon={collapsed ? <Eye /> : <EyeOff />}
                    />
                  </Tooltip>
                )}

                <Tooltip content={isFullscreenActive ? 'Exit Fullscreen' : 'Fullscreen'}>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleFullscreen(item.id)}
                    icon={isFullscreenActive ? <Minimize2 /> : <Maximize2 />}
                  />
                </Tooltip>

                {editable && onItemEdit && (
                  <Tooltip content="Edit Item">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => onItemEdit(item.id)}
                      icon={<Settings />}
                    />
                  </Tooltip>
                )}

                {editable && allowRemove && item.removable !== false && (
                  <Tooltip content="Remove Item">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleItemRemove(item.id)}
                      icon={<Trash2 />}
                      className="text-red-500 hover:text-red-600"
                    />
                  </Tooltip>
                )}

                {allowDrag && editable && (
                  <Tooltip content="Drag to Move">
                    <Button size="xs" variant="ghost" icon={<Move />} className="cursor-move" />
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Content */}
            {!collapsed && (
              <div className="p-3 h-full overflow-auto">
                {Component && <Component {...componentProps} isFullscreen={isFullscreenActive} />}
              </div>
            )}
          </Card>

          {/* Resize handles */}
          {allowResize && editable && !isFullscreenActive && (
            <>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 hover:bg-gray-600 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-gray-400 hover:bg-gray-600 cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-gray-400 hover:bg-gray-600 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </div>
      )
    }

    const renderDropZone = (x: number, y: number) => {
      const isActive = dragOverPosition?.x === x && dragOverPosition?.y === y

      return (
        <div
          key={`drop-${x}-${y}`}
          className={clsx(
            'border-2 border-dashed transition-colors',
            isActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600',
            draggedItem && 'opacity-100',
            !draggedItem && 'opacity-0'
          )}
          style={{
            gridColumn: `${x + 1} / span 1`,
            gridRow: `${y + 1} / span 1`,
          }}
          onDragOver={(e) => handleDragOver(e, x, y)}
          onDrop={(e) => handleDrop(e, x, y)}
        />
      )
    }

    const renderGrid = () => {
      if (layout.length === 0 && emptyState) {
        return <div className="flex items-center justify-center h-64">{emptyState}</div>
      }

      if (layout.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Grid3X3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Dashboard Items
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add items to customize your dashboard
            </p>
            {allowAdd && onAddItem && (
              <Button onClick={onAddItem} icon={<Plus />}>
                Add Item
              </Button>
            )}
          </div>
        )
      }

      return (
        <div
          className={clsx('grid w-full', showGrid && 'bg-gray-50 dark:bg-gray-900/50')}
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridTemplateRows: `repeat(auto-fit, ${rowHeight}px)`,
            gap: `${gap}px`,
            minHeight: gridHeight,
          }}
        >
          {/* Render drop zones when dragging */}
          {draggedItem &&
            editable &&
            allowDrag &&
            Array.from({ length: columns * Math.ceil(gridHeight / rowHeight) }).map((_, index) => {
              const x = index % columns
              const y = Math.floor(index / columns)
              return renderDropZone(x, y)
            })}

          {/* Render grid items */}
          {layout.map(renderGridItem)}
        </div>
      )
    }

    return (
      <div ref={ref} className={clsx('relative w-full', className)} data-testid={testId}>
        {/* Header */}
        {(editable || allowAdd) && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dashboard</h2>
              <Badge size="sm" variant="secondary">
                {layout.length} items
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {allowAdd && onAddItem && (
                <Button size="sm" onClick={onAddItem} icon={<Plus />}>
                  Add Item
                </Button>
              )}
              {editable && (
                <Button size="sm" variant="outline" icon={<Settings />}>
                  Layout Settings
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Grid */}
        {renderGrid()}

        {/* Fullscreen overlay */}
        {isFullscreen && (
          <div
            className="fixed inset-0 bg-black/50 z-999"
            onClick={() => handleFullscreen(fullscreenItem!)}
          />
        )}
      </div>
    )
  }
)

DashboardGrid.displayName = 'DashboardGrid'
