'use client';

import { clsx } from 'clsx';
import { 
  Home, 
  BarChart3, 
  Users, 
  Workflow, 
  Settings,
  ChevronLeft,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { useDashboardStore } from '@/lib/stores/dashboardStore';
import { useUIStore } from '@/lib/stores/uiStore';

import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';

export interface SidebarProps {
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary';
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const pathname = usePathname();
  const { layout, toggleSidebar } = useUIStore();
  const { notifications, agents, workflows } = useDashboardStore();

  // Calculate dynamic badge values
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const activeAgents = Array.from(agents.values()).filter(a => a.status === 'active').length;
  const runningWorkflows = Array.from(workflows.values()).filter(w => w.status === 'running').length;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'overview',
      label: 'Overview',
      href: '/dashboard/overview',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      id: 'agents',
      label: 'Agents',
      href: '/dashboard/agents',
      icon: <Users className="w-5 h-5" />,
      badge: activeAgents > 0 ? activeAgents : undefined,
      badgeVariant: 'success',
    },
    {
      id: 'workflows',
      label: 'Workflows',
      href: '/dashboard/workflows',
      icon: <Workflow className="w-5 h-5" />,
      badge: runningWorkflows > 0 ? runningWorkflows : undefined,
      badgeVariant: 'warning',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: '/dashboard/analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/dashboard/settings',
      icon: <Settings className="w-5 h-5" />,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
      badgeVariant: 'danger',
    },
  ];

  const isCollapsed = layout.sidebarCollapsed;

  return (
    <aside
      className={clsx(
        'flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out h-screen',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              BioThings
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          icon={<ChevronLeft className={clsx('w-4 h-4 transition-transform', isCollapsed && 'rotate-180')} />}
          className="p-1"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                isCollapsed && 'justify-center'
              )}
            >
              <span className="flex-shrink-0">
                {item.icon}
              </span>
              
              {!isCollapsed && (
                <>
                  <span className="flex-1">
                    {item.label}
                  </span>
                  
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant || 'default'}
                      size="xs"
                      className="ml-auto"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.label}
                  {item.badge && (
                    <span className="ml-1">
                      ({item.badge})
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <Badge variant="success" size="xs">Online</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Version</span>
              <span>v1.0.0</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
          </div>
        )}
      </div>
    </aside>
  );
};