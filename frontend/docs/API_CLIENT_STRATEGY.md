# API Client Strategy & Migration Guide

## Overview

This document outlines the unified API client strategy for the BioThings AI Platform frontend and provides a migration guide for consolidating all API client implementations.

## Current State

We have identified multiple API client implementations:

1. **Unified API Client** (`/lib/api/client.ts`) - Main implementation with full features
2. **Batch API Client** (`/lib/api/batch-client.ts`) - Specialized for request batching
3. **Multiple re-export files** - Legacy compatibility layers

## Recommended Strategy

### 1. Primary API Client

**Use the Unified API Client (`@/lib/api/client`) for all standard API calls.**

This client provides:

- Built-in caching with ETag support
- Request deduplication
- WebSocket integration
- Type-safe methods for all endpoints
- Automatic error handling

### 2. When to Use Batch Client

**Use the Batch API Client only when:**

- Making multiple related API calls that can be batched
- The backend supports the `/api/batch` endpoint
- Using React Query hooks with `useBatchQuery` or `useBatchQueries`

### 3. Import Guidelines

```typescript
// ✅ CORRECT - Import from the unified client
import { apiClient } from '@/lib/api/client'
import type { Agent, Workflow, SystemMetrics } from '@/lib/api/client'

// ❌ AVOID - Legacy imports (will be deprecated)
import { api } from '@/lib/api'
import { optimizedApiClient } from '@/lib/optimized-api-client'
import { apiClient } from '@/lib/api-client'
```

## Migration Plan

### Phase 1: Documentation & New Development (Immediate)

1. All new components must use `@/lib/api/client`
2. Document this strategy in team guidelines
3. Add deprecation warnings to legacy files

### Phase 2: Component Migration (Week 1-2)

Migrate existing components in this order:

1. **High-traffic components first:**
   - Dashboard components (SystemMetrics, WorkflowStatus, RealtimeAlerts)
   - Agent components (AgentChat, AgentList)
   - Workflow components

2. **Lower priority:**
   - Test files
   - Utility components
   - Example/demo files

### Phase 3: Consolidation (Week 3)

1. Move batch functionality into unified client as an optional feature
2. Remove duplicate caching logic
3. Deprecate and remove re-export files

### Phase 4: Cleanup (Week 4)

1. Remove all legacy import paths
2. Update all documentation
3. Clean up unused files

## API Client Features Comparison

| Feature               | Unified Client  | Batch Client    | When to Use                 |
| --------------------- | --------------- | --------------- | --------------------------- |
| Standard API calls    | ✅              | ❌              | Always use unified          |
| Caching               | ✅ (ETag-based) | ✅ (Time-based) | Unified for consistency     |
| Request deduplication | ✅              | ❌              | Unified prevents duplicates |
| WebSocket support     | ✅              | ❌              | Unified for real-time       |
| Request batching      | ❌              | ✅              | Batch for multiple calls    |
| Type safety           | ✅              | ⚠️ (Generic)    | Unified for better types    |

## Code Examples

### Standard API Usage

```typescript
// Fetching agents
const agents = await apiClient.getAgents()

// Chat with agent
const response = await apiClient.chatWithAgent('agent-123', 'Hello')

// Get metrics with automatic caching
const metrics = await apiClient.getCurrentMetrics()
```

### Batch API Usage (When Needed)

```typescript
import { useBatchQueries } from '@/lib/api/batch-hooks'

// Batch multiple queries
const queries = useBatchQueries([
  { key: ['agents'], endpoint: '/api/agents' },
  { key: ['workflows'], endpoint: '/api/workflows' },
  { key: ['metrics'], endpoint: '/api/metrics' },
])
```

### WebSocket Usage

```typescript
// Connect WebSocket
apiClient.connectWebSocket('client-123')

// Listen for messages
const unsubscribe = apiClient.onWebSocketMessage((data) => {
  console.log('Received:', data)
})

// Cleanup
unsubscribe()
apiClient.disconnectWebSocket()
```

## Best Practices

1. **Always use typed imports:**

   ```typescript
   import type { Agent, Workflow } from '@/lib/api/client'
   ```

2. **Handle errors properly:**

   ```typescript
   try {
     const data = await apiClient.getAgents()
   } catch (error) {
     console.error('Failed to fetch agents:', error)
   }
   ```

3. **Use appropriate cache times:**
   - Metrics: 10 seconds (real-time data)
   - Agents: 1 minute (relatively static)
   - Workflows: 30 seconds (moderate updates)

4. **Prefetch critical data:**
   ```typescript
   // On dashboard load
   await apiClient.prefetchDashboardData()
   ```

## Future Enhancements

1. **Unified Batching:** Integrate batch functionality into main client
2. **Query Invalidation:** Add cache invalidation on mutations
3. **Offline Support:** Add offline queue for failed requests
4. **Request Metrics:** Track API performance metrics
5. **GraphQL Support:** Consider GraphQL for complex queries

## Questions & Support

For questions about API client usage, contact the frontend team or refer to the inline documentation in `/lib/api/client.ts`.
