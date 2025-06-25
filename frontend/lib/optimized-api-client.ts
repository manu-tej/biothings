/**
 * @deprecated This file is deprecated and will be removed in the next major version.
 * Please import from '@/lib/api/client' instead:
 * 
 * import { apiClient } from '@/lib/api/client'
 * 
 * Re-export unified API client for backward compatibility
 * This file is maintained for imports that reference '@/lib/optimized-api-client'
 */
// Log deprecation warning in development
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[DEPRECATION] @/lib/optimized-api-client is deprecated. Please import from @/lib/api/client instead.'
  )
}

export { apiClient as optimizedApiClient, apiClient, api } from './api/client'
export type { Agent, AgentHierarchy, SystemMetrics, Workflow, Alert, Message } from './api/client'