'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { apiClient } from '@/lib/api-client'

interface Agent {
  id: string
  name: string
  agent_type: string
  status: string
  parent_id: string | null
  subordinates: string[]
  last_active: string
}

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

interface AgentCardProps {
  agent: Agent
  isExecutive?: boolean
}

function AgentCard({ agent, isExecutive }: AgentCardProps) {
  const timeSinceActive = () => {
    const lastActive = new Date(agent.last_active)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-lg p-4 border 
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
          Last active: {timeSinceActive()}
        </span>
        {agent.subordinates.length > 0 && (
          <span className="text-gray-600 dark:text-gray-300">
            {agent.subordinates.length} reports
          </span>
        )}
      </div>
    </div>
  )
}

export default function AgentOverview() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.getAgents(),
    refetchInterval: 10000 // Refresh every 10 seconds
  })

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />
  }

  // Use the transformed agents data
  const agentsList: Agent[] = agents || []

  const executives = agentsList.filter(a => ['CEO', 'COO', 'CSO', 'CFO', 'CTO'].includes(a.agent_type))
  const managers = agentsList.filter(a => a.agent_type === 'Manager')
  const workers = agentsList.filter(a => a.agent_type === 'Worker')

  const activeCount = agentsList.filter(a => a.status === 'active').length
  const totalCount = agentsList.length

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