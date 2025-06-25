export interface Message {
  id: string
  agent_id: string
  content: string
  timestamp: string
  type: 'info' | 'warning' | 'error' | 'success'
  metadata?: Record<string, any>
}

let messageCounter = 0

export const createMessage = (overrides: Partial<Message> = {}): Message => {
  messageCounter++
  const baseMessage: Message = {
    id: `msg-${messageCounter.toString().padStart(3, '0')}`,
    agent_id: 'agent-001',
    content: `Test message ${messageCounter}`,
    timestamp: new Date().toISOString(),
    type: 'info',
  }

  return { ...baseMessage, ...overrides }
}

export const createMessageList = (count: number, overrides: Partial<Message> = {}): Message[] => {
  return Array.from({ length: count }, () => createMessage(overrides))
}

export const createMessagesByType = (): Message[] => [
  createMessage({ type: 'info', content: 'System initialized successfully' }),
  createMessage({ type: 'warning', content: 'High memory usage detected' }),
  createMessage({ type: 'error', content: 'Failed to connect to database' }),
  createMessage({ type: 'success', content: 'Experiment completed successfully' }),
]

export const createWebSocketMessage = (type: string, data: any) => ({
  type,
  data,
  timestamp: new Date().toISOString(),
})

export const createMetricsUpdateMessage = (metrics: any) =>
  createWebSocketMessage('metrics_update', metrics)

export const createAgentStatusMessage = (agentId: string, status: string) =>
  createWebSocketMessage('agent_status', { agent_id: agentId, status })
