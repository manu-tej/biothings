export interface Workflow {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped'
  progress: number
  started_at: string
  completed_at?: string
  error?: string
}

let workflowCounter = 0

export const createWorkflow = (overrides: Partial<Workflow> = {}): Workflow => {
  workflowCounter++
  const baseWorkflow: Workflow = {
    id: `wf-${workflowCounter.toString().padStart(3, '0')}`,
    name: `Test Workflow ${workflowCounter}`,
    status: 'running',
    progress: Math.random(),
    started_at: new Date(Date.now() - Math.random() * 7200000).toISOString(),
  }

  // Add completed_at if status is completed
  if (overrides.status === 'completed' || baseWorkflow.status === 'completed') {
    baseWorkflow.completed_at = new Date().toISOString()
  }

  // Add error if status is failed
  if (overrides.status === 'failed') {
    baseWorkflow.error = overrides.error || 'Test error message'
  }

  return { ...baseWorkflow, ...overrides }
}

export const createWorkflowList = (
  count: number,
  overrides: Partial<Workflow> = {}
): Workflow[] => {
  return Array.from({ length: count }, () => createWorkflow(overrides))
}

export const createWorkflowsByStatus = (): Workflow[] => [
  createWorkflow({ status: 'pending', progress: 0 }),
  createWorkflow({ status: 'running', progress: 0.65 }),
  createWorkflow({ status: 'completed', progress: 1 }),
  createWorkflow({ status: 'failed', progress: 0.3, error: 'Connection timeout' }),
  createWorkflow({ status: 'stopped', progress: 0.5 }),
]
