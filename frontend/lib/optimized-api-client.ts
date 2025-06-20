/**
 * Optimized API client with caching and request deduplication
 */

import { config } from './config'

interface CacheEntry {
  data: any
  timestamp: number
  etag?: string
}

class OptimizedAPIClient {
  private cache = new Map<string, CacheEntry>()
  private pendingRequests = new Map<string, Promise<any>>()
  private cacheTimeout = 30000 // 30 seconds default cache
  
  constructor() {
    // Clean up old cache entries periodically
    setInterval(() => this.cleanupCache(), 60000)
  }

  private cleanupCache() {
    const now = Date.now()
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.cacheTimeout * 2) {
        this.cache.delete(key)
      }
    })
  }

  private async fetchWithCache(
    url: string, 
    options: RequestInit = {},
    cacheTime: number = this.cacheTimeout
  ): Promise<any> {
    const cacheKey = `${url}-${JSON.stringify(options)}`
    
    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)
    }
    
    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data
    }
    
    // Add ETag if we have one
    if (cached?.etag) {
      options.headers = {
        ...options.headers,
        'If-None-Match': cached.etag
      }
    }
    
    // Create pending request
    const pendingRequest = fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }).then(async response => {
      // Handle 304 Not Modified
      if (response.status === 304 && cached) {
        cached.timestamp = Date.now()
        return cached.data
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      const etag = response.headers.get('etag')
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        etag: etag || undefined
      })
      
      return data
    }).finally(() => {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey)
    })
    
    this.pendingRequests.set(cacheKey, pendingRequest)
    return pendingRequest
  }

  // Optimized API methods with aggressive caching
  async getAgents() {
    return this.fetchWithCache(`${config.api.baseUrl}/api/agents`, {}, 60000) // 1 minute cache
  }

  async getWorkflows() {
    return this.fetchWithCache(`${config.api.baseUrl}/api/workflows`, {}, 30000) // 30 second cache
  }

  async getMetrics() {
    return this.fetchWithCache(`${config.api.baseUrl}/api/monitoring/metrics/current`, {}, 10000) // 10 second cache
  }

  async getAlerts() {
    return this.fetchWithCache(`${config.api.baseUrl}/api/monitoring/alerts`, {}, 5000) // 5 second cache
  }

  async chat(agentId: string, message: string) {
    // Chat messages should not be cached
    const response = await fetch(`${config.api.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, message }),
    })
    
    if (!response.ok) {
      throw new Error('Chat request failed')
    }
    
    return response.json()
  }

  // Batch requests for efficiency
  async batchRequest(requests: Array<{ url: string; options?: RequestInit }>) {
    return Promise.all(
      requests.map(req => this.fetchWithCache(req.url, req.options))
    )
  }

  // Prefetch critical data
  async prefetchDashboardData() {
    // Fire off all requests in parallel
    await Promise.all([
      this.getAgents(),
      this.getWorkflows(),
      this.getMetrics(),
      this.getAlerts()
    ])
  }
}

export const optimizedApiClient = new OptimizedAPIClient()