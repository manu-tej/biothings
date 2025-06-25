/**
 * @deprecated This file is deprecated and will be removed in the next major version.
 * Please import from '@/lib/api/client' instead:
 *
 * import { apiClient } from '@/lib/api/client'
 *
 * Re-export unified API client for backward compatibility
 */
// Log deprecation warning in development
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[DEPRECATION] @/lib/api-client-export is deprecated. Please import from @/lib/api/client instead.'
  )
}

export { apiClient, api, optimizedApiClient } from './api/client'
export type { Agent, AgentHierarchy, SystemMetrics, Workflow, Alert, Message } from './api/client'
