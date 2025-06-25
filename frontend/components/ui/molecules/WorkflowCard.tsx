'use client'

import {
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Users,
  Timer,
  Activity,
} from 'lucide-react'
import React, { forwardRef } from 'react'

import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { Card, CardHeader, CardBody, CardFooter } from '../atoms/Card'
import { Tooltip } from '../atoms/Tooltip'

import { SimpleProgressBar } from './ProgressBar'

export interface WorkflowStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  duration?: number
  agent?: string
}

export interface WorkflowStatus {
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep?: string
  totalSteps: number
  completedSteps: number
  startTime?: Date
  endTime?: Date
  estimatedCompletion?: Date
}

export interface WorkflowCardProps {
  id: string
  name: string
  description?: string
  status: WorkflowStatus
  steps?: WorkflowStep[]
  assignedAgents?: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  tags?: string[]
  actions?: {
    onStart?: () => void
    onPause?: () => void
    onStop?: () => void
    onView?: () => void
    onEdit?: () => void
    onDelete?: () => void
  }
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact' | 'detailed'
  selectable?: boolean
  selected?: boolean
  onSelect?: (selected: boolean) => void
  className?: string
  testId?: string
}

const statusConfig = {
  draft: {
    variant: 'secondary' as const,
    icon: Clock,
    label: 'Draft',
  },
  running: {
    variant: 'primary' as const,
    icon: Play,
    label: 'Running',
  },
  paused: {
    variant: 'warning' as const,
    icon: Pause,
    label: 'Paused',
  },
  completed: {
    variant: 'success' as const,
    icon: CheckCircle,
    label: 'Completed',
  },
  failed: {
    variant: 'danger' as const,
    icon: AlertCircle,
    label: 'Failed',
  },
  cancelled: {
    variant: 'secondary' as const,
    icon: Square,
    label: 'Cancelled',
  },
}

const priorityConfig = {
  low: { variant: 'secondary' as const, label: 'Low' },
  medium: { variant: 'primary' as const, label: 'Medium' },
  high: { variant: 'warning' as const, label: 'High' },
  urgent: { variant: 'danger' as const, label: 'Urgent' },
}

export const WorkflowCard = forwardRef<HTMLDivElement, WorkflowCardProps>(
  (
    {
      _id,
      name,
      description,
      status,
      _steps = [],
      assignedAgents = [],
      priority = 'medium',
      tags = [],
      actions,
      _size = 'md',
      variant = 'default',
      selectable = false,
      selected = false,
      onSelect,
      className,
      testId,
    },
    ref
  ) => {
    const statusInfo = statusConfig[status.status]
    const priorityInfo = priorityConfig[priority]
    const StatusIcon = statusInfo.icon

    const formatDuration = (startTime?: Date, endTime?: Date) => {
      if (!startTime) return ''
      const end = endTime || new Date()
      const diff = Math.floor((end.getTime() - startTime.getTime()) / 1000)
      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    }

    const formatEstimated = (estimatedTime?: Date) => {
      if (!estimatedTime) return ''
      const now = new Date()
      const diff = Math.floor((estimatedTime.getTime() - now.getTime()) / 1000)
      if (diff <= 0) return 'Overdue'
      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`
    }

    const handleSelect = () => {
      if (selectable) {
        onSelect?.(!selected)
      }
    }

    const renderActions = () => {
      if (!actions) return null

      const actionButtons = []

      if (status.status === 'draft' && actions.onStart) {
        actionButtons.push(
          <Tooltip key="start" content="Start Workflow">
            <Button size="xs" variant="ghost" onClick={actions.onStart} icon={<Play />} />
          </Tooltip>
        )
      }

      if (status.status === 'running' && actions.onPause) {
        actionButtons.push(
          <Tooltip key="pause" content="Pause Workflow">
            <Button size="xs" variant="ghost" onClick={actions.onPause} icon={<Pause />} />
          </Tooltip>
        )
      }

      if ((status.status === 'running' || status.status === 'paused') && actions.onStop) {
        actionButtons.push(
          <Tooltip key="stop" content="Stop Workflow">
            <Button size="xs" variant="ghost" onClick={actions.onStop} icon={<Square />} />
          </Tooltip>
        )
      }

      if (actions.onEdit) {
        actionButtons.push(
          <Tooltip key="edit" content="Edit Workflow">
            <Button size="xs" variant="ghost" onClick={actions.onEdit} icon={<MoreHorizontal />} />
          </Tooltip>
        )
      }

      return actionButtons
    }

    if (variant === 'compact') {
      return (
        <Card
          ref={ref}
          variant="default"
          padding="sm"
          clickable={selectable || !!actions?.onView}
          selected={selected}
          onClick={selectable ? handleSelect : actions?.onView}
          className={className}
          testId={testId}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {name}
                </h3>
                <Badge size="xs" variant={statusInfo.variant} icon={<StatusIcon />}>
                  {statusInfo.label}
                </Badge>
                {priority !== 'medium' && (
                  <Badge size="xs" variant={priorityInfo.variant}>
                    {priorityInfo.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                <SimpleProgressBar
                  value={status.progress}
                  max={100}
                  size="xs"
                  showPercentage={false}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {status.completedSteps}/{status.totalSteps}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">{renderActions()}</div>
          </div>
        </Card>
      )
    }

    return (
      <Card
        ref={ref}
        variant="default"
        padding="md"
        clickable={selectable || !!actions?.onView}
        selected={selected}
        onClick={selectable ? handleSelect : actions?.onView}
        className={className}
        testId={testId}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">{name}</h3>
                <Badge size="xs" variant={statusInfo.variant} icon={<StatusIcon />}>
                  {statusInfo.label}
                </Badge>
                {priority !== 'medium' && (
                  <Badge size="xs" variant={priorityInfo.variant}>
                    {priorityInfo.label}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-1">{renderActions()}</div>
          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {status.completedSteps}/{status.totalSteps} steps ({Math.round(status.progress)}%)
              </span>
            </div>
            <SimpleProgressBar value={status.progress} max={100} size="sm" showPercentage={false} />
            {status.currentStep && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Current: {status.currentStep}
              </p>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {status.startTime && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Timer className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Duration</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDuration(status.startTime, status.endTime)}
                </p>
              </div>
            )}

            {assignedAgents.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Agents</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {assignedAgents.length}
                </p>
              </div>
            )}
          </div>

          {/* Estimated Completion */}
          {status.estimatedCompletion && status.status === 'running' && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {formatEstimated(status.estimatedCompletion)}
              </span>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} size="xs" variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardBody>

        {(status.startTime || assignedAgents.length > 0) && (
          <CardFooter separator>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
              {status.startTime && <span>Started: {status.startTime.toLocaleString()}</span>}
              {assignedAgents.length > 0 && <span>Agents: {assignedAgents.join(', ')}</span>}
            </div>
          </CardFooter>
        )}
      </Card>
    )
  }
)

WorkflowCard.displayName = 'WorkflowCard'
