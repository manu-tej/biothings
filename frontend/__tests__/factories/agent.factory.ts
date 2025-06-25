export interface Agent {
  id: string
  name: string
  agent_type: string
  status: 'active' | 'inactive' | 'error'
  department: string
  last_active: string
}

let agentCounter = 0

export const createAgent = (overrides: Partial<Agent> = {}): Agent => {
  agentCounter++
  const baseAgent: Agent = {
    id: `agent-${agentCounter}`,
    name: `Test Agent ${agentCounter}`,
    agent_type: 'Lab',
    status: 'active',
    department: 'Research',
    last_active: new Date().toISOString(),
  }

  return { ...baseAgent, ...overrides }
}

export const createAgentList = (count: number, overrides: Partial<Agent> = {}): Agent[] => {
  return Array.from({ length: count }, () => createAgent(overrides))
}

export const createAgentsByType = (): Record<string, Agent> => ({
  ceo: createAgent({
    id: 'ceo-001',
    name: 'CEO Agent',
    agent_type: 'CEO',
    department: 'Executive',
  }),
  cto: createAgent({
    id: 'cto-001',
    name: 'CTO Agent',
    agent_type: 'CTO',
    department: 'Technology',
  }),
  cfo: createAgent({ id: 'cfo-001', name: 'CFO Agent', agent_type: 'CFO', department: 'Finance' }),
  lab: createAgent({
    id: 'lab-001',
    name: 'Lab Agent',
    agent_type: 'Lab',
    department: 'Laboratory',
  }),
})
