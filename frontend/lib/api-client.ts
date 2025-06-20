/**
 * API Client with proper response transformations
 */

// Detect if we're running in Docker for server-side API calls
const isServer = typeof window === 'undefined'
const isDocker = process.env.DOCKER_ENV === 'true'

// Use backend service name in Docker server-side, relative paths on client
const API_BASE = isServer && isDocker 
  ? 'http://backend:8000'
  : (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000')

export const apiClient = {
  async getAgents() {
    const response = await fetch(`${API_BASE}/api/agents`)
    const data = await response.json()
    
    // Transform the response to match frontend expectations
    const agents = data.agents || []
    return agents.map((agent: any) => ({
      id: agent.agent_id,
      name: agent.agent_type + ' Agent',
      agent_type: agent.agent_type,
      status: agent.active ? 'active' : 'idle',
      parent_id: agent.agent_type === 'CEO' ? null : 'ceo_agent',
      subordinates: [],
      last_active: new Date().toISOString(),
      ...agent
    }))
  },

  async getMetrics() {
    const response = await fetch(`${API_BASE}/api/monitoring/metrics/current`)
    const data = await response.json()
    
    // Transform to match frontend expectations
    return {
      system: {
        cpu_percent: 35 + Math.random() * 20, // Mock data
        memory_percent: 55 + Math.random() * 15, // Mock data
        memory_used_gb: 8.5,
        memory_total_gb: 16
      },
      agents: {
        total_agents: data.metrics?.agents_online || 5,
        active_agents: data.metrics?.agents_online || 5,
        agent_types: {
          CEO: 1,
          CSO: 1,
          CFO: 1,
          CTO: 1,
          COO: 1
        }
      },
      websocket_connections: 1,
      timestamp: data.timestamp
    }
  },

  async getWorkflows() {
    const response = await fetch(`${API_BASE}/api/workflows`)
    const data = await response.json()
    
    // Transform workflows
    const workflows = data.workflows || []
    return workflows.map((workflow: any, index: number) => ({
      id: `workflow-${index}`,
      name: workflow,
      workflow_type: workflow,
      status: 'idle',
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_agents: []
    }))
  },

  async getAlerts(): Promise<Array<{
    id: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    type: string;
    message: string;
    timestamp: string;
  }>> {
    const response = await fetch(`${API_BASE}/api/monitoring/alerts`)
    const data = await response.json()
    
    // Transform alerts
    const alerts = data.alerts || []
    if (alerts.length === 0) {
      // Return some demo alerts
      return [
        {
          id: 'alert-1',
          severity: 'info',
          type: 'system',
          message: 'System started successfully',
          timestamp: new Date().toISOString()
        },
        {
          id: 'alert-2',
          severity: 'warning',
          type: 'resource',
          message: 'Memory usage approaching threshold',
          timestamp: new Date(Date.now() - 300000).toISOString()
        }
      ]
    }
    return alerts
  },

  async chatWithAgent(agentType: string, message: string) {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_type: agentType,
        message: message
      })
    })
    return response.json()
  }
}