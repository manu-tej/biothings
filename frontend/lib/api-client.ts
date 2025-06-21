/**
 * Re-export unified API client for backward compatibility
 * This file is maintained for imports that reference '@/lib/api-client'
 */
export { apiClient, api, optimizedApiClient } from './api/client'
export type { Agent, AgentHierarchy, SystemMetrics, Workflow, Alert, Message } from './api/client'