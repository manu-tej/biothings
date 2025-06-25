import { useState, useEffect, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { useDashboardStore } from '../stores/dashboardStore'

import {
  SearchEngine,
  searchEngine,
  SearchResult,
  SearchFilters,
  SearchHistory,
  SavedQuery,
} from './SearchEngine'

interface UseSearchOptions {
  enableHotkeys?: boolean
  autoFocus?: boolean
  defaultFilters?: SearchFilters
}

interface UseSearchReturn {
  // State
  query: string
  results: SearchResult[]
  filters: SearchFilters
  isSearching: boolean
  history: SearchHistory[]
  savedQueries: SavedQuery[]
  suggestions: string[]

  // Actions
  setQuery: (query: string) => void
  setFilters: (filters: SearchFilters) => void
  search: (query?: string) => void
  clearSearch: () => void
  saveQuery: (name: string) => void
  executeSavedQuery: (id: string) => void
  deleteSavedQuery: (id: string) => void
  clearHistory: () => void

  // UI helpers
  isOpen: boolean
  openSearch: () => void
  closeSearch: () => void
  toggleSearch: () => void
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    enableHotkeys = true,
    autoFocus = false,
    defaultFilters = { types: [], tags: [] },
  } = options

  // State
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters)
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<SearchHistory[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Store access
  const { agents, workflows } = useDashboardStore()

  // Update search index when data changes
  useEffect(() => {
    const searchableItems = [
      ...Array.from(agents.values()).map((agent) => SearchEngine.agentToSearchable(agent)),
      ...Array.from(workflows.values()).map((workflow) =>
        SearchEngine.workflowToSearchable(workflow)
      ),
    ]

    searchEngine.updateIndex(searchableItems)
  }, [agents, workflows])

  // Load initial data
  useEffect(() => {
    setHistory(searchEngine.getSearchHistory())
    setSavedQueries(searchEngine.getSavedQueries())
  }, [])

  // Search function
  const search = useCallback(
    (searchQuery?: string) => {
      const queryToUse = searchQuery !== undefined ? searchQuery : query
      if (!queryToUse.trim()) {
        setResults([])
        return
      }

      setIsSearching(true)

      try {
        const searchResults = searchEngine.search(queryToUse, filters)
        setResults(searchResults)

        // Update history
        setHistory(searchEngine.getSearchHistory())
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [query, filters]
  )

  // Update suggestions when query changes
  useEffect(() => {
    if (query.length > 1) {
      const newSuggestions = searchEngine.getSearchSuggestions(query)
      setSuggestions(newSuggestions)
    } else {
      setSuggestions([])
    }
  }, [query])

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query) {
        search()
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query, search])

  // Query management
  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setSuggestions([])
  }, [])

  // Saved queries management
  const saveQuery = useCallback(
    (name: string) => {
      if (query && name) {
        searchEngine.saveQuery(name, query, filters)
        setSavedQueries(searchEngine.getSavedQueries())
      }
    },
    [query, filters]
  )

  const executeSavedQuery = useCallback(
    (id: string) => {
      const results = searchEngine.executeSavedQuery(id)
      setResults(results)

      // Update query and filters from saved query
      const savedQuery = savedQueries.find((q) => q.id === id)
      if (savedQuery) {
        setQuery(savedQuery.query)
        setFilters(savedQuery.filters)
      }
    },
    [savedQueries]
  )

  const deleteSavedQuery = useCallback((id: string) => {
    searchEngine.deleteSavedQuery(id)
    setSavedQueries(searchEngine.getSavedQueries())
  }, [])

  const clearHistory = useCallback(() => {
    searchEngine.clearHistory()
    setHistory([])
  }, [])

  // Search modal management
  const openSearch = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    setIsOpen(false)
    if (!autoFocus) {
      clearSearch()
    }
  }, [autoFocus, clearSearch])

  const toggleSearch = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Keyboard shortcuts
  useHotkeys(
    'cmd+k, ctrl+k',
    (event) => {
      event.preventDefault()
      toggleSearch()
    },
    {
      enabled: enableHotkeys,
      enableOnFormTags: true,
    }
  )

  useHotkeys(
    'escape',
    () => {
      if (isOpen) {
        closeSearch()
      }
    },
    {
      enabled: enableHotkeys && isOpen,
      enableOnFormTags: true,
    }
  )

  return {
    // State
    query,
    results,
    filters,
    isSearching,
    history,
    savedQueries,
    suggestions,

    // Actions
    setQuery: handleSetQuery,
    setFilters,
    search,
    clearSearch,
    saveQuery,
    executeSavedQuery,
    deleteSavedQuery,
    clearHistory,

    // UI helpers
    isOpen,
    openSearch,
    closeSearch,
    toggleSearch,
  }
}

// Quick search hook for command palette
export function useQuickSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback((searchQuery: string, limit: number = 10) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)

    try {
      const searchResults = searchEngine.quickSearch(searchQuery, limit)
      setResults(searchResults)
    } catch (error) {
      console.error('Quick search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      search(query)
    }, 200)

    return () => clearTimeout(debounceTimer)
  }, [query, search])

  return {
    query,
    results,
    isSearching,
    setQuery,
    search,
  }
}
