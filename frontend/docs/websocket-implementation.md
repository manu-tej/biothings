# WebSocket Implementation Guide

This document describes the robust WebSocket implementation for real-time features in the BioThings frontend.

## Overview

The WebSocket system provides real-time communication between the frontend and backend with features including:

- Automatic reconnection with exponential backoff
- Channel-based subscriptions
- Message type handling
- Connection state management
- Specialized hooks for different data types

## Core Hook: `useWebSocket`

The main hook is located at `/lib/hooks/useWebSocket.ts` and provides comprehensive WebSocket functionality.

### Basic Usage

```typescript
import { useWebSocket } from '@/lib/hooks/useWebSocket'

function MyComponent() {
  const {
    isConnected,
    connectionState,
    sendMessage,
    lastMessage,
    subscribedChannels,
    subscribeToChannel,
    unsubscribeFromChannel,
    registerHandler,
    reconnect,
    disconnect,
  } = useWebSocket({
    channels: ['metrics', 'alerts'], // Auto-subscribe to these channels
    onMessage: (message) => {
      console.log('Received:', message)
    },
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onError: (error) => console.error('Error:', error),
    reconnectAttempts: 5, // Default: 5
    reconnectInterval: 1000, // Default: 1000ms
    maxReconnectDelay: 30000, // Default: 30000ms
    heartbeatInterval: 30000, // Default: 30000ms
  })
}
```

### Message Types

The system supports various message types:

- `metrics` - System performance metrics
- `alert` - System alerts and notifications
- `agent_update` - Agent status updates
- `agent_status` - Agent state changes
- `workflow_update` - Workflow updates
- `workflow_progress` - Workflow progress updates
- `workflows_update` - Bulk workflow updates
- `chat_message` - Real-time chat messages
- `system` - System messages
- `error` - Error messages

### Connection States

- `connecting` - Attempting to establish connection
- `connected` - Successfully connected
- `disconnected` - Connection closed
- `error` - Connection error occurred

## Specialized Hooks

For common use cases, specialized hooks are provided:

### useMetricsWebSocket

```typescript
import { useMetricsWebSocket } from '@/lib/hooks/useWebSocket'

function MetricsComponent() {
  const { isConnected, connectionState } = useMetricsWebSocket((metrics) => {
    console.log('New metrics:', metrics)
    // Update your metrics state
  })
}
```

### useAlertsWebSocket

```typescript
import { useAlertsWebSocket } from '@/lib/hooks/useWebSocket'

function AlertsComponent() {
  const { isConnected } = useAlertsWebSocket((alert) => {
    console.log('New alert:', alert)
    // Handle the alert
  })
}
```

### useAgentStatusWebSocket

```typescript
import { useAgentStatusWebSocket } from '@/lib/hooks/useWebSocket'

function AgentMonitor() {
  const { isConnected } = useAgentStatusWebSocket((update) => {
    console.log('Agent update:', update)
    // Update agent status
  })
}
```

### useWorkflowWebSocket

```typescript
import { useWorkflowWebSocket } from '@/lib/hooks/useWebSocket'

function WorkflowMonitor() {
  const { isConnected } = useWorkflowWebSocket((update) => {
    if (update.type === 'workflow_progress') {
      // Handle progress update
    }
  })
}
```

## Channel Subscriptions

Channels allow you to subscribe to specific topics:

```typescript
// Subscribe to a channel
subscribeToChannel('custom-channel')

// Unsubscribe from a channel
unsubscribeFromChannel('custom-channel')

// Check subscribed channels
console.log(subscribedChannels) // ['metrics', 'alerts', 'custom-channel']
```

## Message Handlers

Register handlers for specific message types or channels:

```typescript
useEffect(() => {
  // Handle all messages of type 'alert'
  const unregister = registerHandler((message) => {
    console.log('Alert received:', message)
  }, 'alert')

  return unregister // Cleanup
}, [registerHandler])

// Handle messages from a specific channel
const unregister = registerHandler(
  (message) => {
    console.log('Channel message:', message)
  },
  undefined,
  'my-channel'
)
```

## Sending Messages

```typescript
sendMessage({
  type: 'chat_message',
  channel: 'chat-agent-1',
  data: {
    content: 'Hello, agent!',
    sender_id: 'user-123',
  },
})
```

## Connection Management

### Exponential Backoff

The system automatically reconnects with exponential backoff:

- 1st attempt: 1 second
- 2nd attempt: 2 seconds
- 3rd attempt: 4 seconds
- 4th attempt: 8 seconds
- 5th attempt: 16 seconds
- Maximum delay: 30 seconds

### Manual Control

```typescript
// Manually reconnect
reconnect()

// Disconnect (prevents auto-reconnect)
disconnect()
```

## Connection Status Indicators

### Using ConnectionIndicator Component

```typescript
import { ConnectionIndicator } from '@/components/WebSocketStatus'

function MyComponent() {
  return (
    <div className="flex items-center space-x-2">
      <h2>Dashboard</h2>
      <ConnectionIndicator />
    </div>
  )
}
```

### Using WebSocketStatus Component

```typescript
import WebSocketStatus from '@/components/WebSocketStatus'

function Header() {
  return (
    <header>
      <WebSocketStatus />
    </header>
  )
}
```

## Example Integration

Here's a complete example of a real-time dashboard component:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMetricsWebSocket } from '@/lib/hooks/useWebSocket'
import { ConnectionIndicator } from '@/components/WebSocketStatus'

export default function Dashboard() {
  const queryClient = useQueryClient()

  // Initial data fetch
  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 30000 // Reduced frequency due to WebSocket
  })

  // Real-time updates
  const { isConnected, connectionState } = useMetricsWebSocket((newMetrics) => {
    // Update React Query cache
    queryClient.setQueryData(['metrics'], newMetrics)
  })

  return (
    <div>
      <div className="flex items-center space-x-2">
        <h1>System Metrics</h1>
        <ConnectionIndicator />
        {isConnected && <span className="text-sm text-green-600">Live</span>}
      </div>
      {/* Render metrics */}
    </div>
  )
}
```

## Best Practices

1. **Use specialized hooks** when available for cleaner code
2. **Combine with React Query** for initial data and caching
3. **Handle both WebSocket and HTTP** for reliability
4. **Show connection status** to users for transparency
5. **Clean up handlers** in useEffect to prevent memory leaks
6. **Use channels** to organize message topics
7. **Implement fallbacks** for when WebSocket is unavailable

## Troubleshooting

### Connection Issues

1. Check browser console for WebSocket errors
2. Verify backend WebSocket endpoint is running
3. Check for firewall/proxy blocking WebSocket connections
4. Ensure correct WebSocket URL in production

### Message Not Received

1. Verify you're subscribed to the correct channel
2. Check message type matches your handler
3. Ensure WebSocket is connected before sending
4. Check browser network tab for WebSocket frames

### Memory Leaks

1. Always unregister handlers in cleanup functions
2. Disconnect WebSocket when component unmounts
3. Avoid creating new handlers on every render
