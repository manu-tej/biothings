import { http, HttpResponse } from 'msw'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const handlers = [
  // Agent endpoints
  http.get(`${API_BASE_URL}/api/agents`, () => {
    return HttpResponse.json([
      {
        id: 'ceo-001',
        name: 'CEO Agent',
        agent_type: 'CEO',
        status: 'active',
        department: 'Executive',
        last_active: new Date().toISOString(),
      },
      {
        id: 'cto-001',
        name: 'CTO Agent',
        agent_type: 'CTO',
        status: 'active',
        department: 'Technology',
        last_active: new Date().toISOString(),
      },
    ])
  }),

  // Workflow endpoints
  http.get(`${API_BASE_URL}/api/workflows`, () => {
    return HttpResponse.json([
      {
        id: 'wf-001',
        name: 'PCR Protocol',
        status: 'running',
        progress: 0.65,
        started_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'wf-002',
        name: 'DNA Sequencing',
        status: 'completed',
        progress: 1.0,
        started_at: new Date(Date.now() - 7200000).toISOString(),
        completed_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ])
  }),

  // Metrics endpoint
  http.get(`${API_BASE_URL}/api/system/metrics`, () => {
    return HttpResponse.json({
      system: {
        cpu_percent: 45.5 + Math.random() * 10,
        memory_percent: 62.3 + Math.random() * 10,
        disk_usage_percent: 35.2,
        network_io: {
          bytes_sent: 1024000,
          bytes_recv: 2048000,
        },
      },
      agents: {
        total_agents: 10,
        active_agents: 7,
        agent_types: {
          CEO: 1,
          CTO: 1,
          CFO: 1,
          COO: 1,
          Lab: 6,
        },
      },
      websocket_connections: 3,
      timestamp: new Date().toISOString(),
    })
  }),

  // Agent messages endpoint
  http.get(`${API_BASE_URL}/api/agents/:agentId/messages`, ({ params }) => {
    const { agentId } = params
    return HttpResponse.json([
      {
        id: 'msg-001',
        agent_id: agentId,
        content: 'Processing experiment data',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'info',
      },
      {
        id: 'msg-002',
        agent_id: agentId,
        content: 'Experiment completed successfully',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: 'success',
      },
    ])
  }),

  // Error scenarios
  http.get(`${API_BASE_URL}/api/error`, () => {
    return new HttpResponse(null, { status: 500 })
  }),

  // Workflow actions
  http.post(`${API_BASE_URL}/api/workflows/:workflowId/start`, ({ params }) => {
    return HttpResponse.json({
      id: params.workflowId,
      status: 'running',
      message: 'Workflow started successfully',
    })
  }),

  http.post(`${API_BASE_URL}/api/workflows/:workflowId/stop`, ({ params }) => {
    return HttpResponse.json({
      id: params.workflowId,
      status: 'stopped',
      message: 'Workflow stopped successfully',
    })
  }),

  // Agent communication
  http.post(`${API_BASE_URL}/api/agents/:agentId/message`, async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'msg-new',
      agent_id: params.agentId,
      content: body.message,
      timestamp: new Date().toISOString(),
      status: 'sent',
    })
  }),
]
