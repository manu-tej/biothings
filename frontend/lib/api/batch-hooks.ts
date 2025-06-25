/**
 * React Query hooks with batch API support
 * Automatically batches multiple queries for better performance
 */

import { useQuery, useMutation, useQueries, UseQueryOptions } from '@tanstack/react-query'

import { JSONValue, StringRecord } from '../types/common.types'

import { batchClient } from './batch-client'

/**
 * Batched query hook
 */
export function useBatchQuery<T = JSONValue>(
  key: string | string[],
  endpoint: string,
  params?: StringRecord<JSONValue>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => batchClient.get<T>(endpoint, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
    ...options,
  })
}

/**
 * Multiple batched queries
 */
export function useBatchQueries<_T extends JSONValue[]>(
  queries: Array<{
    key: string | string[]
    endpoint: string
    params?: StringRecord<JSONValue>
    options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
  }>
) {
  return useQueries({
    queries: queries.map((query) => ({
      queryKey: Array.isArray(query.key) ? query.key : [query.key],
      queryFn: () => batchClient.get(query.endpoint, query.params),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      ...query.options,
    })),
  })
}

/**
 * Batched mutation hook
 */
export function useBatchMutation<TData = JSONValue, TVariables = JSONValue>(
  method: 'POST' | 'PUT' | 'DELETE',
  endpoint: string | ((variables: TVariables) => string),
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables) => void
  }
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint

      switch (method) {
        case 'POST':
          return batchClient.post<TData>(url, variables)
        case 'PUT':
          return batchClient.put<TData>(url, variables)
        case 'DELETE':
          return batchClient.delete<TData>(url)
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
    },
    ...options,
  })
}

/**
 * Parallel requests hook
 */
export function useParallelQueries<T extends StringRecord<JSONValue>>(requests: {
  [K in keyof T]: {
    endpoint: string
    params?: StringRecord<JSONValue>
  }
}): {
  data: Partial<T>
  isLoading: boolean
  error: Error | null
} {
  const keys = Object.keys(requests)
  const queries = useQueries({
    queries: keys.map((key) => ({
      queryKey: [key, requests[key].endpoint, requests[key].params],
      queryFn: () => batchClient.get(requests[key].endpoint, requests[key].params),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const data: Partial<T> = {}
  let isLoading = false
  let error: Error | null = null

  queries.forEach((query, index) => {
    const key = keys[index]
    if (query.data) {
      data[key as keyof T] = query.data
    }
    if (query.isLoading) {
      isLoading = true
    }
    if (query.error && !error) {
      error = query.error as Error
    }
  })

  return { data, isLoading, error }
}

/**
 * Dashboard data hook - fetches multiple endpoints efficiently
 */
export function useDashboardData() {
  return useParallelQueries({
    agents: { endpoint: '/api/agents' },
    workflows: { endpoint: '/api/workflows' },
    experiments: { endpoint: '/api/experiments' },
    metrics: { endpoint: '/api/metrics/summary' },
    alerts: { endpoint: '/api/alerts', params: { limit: 10 } },
  })
}

/**
 * Laboratory data hook - batches all laboratory queries
 */
export function useLaboratoryData() {
  const queries = useBatchQueries([
    { key: ['experiments'], endpoint: '/api/experiments' },
    { key: ['equipment'], endpoint: '/api/equipment' },
    { key: ['simulations'], endpoint: '/api/simulations' },
    { key: ['analysis-templates'], endpoint: '/api/analysis/templates' },
  ])

  return {
    experiments: queries[0].data,
    equipment: queries[1].data,
    simulations: queries[2].data,
    templates: queries[3].data,
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error,
  }
}

/**
 * Agent hierarchy hook - efficiently loads agent tree
 */
export function useAgentHierarchy() {
  // First, get all agents
  const { data: agents, isLoading: agentsLoading } = useBatchQuery(['agents', 'all'], '/api/agents')

  // Then batch load subordinate details for executives
  const executives =
    agents?.filter((a: StringRecord<JSONValue>) => ['CEO', 'COO', 'CFO', 'CTO', 'CSO'].includes(a.agent_type as string)) || []

  const subordinateQueries = useBatchQueries(
    executives.map((exec: StringRecord<JSONValue>) => ({
      key: ['agent-subordinates', exec.id],
      endpoint: `/api/agents/${exec.id}/subordinates`,
      options: {
        enabled: !!agents, // Only run when we have agents
      },
    }))
  )

  return {
    agents,
    subordinates: subordinateQueries.map((q) => q.data).filter(Boolean),
    isLoading: agentsLoading || subordinateQueries.some((q) => q.isLoading),
  }
}
