/**
 * Batch API Client
 * Combines multiple API requests into single batched requests
 * Reduces network overhead and improves performance
 */

import type {
  JSONValue,
  StringRecord
} from '../types/common.types'

interface BatchRequest {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  params?: StringRecord<JSONValue>
  body?: JSONValue
}

interface BatchResponse {
  id: string
  status: number
  data?: JSONValue
  error?: string
}

interface PendingRequest {
  request: BatchRequest
  resolve: (data: JSONValue) => void
  reject: (error: Error) => void
}

export class BatchAPIClient {
  private batchQueue: PendingRequest[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 10
  private readonly BATCH_DELAY = 10 // ms
  private readonly MAX_BATCH_DELAY = 100 // ms
  private cache = new Map<string, { data: JSONValue; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }

  /**
   * Make a batched GET request
   */
  async get<T = JSONValue>(endpoint: string, params?: StringRecord<JSONValue>): Promise<T> {
    // Check cache first
    const cacheKey = this.getCacheKey('GET', endpoint, params)
    const cached = this.getFromCache(cacheKey)
    if (cached !== null) {
      return cached as T
    }

    return this.addToBatch<T>({
      id: this.generateRequestId(),
      method: 'GET',
      endpoint,
      params,
    }) as Promise<T>
  }

  /**
   * Make a batched POST request
   */
  async post<T = JSONValue>(endpoint: string, body?: JSONValue): Promise<T> {
    return this.addToBatch<T>({
      id: this.generateRequestId(),
      method: 'POST',
      endpoint,
      body,
    })
  }

  /**
   * Make a batched PUT request
   */
  async put<T = JSONValue>(endpoint: string, body?: JSONValue): Promise<T> {
    return this.addToBatch<T>({
      id: this.generateRequestId(),
      method: 'PUT',
      endpoint,
      body,
    })
  }

  /**
   * Make a batched DELETE request
   */
  async delete<T = JSONValue>(endpoint: string): Promise<T> {
    return this.addToBatch<T>({
      id: this.generateRequestId(),
      method: 'DELETE',
      endpoint,
    })
  }

  /**
   * Execute multiple requests in parallel (non-batched)
   */
  async parallel<T extends Record<string, Promise<JSONValue>>>(
    requests: T
  ): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
    const entries = Object.entries(requests)
    const results = await Promise.all(entries.map(([_, promise]) => promise))

    return Object.fromEntries(entries.map(([key], index) => [key, results[index]])) as {
      [K in keyof T]: Awaited<T[K]>
    }
  }

  /**
   * Add request to batch queue
   */
  private addToBatch<T>(request: BatchRequest): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.batchQueue.push({ 
        request, 
        resolve: resolve as (data: JSONValue) => void, 
        reject 
      })

      // If we've reached the batch size, process immediately
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        this.processBatch()
      } else {
        // Otherwise, schedule batch processing
        this.scheduleBatchProcessing()
      }
    })
  }

  /**
   * Schedule batch processing with a delay
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      return // Already scheduled
    }

    // Calculate delay based on queue size (process faster as queue grows)
    const delay = Math.max(
      this.BATCH_DELAY,
      Math.min(this.MAX_BATCH_DELAY, this.MAX_BATCH_DELAY - this.batchQueue.length * 10)
    )

    this.batchTimer = setTimeout(() => {
      this.processBatch()
    }, delay)
  }

  /**
   * Process the current batch queue
   */
  private async processBatch(): Promise<void> {
    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    // Get current batch
    const batch = [...this.batchQueue]
    this.batchQueue = []

    if (batch.length === 0) return

    try {
      // Send batch request
      const response = await fetch(`${this.baseUrl}/api/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: batch.map((item) => item.request),
        }),
      })

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.statusText}`)
      }

      const results: BatchResponse[] = await response.json()

      // Process results
      results.forEach((result, index) => {
        const { request, resolve, reject } = batch[index]

        if (result.error || result.status >= 400) {
          reject(new Error(result.error || `Request failed with status ${result.status}`))
        } else {
          // Cache successful GET requests
          if (request.method === 'GET' && result.data) {
            const cacheKey = this.getCacheKey(request.method, request.endpoint, request.params)
            this.setCache(cacheKey, result.data)
          }
          (resolve as (data: JSONValue) => void)(result.data)
        }
      })
    } catch (error) {
      // Reject all requests in batch
      batch.forEach(({ reject }) => reject(error))
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate cache key
   */
  private getCacheKey(method: string, endpoint: string, params?: StringRecord<JSONValue>): string {
    const paramStr = params ? JSON.stringify(params) : ''
    return `${method}:${endpoint}:${paramStr}`
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): JSONValue | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set cache data
   */
  private setCache(key: string, data: JSONValue): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: RegExp): void {
    if (pattern) {
      Array.from(this.cache.keys()).forEach(key => {
        if (pattern.test(key)) {
          this.cache.delete(key)
        }
      })
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    hits: number
    misses: number
    hitRate: number
  } {
    // In a real implementation, we would track hits/misses
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0,
      hitRate: 0,
    }
  }
}

// Create singleton instance
export const batchClient = new BatchAPIClient()
