# API Client Usage Examples

This guide provides practical examples for using the unified API client in various scenarios.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Error Handling](#error-handling)
3. [WebSocket Integration](#websocket-integration)
4. [Caching Strategies](#caching-strategies)
5. [Batch Operations](#batch-operations)
6. [React Hooks](#react-hooks)
7. [Testing](#testing)

## Basic Usage

### Fetching Data

```typescript
import { apiClient } from '@/lib/api/client'
import type { Agent, Workflow, SystemMetrics } from '@/lib/api/client'

// Get all agents
const agents: Agent[] = await apiClient.getAgents()

// Get specific agent
const agent: Agent = await apiClient.getAgent('agent-123')

// Get current metrics
const metrics: SystemMetrics = await apiClient.getCurrentMetrics()

// Get workflows
const workflows: Workflow[] = await apiClient.getWorkflows()
```

### Sending Commands

```typescript
// Send command to agent
const result = await apiClient.sendCommandToAgent('agent-123', 'analyze_data', {
  dataset: 'experiment-001',
})

// Chat with agent
const response = await apiClient.chatWithAgent(
  'ceo_agent',
  'What is the status of our latest research?'
)
```

### Laboratory Operations

```typescript
// Get equipment status
const equipment = await apiClient.getEquipment()

// Control equipment
await apiClient.controlEquipment('centrifuge-01', 'start', {
  speed: 3000,
  duration: 300,
})

// Create experiment
const experiment = await apiClient.createExperiment({
  name: 'Protein Analysis',
  type: 'biochemistry',
  researcher: 'Dr. Smith',
  equipment: ['centrifuge-01', 'spectrometer-02'],
  parameters: {
    temperature: 37,
    ph: 7.4,
  },
})
```

## Error Handling

### Try-Catch Pattern

```typescript
try {
  const agents = await apiClient.getAgents()
  // Process agents
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to fetch agents:', error.message)
    // Show user-friendly error
  }
}
```

### With React Query

```typescript
import { useQuery } from '@tanstack/react-query'

function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.getAgents(),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Failed to fetch agents:', error)
    },
  })
}
```

## WebSocket Integration

### Basic Setup

```typescript
import { useEffect } from 'react'
import { apiClient } from '@/lib/api/client'

function useWebSocketConnection() {
  useEffect(() => {
    // Connect with unique client ID
    const clientId = `client-${Date.now()}`
    apiClient.connectWebSocket(clientId)

    // Cleanup on unmount
    return () => {
      apiClient.disconnectWebSocket()
    }
  }, [])
}
```

### Listening for Messages

```typescript
function useAgentUpdates(onUpdate: (agent: Agent) => void) {
  useEffect(() => {
    const unsubscribe = apiClient.onWebSocketMessage((data) => {
      if (data.type === 'agent_update') {
        onUpdate(data.payload)
      }
    })

    return unsubscribe
  }, [onUpdate])
}
```

### Sending Messages

```typescript
// Send a message through WebSocket
apiClient.sendWebSocketMessage({
  type: 'command',
  target: 'agent-123',
  payload: {
    action: 'start_analysis',
    parameters: { sample_id: 'S001' },
  },
})
```

## Caching Strategies

### Default Caching

```typescript
// These methods use built-in caching
const agents = await apiClient.getAgents() // 1 minute cache
const metrics = await apiClient.getCurrentMetrics() // 10 second cache
const workflows = await apiClient.getWorkflows() // 30 second cache
```

### Prefetching

```typescript
// Prefetch all dashboard data
await apiClient.prefetchDashboardData()

// Manual prefetch pattern
async function prefetchLabData() {
  await Promise.all([
    apiClient.getEquipment(),
    apiClient.getExperiments(),
    apiClient.getLaboratoryStatus(),
  ])
}
```

### Cache Invalidation

Since the unified client uses ETag-based caching, the server controls cache invalidation. For immediate updates after mutations:

```typescript
// After creating an experiment, fetch fresh data
const newExperiment = await apiClient.createExperiment(data)
// The next call will check ETags and get fresh data if changed
const experiments = await apiClient.getExperiments()
```

## Batch Operations

### Using Batch Hooks

```typescript
import { useBatchQueries } from '@/lib/api/batch-hooks'

function useDashboardData() {
  const queries = useBatchQueries([
    { key: ['agents'], endpoint: '/api/agents' },
    { key: ['workflows'], endpoint: '/api/workflows' },
    { key: ['alerts'], endpoint: '/api/alerts', params: { limit: 10 } },
  ])

  return {
    agents: queries[0].data,
    workflows: queries[1].data,
    alerts: queries[2].data,
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error,
  }
}
```

### Parallel Requests (Non-Batched)

```typescript
// Using the unified client's batchRequest method
const [agents, workflows, metrics] = await apiClient.batchRequest([
  { url: '/api/agents' },
  { url: '/api/workflows' },
  { url: '/api/monitoring/metrics/current' },
])
```

## React Hooks

### Custom Hook Example

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

// Hook for agents with real-time updates
export function useAgentsWithUpdates() {
  const queryClient = useQueryClient()

  // Query for agents
  const query = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.getAgents(),
    staleTime: 60000, // 1 minute
  })

  // Listen for WebSocket updates
  useEffect(() => {
    const unsubscribe = apiClient.onWebSocketMessage((data) => {
      if (data.type === 'agent_update') {
        // Update cache with new agent data
        queryClient.setQueryData(['agents'], (oldData: Agent[]) => {
          return oldData.map((agent) => (agent.id === data.payload.id ? data.payload : agent))
        })
      }
    })

    return unsubscribe
  }, [queryClient])

  return query
}

// Hook for agent commands
export function useAgentCommand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      agentId,
      command,
      parameters,
    }: {
      agentId: string
      command: string
      parameters?: any
    }) => apiClient.sendCommandToAgent(agentId, command, parameters),
    onSuccess: () => {
      // Invalidate agents to refresh their status
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}
```

## Testing

### Mocking API Client

```typescript
// __mocks__/lib/api/client.ts
export const apiClient = {
  getAgents: jest.fn().mockResolvedValue([{ id: '1', name: 'Test Agent', status: 'active' }]),
  getCurrentMetrics: jest.fn().mockResolvedValue({
    system: { cpu_percent: 50, memory_percent: 60 },
    agents: { total_agents: 5, active_agents: 3 },
  }),
  connectWebSocket: jest.fn(),
  disconnectWebSocket: jest.fn(),
  onWebSocketMessage: jest.fn().mockReturnValue(() => {}),
}
```

### Testing Components

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

jest.mock('@/lib/api/client')

describe('AgentList', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  it('displays agents from API', async () => {
    const mockAgents = [
      { id: '1', name: 'CEO Agent', status: 'active' },
      { id: '2', name: 'CTO Agent', status: 'idle' }
    ]

    ;(apiClient.getAgents as jest.Mock).mockResolvedValue(mockAgents)

    render(
      <QueryClientProvider client={queryClient}>
        <AgentList />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('CEO Agent')).toBeInTheDocument()
      expect(screen.getByText('CTO Agent')).toBeInTheDocument()
    })
  })
})
```

## Best Practices Summary

1. **Always import from the unified client:**

   ```typescript
   import { apiClient } from '@/lib/api/client'
   ```

2. **Use TypeScript types for better IDE support:**

   ```typescript
   import type { Agent, Workflow } from '@/lib/api/client'
   ```

3. **Handle errors gracefully**

4. **Use React Query for component data fetching**

5. **Prefetch data when possible**

6. **Clean up WebSocket connections**

7. **Mock appropriately in tests**
