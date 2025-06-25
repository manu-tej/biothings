import Fuse, { FuseResultMatch } from 'fuse.js'

// Import from dashboard store for the actual data types
import type { Agent, WorkflowStatus } from '../stores/dashboardStore'

export interface SearchableItem {
  id: string
  title: string
  type: 'agent' | 'workflow' | 'setting'
  content: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface SearchResult {
  item: SearchableItem
  score: number
  matches: FuseResultMatch[]
}

export interface SearchHistory {
  id: string
  query: string
  timestamp: Date
  resultsCount: number
}

export interface SavedQuery {
  id: string
  name: string
  query: string
  filters: SearchFilters
  createdAt: Date
}

export interface SearchFilters {
  types: ('agent' | 'workflow' | 'setting')[]
  tags: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

export class SearchEngine {
  private fuse: Fuse<SearchableItem>
  private items: SearchableItem[] = []
  private history: SearchHistory[] = []
  private savedQueries: SavedQuery[] = []
  private readonly maxHistorySize = 50

  constructor() {
    const options = {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'content', weight: 1 },
        { name: 'tags', weight: 1.5 },
        { name: 'metadata.description', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
    }

    this.fuse = new Fuse([], options)
    this.loadFromStorage()
  }

  // Index management
  public updateIndex(items: SearchableItem[]): void {
    this.items = items
    this.fuse.setCollection(items)
  }

  public addItem(item: SearchableItem): void {
    this.items.push(item)
    this.fuse.setCollection(this.items)
  }

  public removeItem(id: string): void {
    this.items = this.items.filter((item) => item.id !== id)
    this.fuse.setCollection(this.items)
  }

  // Search functionality
  public search(query: string, filters?: SearchFilters): SearchResult[] {
    if (!query.trim()) return []

    let results = this.fuse.search(query)

    // Apply filters
    if (filters) {
      results = results.filter((result) => {
        const item = result.item

        // Type filter
        if (filters.types.length > 0 && !filters.types.includes(item.type)) {
          return false
        }

        // Tag filter
        if (filters.tags.length > 0 && item.tags) {
          const hasTag = filters.tags.some((tag) => item.tags?.includes(tag) ?? false)
          if (!hasTag) return false
        }

        // Date range filter (if item has a date in metadata)
        if (filters.dateRange && item.metadata?.date) {
          const itemDate = new Date(item.metadata.date)
          if (itemDate < filters.dateRange.start || itemDate > filters.dateRange.end) {
            return false
          }
        }

        return true
      })
    }

    // Add to search history
    this.addToHistory(query, results.length)

    return results.map((result) => ({
      item: result.item,
      score: result.score || 0,
      matches: (result.matches || []) as FuseResultMatch[],
    }))
  }

  // Quick search for command palette
  public quickSearch(query: string, limit: number = 10): SearchResult[] {
    const results = this.search(query)
    return results.slice(0, limit)
  }

  // Search history management
  private addToHistory(query: string, resultsCount: number): void {
    const historyItem: SearchHistory = {
      id: Date.now().toString(),
      query,
      timestamp: new Date(),
      resultsCount,
    }

    this.history.unshift(historyItem)

    // Keep only the most recent searches
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize)
    }

    this.saveToStorage()
  }

  public getSearchHistory(): SearchHistory[] {
    return this.history
  }

  public clearHistory(): void {
    this.history = []
    this.saveToStorage()
  }

  // Saved queries management
  public saveQuery(name: string, query: string, filters: SearchFilters): void {
    const savedQuery: SavedQuery = {
      id: Date.now().toString(),
      name,
      query,
      filters,
      createdAt: new Date(),
    }

    this.savedQueries.push(savedQuery)
    this.saveToStorage()
  }

  public getSavedQueries(): SavedQuery[] {
    return this.savedQueries
  }

  public deleteSavedQuery(id: string): void {
    this.savedQueries = this.savedQueries.filter((query) => query.id !== id)
    this.saveToStorage()
  }

  public executeSavedQuery(id: string): SearchResult[] {
    const savedQuery = this.savedQueries.find((query) => query.id === id)
    if (!savedQuery) return []

    return this.search(savedQuery.query, savedQuery.filters)
  }

  // Utility methods
  public getAvailableTags(): string[] {
    const allTags = this.items.flatMap((item) => item.tags || [])
    return Array.from(new Set(allTags)).sort()
  }

  public getSearchSuggestions(query: string): string[] {
    const suggestions = new Set<string>()

    // Add matches from search history
    this.history
      .filter((h) => h.query.toLowerCase().includes(query.toLowerCase()))
      .forEach((h) => suggestions.add(h.query))

    // Add matches from item titles
    this.items
      .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
      .forEach((item) => suggestions.add(item.title))

    return Array.from(suggestions).slice(0, 5)
  }

  // Data conversion helpers
  public static agentToSearchable(agent: Agent): SearchableItem {
    return {
      id: agent.id,
      title: agent.name,
      type: 'agent',
      content: `${agent.name} ${agent.status} ${agent.type}`,
      tags: agent.capabilities || [],
      metadata: {
        description: `${agent.type} agent with ${agent.status} status`,
        status: agent.status,
        type: agent.type,
        date: agent.lastActivity,
      },
    }
  }

  public static workflowToSearchable(workflow: WorkflowStatus): SearchableItem {
    return {
      id: workflow.id,
      title: workflow.name,
      type: 'workflow',
      content: `${workflow.name} ${workflow.status} ${workflow.currentStep || ''}`,
      tags: [], // WorkflowStatus doesn't have tags, could be extended later
      metadata: {
        status: workflow.status,
        progress: workflow.progress,
        currentStep: workflow.currentStep,
        date: workflow.startedAt,
      },
    }
  }

  // Storage management
  private saveToStorage(): void {
    try {
      const data = {
        history: this.history,
        savedQueries: this.savedQueries,
      }
      localStorage.setItem('biothings-search-data', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save search data:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('biothings-search-data')
      if (data) {
        const parsed = JSON.parse(data)
        this.history = parsed.history || []
        this.savedQueries = parsed.savedQueries || []
      }
    } catch (error) {
      console.error('Failed to load search data:', error)
    }
  }
}

// Global search engine instance
export const searchEngine = new SearchEngine()
