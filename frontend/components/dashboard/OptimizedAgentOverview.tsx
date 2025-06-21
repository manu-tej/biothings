'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Users, 
  Crown,
  Briefcase,
  FlaskConical,
  DollarSign,
  Cpu as CpuIcon,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { apiClient, type Agent } from '@/lib/api/client'
import { useWebSocket } from '@/lib/hooks/useWebSocket'

const agentIcons: Record<string, React.ReactNode> = {
  CEO: <Crown className="w-5 h-5" />,
  COO: <Briefcase className="w-5 h-5" />,
  CSO: <FlaskConical className="w-5 h-5" />,
  CFO: <DollarSign className="w-5 h-5" />,
  CTO: <CpuIcon className="w-5 h-5" />,
  Manager: <UserCheck className="w-5 h-5" />,
  Worker: <Users className="w-5 h-5" />
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-gray-400',
  thinking: 'bg-blue-500',
  executing: 'bg-yellow-500',
  error: 'bg-red-500'
}

// Memoized Agent Card Component
const AgentCard = memo(({ agent, isExecutive }: { agent: Agent; isExecutive?: boolean }) => {
  const timeSinceActive = useMemo(() => {
    const lastActive = new Date(agent.last_active)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }, [agent.last_active])

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-lg p-4 border transition-shadow
      ${isExecutive 
        ? 'border-primary-200 dark:border-primary-700' 
        : 'border-gray-200 dark:border-gray-700'
      }
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`
            p-2 rounded-lg 
            ${isExecutive 
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
              : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }
          `}>
            {agentIcons[agent.agent_type] || <Users className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {agent.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {agent.agent_type}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[agent.status] || 'bg-gray-400'}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {agent.status}
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Last active: {timeSinceActive}
        </span>
        {agent.subordinates.length > 0 && (
          <span className="text-gray-600 dark:text-gray-300">
            {agent.subordinates.length} reports
          </span>
        )}
      </div>
    </div>
  )
})

AgentCard.displayName = 'AgentCard'

export default function OptimizedAgentOverview() {
  const queryClient = useQueryClient()
  
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.getAgents(),
    refetchInterval: 300000, // 5 minutes - refresh interval
    staleTime: 300000 // Data is fresh for 5 minutes
  })

  // Optimized WebSocket message handler
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === 'agent_status_update') {
      queryClient.setQueryData(['agents'], (oldData: Agent[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map(agent => 
          agent.id === data.agent_id 
            ? { ...agent, status: data.status, last_active: data.timestamp }
            : agent
        )
      })
    } else if (data.type === 'agents_update') {
      queryClient.setQueryData(['agents'], data.agents)
    }
  }, [queryClient])

  // WebSocket connection
  useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('WebSocket connected for agent monitoring')
    }
  })

  // Memoized agent categorization
  const { executives, managers, workers, activeCount, totalCount } = useMemo(() => {
    if (!agents) return { executives: [], managers: [], workers: [], activeCount: 0, totalCount: 0 }
    
    const agentsList: Agent[] = agents
    return {
      executives: agentsList.filter(a => ['CEO', 'COO', 'CSO', 'CFO', 'CTO'].includes(a.agent_type)),
      managers: agentsList.filter(a => a.agent_type === 'Manager'),
      workers: agentsList.filter(a => a.agent_type === 'Worker'),
      activeCount: agentsList.filter(a => a.status === 'active').length,
      totalCount: agentsList.length
    }
  }, [agents])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Agent Hierarchy
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {activeCount} / {totalCount} Active
          </span>
          {activeCount < totalCount && (
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Executive Agents */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Executive Team
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {executives.map(agent => (
              <AgentCard key={agent.id} agent={agent} isExecutive />
            ))}
          </div>
        </div>

        {/* Department Managers */}
        {managers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Department Managers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {managers.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )}

        {/* Worker Agents */}
        {workers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Operational Agents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {workers.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}