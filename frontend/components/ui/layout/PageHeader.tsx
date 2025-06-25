'use client';

import { clsx } from 'clsx';
import { 
  ChevronRight, 
  Bell, 
  Search,
  Menu
} from 'lucide-react';
import React, { forwardRef } from 'react';

import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Tooltip } from '../atoms/Tooltip';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

export interface PageHeaderAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  badge?: string | number;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: PageHeaderAction[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  showProfile?: boolean;
  profileName?: string;
  profileAvatar?: string;
  profileStatus?: 'online' | 'offline' | 'away' | 'busy';
  onProfileClick?: () => void;
  showMenuToggle?: boolean;
  onMenuToggle?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'minimal';
  sticky?: boolean;
  className?: string;
  testId?: string;
}

const sizeStyles = {
  sm: {
    padding: 'px-4 py-2',
    title: 'text-lg font-semibold',
    subtitle: 'text-sm',
    spacing: 'gap-2',
  },
  md: {
    padding: 'px-6 py-4',
    title: 'text-xl font-semibold',
    subtitle: 'text-base',
    spacing: 'gap-3',
  },
  lg: {
    padding: 'px-8 py-6',
    title: 'text-2xl font-bold',
    subtitle: 'text-lg',
    spacing: 'gap-4',
  },
};

export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  (
    {
      title,
      subtitle,
      breadcrumbs = [],
      actions = [],
      showSearch = false,
      searchPlaceholder = 'Search...',
      onSearch,
      showNotifications = false,
      notificationCount = 0,
      onNotificationsClick,
      showProfile = false,
      profileName,
      profileAvatar,
      profileStatus = 'online',
      onProfileClick,
      showMenuToggle = false,
      onMenuToggle,
      size = 'md',
      variant = 'default',
      sticky = false,
      className,
      testId,
    },
    ref
  ) => {
    const sizes = sizeStyles[size];

    const renderBreadcrumbs = () => {
      if (breadcrumbs.length === 0) return null;

      return (
        <nav className="flex items-center space-x-1 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const ItemIcon = item.icon;

            return (
              <div key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-1" />
                )}
                <div className="flex items-center gap-1">
                  {ItemIcon && (
                    <ItemIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  )}
                  {item.href || item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className={clsx(
                        'hover:text-gray-900 dark:hover:text-gray-100 transition-colors',
                        isLast 
                          ? 'text-gray-900 dark:text-gray-100 font-medium cursor-default' 
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      className={clsx(
                        isLast 
                          ? 'text-gray-900 dark:text-gray-100 font-medium' 
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </nav>
      );
    };

    const renderActions = () => {
      if (actions.length === 0) return null;

      return (
        <div className={clsx('flex items-center', sizes.spacing)}>
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            
            return (
              <div key={index} className="relative">
                <Button
                  size={size}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  icon={ActionIcon ? <ActionIcon /> : undefined}
                >
                  {action.label}
                </Button>
                {action.badge && (
                  <Badge
                    size="xs"
                    variant="danger"
                    className="absolute -top-1 -right-1"
                  >
                    {action.badge}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    const renderUtilities = () => {
      const hasUtilities = showSearch || showNotifications || showProfile;
      if (!hasUtilities) return null;

      return (
        <div className={clsx('flex items-center', sizes.spacing)}>
          {showSearch && (
            <div className="w-64">
              <Input
                placeholder={searchPlaceholder}
                icon={<Search />}
                inputSize={size}
                onChange={(e) => onSearch?.(e.target.value)}
              />
            </div>
          )}

          {showNotifications && (
            <div className="relative">
              <Tooltip content="Notifications">
                <Button
                  size={size}
                  variant="ghost"
                  onClick={onNotificationsClick}
                  icon={<Bell />}
                />
              </Tooltip>
              {notificationCount > 0 && (
                <Badge
                  size="xs"
                  variant="danger"
                  className="absolute -top-1 -right-1"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
            </div>
          )}

          {showProfile && (
            <Tooltip content={profileName || 'Profile'}>
              <button
                onClick={onProfileClick}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Avatar
                  src={profileAvatar}
                  name={profileName}
                  size={size === 'lg' ? 'md' : 'sm'}
                  status={profileStatus}
                />
                {variant !== 'minimal' && profileName && (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {profileName}
                  </span>
                )}
              </button>
            </Tooltip>
          )}
        </div>
      );
    };

    if (variant === 'minimal') {
      return (
        <header
          ref={ref}
          className={clsx(
            'border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
            sizes.padding,
            sticky && 'sticky top-0 z-40',
            className
          )}
          data-testid={testId}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showMenuToggle && (
                <Button
                  size={size}
                  variant="ghost"
                  onClick={onMenuToggle}
                  icon={<Menu />}
                />
              )}
              <h1 className={clsx(sizes.title, 'text-gray-900 dark:text-gray-100')}>
                {title}
              </h1>
            </div>
            {renderUtilities()}
          </div>
        </header>
      );
    }

    if (variant === 'compact') {
      return (
        <header
          ref={ref}
          className={clsx(
            'border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
            sizes.padding,
            sticky && 'sticky top-0 z-40',
            className
          )}
          data-testid={testId}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showMenuToggle && (
                <Button
                  size={size}
                  variant="ghost"
                  onClick={onMenuToggle}
                  icon={<Menu />}
                />
              )}
              <div>
                {renderBreadcrumbs()}
                <h1 className={clsx(sizes.title, 'text-gray-900 dark:text-gray-100 mt-1')}>
                  {title}
                </h1>
              </div>
            </div>
            <div className={clsx('flex items-center', sizes.spacing)}>
              {renderActions()}
              {renderUtilities()}
            </div>
          </div>
        </header>
      );
    }

    return (
      <header
        ref={ref}
        className={clsx(
          'border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
          sizes.padding,
          sticky && 'sticky top-0 z-40',
          className
        )}
        data-testid={testId}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            {showMenuToggle && (
              <Button
                size={size}
                variant="ghost"
                onClick={onMenuToggle}
                icon={<Menu />}
              />
            )}
            {renderBreadcrumbs()}
          </div>
          {renderUtilities()}
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <h1 className={clsx(sizes.title, 'text-gray-900 dark:text-gray-100')}>
              {title}
            </h1>
            {subtitle && (
              <p className={clsx(sizes.subtitle, 'text-gray-600 dark:text-gray-400 mt-1')}>
                {subtitle}
              </p>
            )}
          </div>
          {renderActions()}
        </div>
      </header>
    );
  }
);

PageHeader.displayName = 'PageHeader';