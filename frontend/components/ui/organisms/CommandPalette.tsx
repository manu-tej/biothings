'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useQuickSearch } from '../../../lib/search/useSearch';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Badge } from '../atoms/Badge';

export interface Command {
  id: string;
  name: string;
  description?: string;
  category: string;
  keywords: string[];
  icon?: string;
  shortcut?: string[];
  action: () => void | Promise<void>;
  priority?: number;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands = [],
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Default commands
  const defaultCommands: Command[] = [
    {
      id: 'dashboard',
      name: 'Go to Dashboard',
      description: 'Navigate to the main dashboard',
      category: 'Navigation',
      keywords: ['dashboard', 'home', 'main'],
      icon: '🏠',
      shortcut: ['Cmd', '1'],
      action: () => window.location.href = '/dashboard',
      priority: 10,
    },
    {
      id: 'agents',
      name: 'Go to Agents',
      description: 'View and manage agents',
      category: 'Navigation',
      keywords: ['agents', 'ai', 'bots'],
      icon: '🤖',
      shortcut: ['Cmd', '2'],
      action: () => window.location.href = '/dashboard/agents',
      priority: 9,
    },
    {
      id: 'workflows',
      name: 'Go to Workflows',
      description: 'View and manage workflows',
      category: 'Navigation',
      keywords: ['workflows', 'processes'],
      icon: '⚡',
      shortcut: ['Cmd', '3'],
      action: () => window.location.href = '/dashboard/workflows',
      priority: 9,
    },
    {
      id: 'analytics',
      name: 'Go to Analytics',
      description: 'View system analytics',
      category: 'Navigation',
      keywords: ['analytics', 'charts', 'stats'],
      icon: '📊',
      shortcut: ['Cmd', '4'],
      action: () => window.location.href = '/dashboard/analytics',
      priority: 8,
    },
    {
      id: 'settings',
      name: 'Go to Settings',
      description: 'Configure system settings',
      category: 'Navigation',
      keywords: ['settings', 'config', 'preferences'],
      icon: '⚙️',
      shortcut: ['Cmd', ','],
      action: () => window.location.href = '/dashboard/settings',
      priority: 7,
    },
    {
      id: 'refresh',
      name: 'Refresh Data',
      description: 'Refresh current page data',
      category: 'Actions',
      keywords: ['refresh', 'reload', 'update'],
      icon: '🔄',
      shortcut: ['F5'],
      action: () => window.location.reload(),
      priority: 6,
    },
    {
      id: 'export-data',
      name: 'Export Data',
      description: 'Export current data to file',
      category: 'Actions',
      keywords: ['export', 'download', 'save'],
      icon: '📥',
      action: () => console.log('Export data'),
      priority: 5,
    },
    {
      id: 'create-agent',
      name: 'Create New Agent',
      description: 'Create a new agent',
      category: 'Create',
      keywords: ['create', 'new', 'agent'],
      icon: '➕',
      action: () => console.log('Create agent'),
      priority: 4,
    },
    {
      id: 'create-workflow',
      name: 'Create New Workflow',
      description: 'Create a new workflow',
      category: 'Create',
      keywords: ['create', 'new', 'workflow'],
      icon: '➕',
      action: () => console.log('Create workflow'),
      priority: 4,
    },
  ];

  const allCommands = [...defaultCommands, ...commands];

  // Filter commands based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredCommands(allCommands.sort((a, b) => (b.priority || 0) - (a.priority || 0)));
    } else {
      const filtered = allCommands.filter(command => {
        const searchString = `${command.name} ${command.description} ${command.category} ${command.keywords.join(' ')}`.toLowerCase();
        return searchString.includes(query.toLowerCase());
      });
      
      // Sort by relevance
      filtered.sort((a, b) => {
        const aScore = getRelevanceScore(a, query);
        const bScore = getRelevanceScore(b, query);
        return bScore - aScore;
      });
      
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
  }, [query, allCommands]);

  // Handle keyboard navigation
  useHotkeys(
    'arrowdown',
    () => {
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    },
    { enabled: isOpen, preventDefault: true }
  );

  useHotkeys(
    'arrowup',
    () => {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    },
    { enabled: isOpen, preventDefault: true }
  );

  useHotkeys(
    'enter',
    () => {
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    },
    { enabled: isOpen, preventDefault: true }
  );

  useHotkeys(
    'escape',
    () => {
      onClose();
    },
    { enabled: isOpen, preventDefault: true }
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const executeCommand = useCallback(async (command: Command) => {
    try {
      await command.action();
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }, [onClose]);

  const getRelevanceScore = (command: Command, query: string): number => {
    const lowerQuery = query.toLowerCase();
    let score = 0;
    
    if (command.name.toLowerCase().startsWith(lowerQuery)) score += 10;
    if (command.name.toLowerCase().includes(lowerQuery)) score += 5;
    if (command.description?.toLowerCase().includes(lowerQuery)) score += 3;
    if (command.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))) score += 2;
    if (command.category.toLowerCase().includes(lowerQuery)) score += 1;
    
    return score + (command.priority || 0);
  };

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, Command[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-96 overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full"
          />
        </div>

        {/* Commands List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900">
                  {category}
                </div>
                {categoryCommands.map((command, index) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  return (
                    <div
                      key={command.id}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        globalIndex === selectedIndex
                          ? 'bg-blue-50 dark:bg-blue-900 border-r-2 border-blue-500'
                          : ''
                      }`}
                      onClick={() => executeCommand(command)}
                    >
                      <div className="flex items-center space-x-3">
                        {command.icon && (
                          <span className="text-lg">{command.icon}</span>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {command.name}
                          </div>
                          {command.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {command.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {command.shortcut && (
                        <div className="flex space-x-1">
                          {command.shortcut.map((key, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {key}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <div className="flex space-x-4">
              <span>↑↓ Navigate</span>
              <span>↵ Execute</span>
              <span>Esc Close</span>
            </div>
            <div>
              {filteredCommands.length} commands
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;