/**
 * Re-export unified API client for backward compatibility
 * This file is maintained for imports that reference '@/lib/optimized-api-client'
 */
export { apiClient as optimizedApiClient, apiClient, api } from './api/client'
export type { Agent, AgentHierarchy, SystemMetrics, Workflow, Alert, Message } from './api/client'