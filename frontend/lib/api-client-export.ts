/**
 * Re-export unified API client for backward compatibility
 */
export { apiClient, api, optimizedApiClient } from './api/client'
export type { Agent, AgentHierarchy, SystemMetrics, Workflow, Alert, Message } from './api/client'