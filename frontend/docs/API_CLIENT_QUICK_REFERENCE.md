# API Client Quick Reference

## Import

```typescript
import { apiClient } from '@/lib/api/client'
import type { Agent, Workflow, SystemMetrics, Alert, Message } from '@/lib/api/client'
```

## Common Methods

### Agents

```typescript
apiClient.getAgents() // Get all agents
apiClient.getAgent(agentId) // Get specific agent
apiClient.getAgentHierarchy() // Get agent tree
apiClient.sendCommandToAgent(agentId, command, params) // Send command
apiClient.chatWithAgent(agentId, message) // Chat with agent
```

### Monitoring

```typescript
apiClient.getCurrentMetrics() // Get system metrics
apiClient.getAlerts() // Get active alerts
apiClient.getMessageHistory(50) // Get last 50 messages
```

### Workflows

```typescript
apiClient.getWorkflows() // Get all workflows
apiClient.simulateWorkflow(type) // Start simulation
apiClient.updateWorkflowStatus(workflowId, status) // Update status
```

### Laboratory

```typescript
apiClient.getEquipment() // Get all equipment
apiClient.getEquipmentById(equipmentId) // Get specific equipment
apiClient.controlEquipment(id, action, params) // Control equipment
apiClient.getExperiments() // Get experiments
apiClient.createExperiment(data) // Create experiment
apiClient.updateExperimentStatus(id, status) // Update experiment
apiClient.getExperimentLogs(id, limit) // Get logs
apiClient.getLaboratoryStatus() // Get lab status
```

### Analytics

```typescript
apiClient.getAnalyticsMetrics(dateRange) // Get metrics
apiClient.exportAnalyticsReport(dateRange, format) // Export report
```

### WebSocket

```typescript
apiClient.connectWebSocket(clientId) // Connect
apiClient.disconnectWebSocket() // Disconnect
apiClient.onWebSocketMessage(callback) // Listen (returns unsubscribe)
apiClient.sendWebSocketMessage(message) // Send message
```

### Utilities

```typescript
apiClient.batchRequest(requests) // Parallel requests
apiClient.prefetchDashboardData() // Prefetch common data
```

## Cache Times

| Endpoint   | Cache Duration | Notes             |
| ---------- | -------------- | ----------------- |
| Agents     | 1 minute       | Relatively static |
| Metrics    | 10 seconds     | Near real-time    |
| Workflows  | 30 seconds     | Moderate updates  |
| Alerts     | 5 seconds      | High priority     |
| Laboratory | 10 seconds     | Equipment changes |
| Analytics  | No cache       | Always fresh      |

## Common Patterns

### With React Query

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['agents'],
  queryFn: () => apiClient.getAgents(),
})
```

### Error Handling

```typescript
try {
  const data = await apiClient.getAgents()
} catch (error) {
  console.error('API Error:', error)
}
```

### WebSocket Subscription

```typescript
useEffect(() => {
  const unsubscribe = apiClient.onWebSocketMessage((data) => {
    // Handle message
  })
  return unsubscribe
}, [])
```

## ⚠️ Deprecated Imports

```typescript
// ❌ Don't use these:
import { api } from '@/lib/api'
import { apiClient } from '@/lib/api-client'
import { optimizedApiClient } from '@/lib/optimized-api-client'

// ✅ Use this instead:
import { apiClient } from '@/lib/api/client'
```
