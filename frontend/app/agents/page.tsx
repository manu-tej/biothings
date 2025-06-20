'use client'

import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Users, Crown, Briefcase, FlaskConical, DollarSign, Cpu, UserCheck } from 'lucide-react'

const agentIcons: Record<string, React.ReactNode> = {
  CEO: <Crown className="w-6 h-6" />,
  COO: <Briefcase className="w-6 h-6" />,
  CSO: <FlaskConical className="w-6 h-6" />,
  CFO: <DollarSign className="w-6 h-6" />,
  CTO: <Cpu className="w-6 h-6" />,
  Manager: <UserCheck className="w-6 h-6" />,
  Worker: <Users className="w-6 h-6" />
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-gray-400',
  thinking: 'bg-blue-500',
  executing: 'bg-yellow-500',
  monitoring: 'bg-purple-500',
  error: 'bg-red-500'
}

export default function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/agents')
      return response.json()
    },
    refetchInterval: 5000
  })

  const { data: hierarchy } = useQuery({
    queryKey: ['agent-hierarchy'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/hierarchy')
      return response.json()
    },
    refetchInterval: 10000
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />
      </DashboardLayout>
    )
  }

  const timeSinceActive = (lastActive: string) => {
    const lastActiveDate = new Date(lastActive)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastActiveDate.getTime()) / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Agents
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and monitor your intelligent biotech workforce
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {agents?.length || 0} Total Agents
            </span>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents?.map((agent: any) => (
            <div
              key={agent.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                    {agentIcons[agent.agent_type] || <Users className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {agent.agent_type} • {agent.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${statusColors[agent.status] || 'bg-gray-400'}`} />
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {agent.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Last Active:</span>
                  <span className="text-sm text-gray-900 dark:text-white ml-2">
                    {timeSinceActive(agent.last_active)}
                  </span>
                </div>

                {agent.subordinates?.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Reports:</span>
                    <span className="text-sm text-gray-900 dark:text-white ml-2">
                      {agent.subordinates.length} direct reports
                    </span>
                  </div>
                )}

                {agent.capabilities?.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Capabilities:</span>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.slice(0, 3).map((cap: string) => (
                        <span
                          key={cap}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                        >
                          {cap.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                          +{agent.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="w-full px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Hierarchy Visualization */}
        {hierarchy && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Organizational Hierarchy
            </h2>
            <div className="space-y-4">
              {/* This would be a tree visualization component */}
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Hierarchy visualization coming soon...</p>
                <p className="text-sm mt-1">Tree diagram of agent reporting structure</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}