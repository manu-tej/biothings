'use client';

import React, { forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Home,
  Settings,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Avatar } from '../atoms/Avatar';
import { Tooltip } from '../atoms/Tooltip';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  active?: boolean;
  disabled?: boolean;
  children?: SidebarItem[];
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface SidebarProps {
  sections: SidebarSection[];
  onItemClick?: (item: SidebarItem) => void;
  onSectionToggle?: (sectionId: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  width?: number;
  collapsedWidth?: number;
  showToggle?: boolean;
  showProfile?: boolean;
  profileName?: string;
  profileAvatar?: string;
  profileStatus?: 'online' | 'offline' | 'away' | 'busy';
  onProfileClick?: () => void;
  onLogout?: () => void;
  variant?: 'default' | 'compact' | 'floating';
  position?: 'fixed' | 'sticky' | 'static';
  overlay?: boolean;
  onOverlayClick?: () => void;
  className?: string;
  testId?: string;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    {
      sections,
      onItemClick,
      onSectionToggle,
      collapsed = false,
      onCollapsedChange,
      width = 280,
      collapsedWidth = 64,
      showToggle = true,
      showProfile = false,
      profileName,
      profileAvatar,
      profileStatus = 'online',
      onProfileClick,
      onLogout,
      variant = 'default',
      position = 'sticky',
      overlay = false,
      onOverlayClick,
      className,
      testId,
    },
    ref
  ) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const handleToggleCollapse = () => {
      onCollapsedChange?.(!collapsed);
    };

    const handleSectionToggle = (sectionId: string) => {
      const newExpanded = new Set(expandedSections);
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.add(sectionId);
      }
      setExpandedSections(newExpanded);
      onSectionToggle?.(sectionId);
    };

    const handleItemToggle = (itemId: string) => {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      setExpandedItems(newExpanded);
    };

    const handleItemClick = (item: SidebarItem) => {
      if (item.disabled) return;
      
      if (item.children && item.children.length > 0) {
        handleItemToggle(item.id);
      } else {
        onItemClick?.(item);
        item.onClick?.();
      }
    };

    const renderItem = (item: SidebarItem, level = 0, parentCollapsed = false) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.has(item.id);
      const showChildren = hasChildren && isExpanded && !collapsed;
      const ItemIcon = item.icon;

      const itemContent = (
        <div
          className={clsx(
            'flex items-center justify-between w-full p-2 rounded-lg transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            item.active && 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
            item.disabled && 'opacity-50 cursor-not-allowed',
            !item.disabled && 'cursor-pointer',
            level > 0 && 'ml-4'
          )}
          style={{ paddingLeft: collapsed ? '0.5rem' : `${0.5 + level * 1}rem` }}
          onClick={() => handleItemClick(item)}
        >
          <div className="flex items-center gap-3 min-w-0">
            {ItemIcon && (
              <ItemIcon className={clsx(
                'w-5 h-5 flex-shrink-0',
                item.active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              )} />
            )}
            {!collapsed && (
              <span className={clsx(
                'font-medium truncate',
                item.active 
                  ? 'text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-300'
              )}>
                {item.label}
              </span>
            )}
          </div>
          
          {!collapsed && (
            <div className="flex items-center gap-1">
              {item.badge && (
                <Badge 
                  size="xs" 
                  variant={item.active ? 'primary' : 'secondary'}
                >
                  {item.badge}
                </Badge>
              )}
              {hasChildren && (
                <div className="w-4 h-4 flex items-center justify-center">
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );

      return (
        <div key={item.id}>
          {collapsed && ItemIcon && item.badge ? (
            <Tooltip content={`${item.label} (${item.badge})`}>
              {itemContent}
            </Tooltip>
          ) : collapsed && ItemIcon ? (
            <Tooltip content={item.label}>
              {itemContent}
            </Tooltip>
          ) : (
            itemContent
          )}
          
          {showChildren && (
            <div className="mt-1 space-y-1">
              {item.children!.map(child => renderItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    const renderSection = (section: SidebarSection) => {
      const isSectionExpanded = expandedSections.has(section.id);
      const showItems = !section.collapsible || isSectionExpanded;

      return (
        <div key={section.id} className="space-y-1">
          {section.title && !collapsed && (
            <div className="flex items-center justify-between px-2 py-1">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>
              {section.collapsible && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleSectionToggle(section.id)}
                  icon={isSectionExpanded ? <ChevronUp /> : <ChevronDown />}
                />
              )}
            </div>
          )}
          
          {showItems && (
            <div className="space-y-1">
              {section.items.map(item => renderItem(item))}
            </div>
          )}
        </div>
      );
    };

    const renderProfile = () => {
      if (!showProfile) return null;

      return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className={clsx(
            'flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer',
            collapsed && 'justify-center'
          )} onClick={onProfileClick}>
            <Avatar
              src={profileAvatar}
              name={profileName}
              size="sm"
              status={profileStatus}
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {profileName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {profileStatus}
                </p>
              </div>
            )}
            {!collapsed && onLogout && (
              <Tooltip content="Logout">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogout();
                  }}
                  icon={<LogOut />}
                />
              </Tooltip>
            )}
          </div>
        </div>
      );
    };

    const sidebarWidth = collapsed ? collapsedWidth : width;

    return (
      <>
        {/* Overlay for mobile */}
        {overlay && !collapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onOverlayClick}
          />
        )}

        <aside
          ref={ref}
          className={clsx(
            'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700',
            'flex flex-col h-full transition-all duration-300 ease-in-out',
            position === 'fixed' && 'fixed top-0 left-0 z-50',
            position === 'sticky' && 'sticky top-0',
            variant === 'floating' && 'rounded-lg shadow-lg m-2',
            overlay && 'z-50',
            className
          )}
          style={{ width: sidebarWidth }}
          data-testid={testId}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {!collapsed && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Menu
              </h2>
            )}
            {showToggle && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleCollapse}
                icon={collapsed ? <ChevronRight /> : <ChevronLeft />}
                className={collapsed ? 'mx-auto' : ''}
              />
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {sections.map(renderSection)}
          </nav>

          {/* Profile */}
          {showProfile && (
            <div className="p-4">
              {renderProfile()}
            </div>
          )}
        </aside>
      </>
    );
  }
);

Sidebar.displayName = 'Sidebar';