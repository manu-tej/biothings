/**
 * Performance Optimization Toolkit
 * Immediate actions to make the UI snappy on M1 MacBooks
 */

import { useVirtualizer } from '@tanstack/react-virtual'
import dynamic from 'next/dynamic'
import React, { memo, useCallback, ComponentType, MemoExoticComponent, useRef } from 'react'

import { JSONValue, WebSocketPayload } from '../types/common.types'

// ============================================
// 1. MEMOIZATION UTILITIES
// ============================================

/**
 * Enhanced memo wrapper with deep comparison for objects
 */
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): MemoExoticComponent<ComponentType<P>> {
  return memo(Component, propsAreEqual || defaultPropsAreEqual)
}

function defaultPropsAreEqual<P extends object>(prevProps: P, nextProps: P): boolean {
  const keys1 = Object.keys(prevProps)
  const keys2 = Object.keys(nextProps)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    const val1 = prevProps[key as keyof P]
    const val2 = nextProps[key as keyof P]

    if (val1 !== val2) {
      // Deep check for objects (but not functions or React elements)
      if (
        typeof val1 === 'object' &&
        val1 !== null &&
        !isReactElement(val1) &&
        typeof val2 === 'object' &&
        val2 !== null
      ) {
        if (JSON.stringify(val1) !== JSON.stringify(val2)) return false
      } else {
        return false
      }
    }
  }

  return true
}

function isReactElement(value: unknown): boolean {
  return value && typeof value === 'object' && value !== null && '$$typeof' in value
}

// ============================================
// 2. VIRTUAL LIST COMPONENT
// ============================================


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
  className = '',
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof itemHeight === 'function' ? itemHeight : () => itemHeight,
    overscan,
  })

  return (
    <div ref={parentRef} className={`overflow-auto ${className}`} style={{ height }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// 3. WEBSOCKET MANAGER
// ============================================

type MessageHandler = (data: WebSocketPayload) => void
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export class WebSocketManager {
  private static instance: WebSocketManager
  private connections = new Map<string, WebSocket>()
  private subscribers = new Map<string, Set<MessageHandler>>()
  private connectionStates = new Map<string, ConnectionState>()
  private reconnectAttempts = new Map<string, number>()
  private readonly MAX_CONNECTIONS = 3

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  subscribe(topic: string, handler: MessageHandler, config?: WebSocketConfig): () => void {
    // Get or create connection for this topic
    const connectionKey = this.getConnectionKey(topic)

    if (!this.connections.has(connectionKey)) {
      this.createConnection(connectionKey, config)
    }

    // Add subscriber
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set())
    }
    const topicSubs = this.subscribers.get(topic)
    if (topicSubs) {
      topicSubs.add(handler)
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.subscribers.delete(topic)
          this.checkAndCloseConnection(connectionKey)
        }
      }
    }
  }

  private getConnectionKey(topic: string): string {
    // Simple hash to distribute topics across connections
    const hash = topic.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return `connection_${hash % this.MAX_CONNECTIONS}`
  }

  private createConnection(key: string, config?: WebSocketConfig) {
    const url = config?.url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
    const ws = new WebSocket(url, config?.protocols)

    this.connections.set(key, ws)
    this.connectionStates.set(key, 'connecting')
    this.reconnectAttempts.set(key, 0)

    ws.onopen = () => {
      this.connectionStates.set(key, 'connected')
      this.reconnectAttempts.set(key, 0)
      // eslint-disable-next-line no-console
      console.log(`WebSocket ${key} connected`)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const topic = data.topic || 'default'
        const handlers = this.subscribers.get(topic)

        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(data)
            } catch (error) {
              console.error('Handler error:', error)
            }
          })
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error)
      }
    }

    ws.onerror = (error) => {
      this.connectionStates.set(key, 'error')
      console.error(`WebSocket ${key} error:`, error)
    }

    ws.onclose = () => {
      this.connectionStates.set(key, 'disconnected')
      this.connections.delete(key)

      // Attempt reconnection if there are active subscribers
      if (this.hasActiveSubscribers(key)) {
        this.attemptReconnection(key, config)
      }
    }
  }

  private hasActiveSubscribers(connectionKey: string): boolean {
    // Check if any topics are using this connection
    for (const [topic] of this.subscribers) {
      if (this.getConnectionKey(topic) === connectionKey) {
        return true
      }
    }
    return false
  }

  private attemptReconnection(key: string, config?: WebSocketConfig) {
    const attempts = this.reconnectAttempts.get(key) || 0
    const maxAttempts = config?.maxReconnectAttempts || 5
    const interval = config?.reconnectInterval || 5000

    if (attempts < maxAttempts) {
      setTimeout(
        () => {
          // eslint-disable-next-line no-console
          console.log(`Attempting reconnection ${key} (${attempts + 1}/${maxAttempts})`)
          this.reconnectAttempts.set(key, attempts + 1)
          this.createConnection(key, config)
        },
        interval * Math.pow(2, attempts)
      ) // Exponential backoff
    }
  }

  private checkAndCloseConnection(key: string) {
    if (!this.hasActiveSubscribers(key)) {
      const ws = this.connections.get(key)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
        this.connections.delete(key)
      }
    }
  }

  send(topic: string, data: WebSocketPayload) {
    const connectionKey = this.getConnectionKey(topic)
    const ws = this.connections.get(connectionKey)

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ topic, ...data }))
    } else {
      console.warn(`WebSocket ${connectionKey} not ready for topic ${topic}`)
    }
  }

  getConnectionState(topic: string): ConnectionState {
    const key = this.getConnectionKey(topic)
    return this.connectionStates.get(key) || 'disconnected'
  }
}

// ============================================
// 4. OPTIMIZED API CLIENT
// ============================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  etag?: string
}

interface RequestConfig extends RequestInit {
  cache?: boolean
  cacheTTL?: number
  dedupe?: boolean
  batch?: boolean
}

export class OptimizedAPIClient {
  private cache = new Map<string, CacheEntry<JSONValue>>()
  private pending = new Map<string, Promise<JSONValue>>()
  private batchQueue: Array<{ url: string; resolve: (value: JSONValue) => void; reject: (reason?: Error) => void }> = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  async get<T = JSONValue>(url: string, config: RequestConfig = {}): Promise<T> {
    // Check cache first
    if (config.cache !== false) {
      const cached = this.getFromCache<T>(url)
      if (cached !== null) return cached
    }

    // Deduplicate pending requests
    if (config.dedupe !== false) {
      const pendingKey = `GET:${url}`
      if (this.pending.has(pendingKey)) {
        return this.pending.get(pendingKey)
      }

      const promise = this.fetchWithCache<T>(url, config).finally(() =>
        this.pending.delete(pendingKey)
      )

      this.pending.set(pendingKey, promise)
      return promise
    }

    // Batch if requested
    if (config.batch) {
      return this.addToBatch<T>(url)
    }

    return this.fetchWithCache<T>(url, config)
  }

  private getFromCache<T>(url: string): T | null {
    const entry = this.cache.get(url)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > this.DEFAULT_CACHE_TTL) {
      this.cache.delete(url)
      return null
    }

    return entry.data
  }

  private async fetchWithCache<T>(url: string, config: RequestConfig): Promise<T> {
    const cacheEntry = this.cache.get(url)
    const headers = new Headers(config.headers)

    if (cacheEntry?.etag) {
      headers.set('If-None-Match', cacheEntry.etag)
    }

    const response = await fetch(url, {
      ...config,
      headers,
    })

    if (response.status === 304 && cacheEntry) {
      // Not modified, return cached data
      return cacheEntry.data
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const etag = response.headers.get('ETag')

    // Update cache
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      etag: etag || undefined,
    })

    return data
  }

  private addToBatch<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ url, resolve, reject })

      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), 10)
      }
    })
  }

  private async processBatch() {
    if (this.batchQueue.length === 0) return

    const batch = [...this.batchQueue]
    this.batchQueue = []
    this.batchTimer = null

    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map((item) => ({ url: item.url })),
        }),
      })

      const results = await response.json()

      batch.forEach((item, index) => {
        const result = results[index]
        if (result.error) {
          item.reject(new Error(result.error))
        } else {
          // Cache the result
          this.cache.set(item.url, {
            data: result.data,
            timestamp: Date.now(),
          })
          item.resolve(result.data)
        }
      })
    } catch (error) {
      batch.forEach((item) => item.reject(error))
    }
  }

  clearCache(pattern?: RegExp) {
    if (pattern) {
      for (const [key] of this.cache) {
        if (pattern.test(key)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }
}

// ============================================
// 5. PERFORMANCE MONITORING
// ============================================

export class PerformanceMonitor {
  private marks = new Map<string, number>()
  private measures: Array<{ name: string; duration: number }> = []

  mark(name: string) {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark)
    if (!start) {
      console.warn(`Start mark "${startMark}" not found`)
      return
    }

    const end = endMark ? this.marks.get(endMark) : performance.now()
    if (!end) {
      console.warn(`End mark "${endMark}" not found`)
      return
    }

    const duration = end - start
    this.measures.push({ name, duration })

    if (duration > 100) {
      console.warn(`Performance: ${name} took ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  getAverageFrameTime(): number {
    let lastTime = performance.now()
    let frameCount = 0
    let totalTime = 0

    const measureFrame = () => {
      const currentTime = performance.now()
      const frameTime = currentTime - lastTime
      totalTime += frameTime
      frameCount++
      lastTime = currentTime

      if (frameCount < 60) {
        requestAnimationFrame(measureFrame)
      }
    }

    requestAnimationFrame(measureFrame)

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(totalTime / frameCount)
      }, 1100)
    })
  }

  logMetrics() {
    // eslint-disable-next-line no-console
    console.table(this.measures)
  }
}

// ============================================
// 6. LAZY LOADING UTILITIES
// ============================================

interface LazyComponentOptions {
  fallback?: React.ComponentType
  ssr?: boolean
  suspense?: boolean
}

export function lazyWithPreload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) {
  const LazyComponent = dynamic(factory, {
    loading: options.fallback || (() => React.createElement('div', null, 'Loading...')),
    ssr: options.ssr ?? false,
    suspense: options.suspense ?? false,
  })

  // Add preload method
  ;(LazyComponent as typeof LazyComponent & { preload?: () => Promise<{ default: T }> }).preload = factory

  return LazyComponent
}

// Preload on hover/focus
export function usePreloadOnInteraction(component: { preload?: () => void }, delay: number = 200) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleInteractionStart = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      if (component.preload) {
        component.preload()
      }
    }, delay)
  }, [component, delay])

  const handleInteractionEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    onMouseEnter: handleInteractionStart,
    onFocus: handleInteractionStart,
    onMouseLeave: handleInteractionEnd,
    onBlur: handleInteractionEnd,
  }
}

// Export singleton instances
export const wsManager = WebSocketManager.getInstance()
export const apiClient = new OptimizedAPIClient()
export const perfMonitor = new PerformanceMonitor()
