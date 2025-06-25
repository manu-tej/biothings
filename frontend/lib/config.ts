/**
 * Configuration for the frontend application
 */

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    endpoints: {
      health: '/api/health',
      agents: '/api/agents',
      experiments: '/api/experiments',
      workflows: '/api/workflows',
      metrics: '/api/metrics',
      chat: '/api/chat',
    },
  },
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
  },
  app: {
    name: 'BioThings',
    description: 'AI-Powered Biotech Dashboard',
    version: '1.0.0',
  },
}
