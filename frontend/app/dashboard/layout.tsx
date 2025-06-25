'use client';

import React, { useEffect } from 'react';
import { Sidebar } from '@/components/ui/organisms/Sidebar';
import { PageHeader } from '@/components/ui/organisms/PageHeader';
import { CommandPalette } from '@/components/ui/organisms/CommandPalette';
import { useUIStore } from '@/lib/stores/uiStore';
import { performanceMonitor } from '@/lib/monitoring/PerformanceMonitor';
import { clsx } from 'clsx';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { layout } = useUIStore();

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.start();
    
    return () => {
      performanceMonitor.stop();
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Header */}
        <PageHeader />
        
        {/* Main Content */}
        <main
          className={clsx(
            'flex-1 overflow-x-hidden overflow-y-auto',
            'transition-all duration-300 ease-in-out'
          )}
        >
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette - Global overlay */}
      <CommandPalette />
    </div>
  );
}