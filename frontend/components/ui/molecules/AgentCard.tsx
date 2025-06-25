'use client';

import { clsx } from 'clsx';
import { 
  Clock, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Square,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import React, { forwardRef } from 'react';

import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card, CardHeader, CardBody, CardFooter } from '../atoms/Card';
import { Tooltip } from '../atoms/Tooltip';

export interface AgentStatus {
  status: 'active' | 'idle' | 'error' | 'offline';
  lastSeen?: Date;
  uptime?: number;
  tasksCompleted?: number;
  currentTask?: string;
}

export interface AgentMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  activeConnections?: number;
  throughput?: number;
}

export interface AgentCardProps {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: AgentStatus;
  metrics?: AgentMetrics;
  avatar?: string;
  tags?: string[];
  actions?: {
    onStart?: () => void;
    onPause?: () => void;
    onStop?: () => void;
    onSettings?: () => void;
    onView?: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
  testId?: string;
}

const statusConfig = {
  active: {
    color: 'green' as const,
    badgeVariant: 'success' as const,
    icon: CheckCircle,
    label: 'Active',
  },
  idle: {
    color: 'yellow' as const,
    badgeVariant: 'warning' as const,
    icon: Clock,
    label: 'Idle',
  },
  error: {
    color: 'red' as const,
    badgeVariant: 'danger' as const,
    icon: AlertCircle,
    label: 'Error',
  },
  offline: {
    color: 'gray' as const,
    badgeVariant: 'secondary' as const,
    icon: Square,
    label: 'Offline',
  },
};

const sizeStyles = {
  sm: {
    avatar: 'sm' as const,
    padding: 'sm' as const,
    title: 'text-sm font-medium',
    subtitle: 'text-xs',
    metrics: 'text-xs',
  },
  md: {
    avatar: 'md' as const,
    padding: 'md' as const,
    title: 'text-base font-medium',
    subtitle: 'text-sm',
    metrics: 'text-sm',
  },
  lg: {
    avatar: 'lg' as const,
    padding: 'lg' as const,
    title: 'text-lg font-medium',
    subtitle: 'text-base',
    metrics: 'text-base',
  },
};

export const AgentCard = forwardRef<HTMLDivElement, AgentCardProps>(
  (
    {
      id,
      name,
      type,
      description,
      status,
      metrics,
      avatar,
      tags = [],
      actions,
      size = 'md',
      variant = 'default',
      selectable = false,
      selected = false,
      onSelect,
      className,
      testId,
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const statusInfo = statusConfig[status.status];
    const StatusIcon = statusInfo.icon;

    const formatUptime = (seconds?: number) => {
      if (!seconds) return '';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    };

    const formatMetric = (value?: number, suffix = '') => {
      if (value === undefined) return '';
      return `${value}${suffix}`;
    };

    const handleSelect = () => {
      if (selectable) {
        onSelect?.(!selected);
      }
    };

    const renderActions = () => {
      if (!actions) return null;

      const actionButtons = [];
      
      if (status.status === 'active' && actions.onPause) {
        actionButtons.push(
          <Tooltip key="pause" content="Pause Agent">
            <Button
              size="xs"
              variant="ghost"
              onClick={actions.onPause}
              icon={<Pause />}
            />
          </Tooltip>
        );
      }
      
      if (status.status !== 'active' && actions.onStart) {
        actionButtons.push(
          <Tooltip key="start" content="Start Agent">
            <Button
              size="xs"
              variant="ghost"
              onClick={actions.onStart}
              icon={<Play />}
            />
          </Tooltip>
        );
      }
      
      if (actions.onStop) {
        actionButtons.push(
          <Tooltip key="stop" content="Stop Agent">
            <Button
              size="xs"
              variant="ghost"
              onClick={actions.onStop}
              icon={<Square />}
            />
          </Tooltip>
        );
      }

      if (actions.onSettings) {
        actionButtons.push(
          <Tooltip key="settings" content="Settings">
            <Button
              size="xs"
              variant="ghost"
              onClick={actions.onSettings}
              icon={<MoreHorizontal />}
            />
          </Tooltip>
        );
      }

      return actionButtons;
    };

    if (variant === 'compact') {
      return (
        <Card
          ref={ref}
          variant="default"
          padding={sizes.padding}
          clickable={selectable || !!actions?.onView}
          selected={selected}
          onClick={selectable ? handleSelect : actions?.onView}
          className={className}
          testId={testId}
        >
          <div className="flex items-center gap-3">
            <Avatar
              src={avatar}
              name={name}
              size={sizes.avatar}
              status={status.status === 'offline' ? 'offline' : 'online'}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={clsx(sizes.title, 'text-gray-900 dark:text-gray-100 truncate')}>
                  {name}
                </h3>
                <Badge
                  size="xs"
                  variant={statusInfo.badgeVariant}
                  dot
                  dotColor={`bg-${statusInfo.color}-500`}
                >
                  {statusInfo.label}
                </Badge>
              </div>
              <p className={clsx(sizes.subtitle, 'text-gray-600 dark:text-gray-400 truncate')}>
                {type}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {renderActions()}
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        ref={ref}
        variant="default"
        padding={sizes.padding}
        clickable={selectable || !!actions?.onView}
        selected={selected}
        onClick={selectable ? handleSelect : actions?.onView}
        className={className}
        testId={testId}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar
              src={avatar}
              name={name}
              size={sizes.avatar}
              status={status.status === 'offline' ? 'offline' : 'online'}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={clsx(sizes.title, 'text-gray-900 dark:text-gray-100')}>
                  {name}
                </h3>
                <Badge
                  size="xs"
                  variant={statusInfo.badgeVariant}
                  icon={<StatusIcon />}
                >
                  {statusInfo.label}
                </Badge>
              </div>
              <p className={clsx(sizes.subtitle, 'text-gray-600 dark:text-gray-400 mt-1')}>
                {type}
              </p>
              {description && (
                <p className={clsx(sizes.subtitle, 'text-gray-500 dark:text-gray-500 mt-1')}>
                  {description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {renderActions()}
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-3">
          {/* Current Task */}
          {status.currentTask && (
            <div>
              <p className={clsx(sizes.metrics, 'text-gray-600 dark:text-gray-400')}>
                Current Task:
              </p>
              <p className={clsx(sizes.subtitle, 'text-gray-900 dark:text-gray-100 font-medium')}>
                {status.currentTask}
              </p>
            </div>
          )}

          {/* Metrics */}
          {(metrics || status.tasksCompleted !== undefined || status.uptime !== undefined) && (
            <div className="grid grid-cols-2 gap-3">
              {status.tasksCompleted !== undefined && (
                <div>
                  <p className={clsx(sizes.metrics, 'text-gray-600 dark:text-gray-400')}>
                    Tasks Completed
                  </p>
                  <p className={clsx(sizes.subtitle, 'text-gray-900 dark:text-gray-100 font-medium')}>
                    {status.tasksCompleted}
                  </p>
                </div>
              )}
              
              {status.uptime !== undefined && (
                <div>
                  <p className={clsx(sizes.metrics, 'text-gray-600 dark:text-gray-400')}>
                    Uptime
                  </p>
                  <p className={clsx(sizes.subtitle, 'text-gray-900 dark:text-gray-100 font-medium')}>
                    {formatUptime(status.uptime)}
                  </p>
                </div>
              )}
              
              {metrics?.cpuUsage !== undefined && (
                <div>
                  <p className={clsx(sizes.metrics, 'text-gray-600 dark:text-gray-400')}>
                    CPU Usage
                  </p>
                  <p className={clsx(sizes.subtitle, 'text-gray-900 dark:text-gray-100 font-medium')}>
                    {formatMetric(metrics.cpuUsage, '%')}
                  </p>
                </div>
              )}
              
              {metrics?.throughput !== undefined && (
                <div>
                  <p className={clsx(sizes.metrics, 'text-gray-600 dark:text-gray-400')}>
                    Throughput
                  </p>
                  <p className={clsx(sizes.subtitle, 'text-gray-900 dark:text-gray-100 font-medium')}>
                    {formatMetric(metrics.throughput, '/s')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <Badge key={tag} size="xs" variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardBody>

        {status.lastSeen && (
          <CardFooter separator>
            <p className={clsx(sizes.metrics, 'text-gray-500 dark:text-gray-500')}>
              Last seen: {status.lastSeen.toLocaleString()}
            </p>
          </CardFooter>
        )}
      </Card>
    );
  }
);

AgentCard.displayName = 'AgentCard';