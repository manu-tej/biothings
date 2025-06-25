'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/atoms/Card';
import { Button } from '@/components/ui/atoms/Button';
import { Input } from '@/components/ui/atoms/Input';
import { Select } from '@/components/ui/atoms/Select';
import { Switch } from '@/components/ui/atoms/Switch';
import { Badge } from '@/components/ui/atoms/Badge';
import { AlertBanner } from '@/components/ui/molecules/AlertBanner';
import { useDashboardStore } from '@/lib/stores/dashboardStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useWebSocketStore } from '@/lib/stores/websocketStore';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Bell, 
  Palette, 
  Shield, 
  Database, 
  Wifi,
  Users,
  Activity
} from 'lucide-react';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function SettingsPage() {
  const { addNotification } = useDashboardStore();
  const {
    preferences,
    layout,
    setTheme,
    toggleSidebar,
    updatePreferences
  } = useUIStore();
  const { getConnectionStatus } = useWebSocketStore();
  
  const [activeSection, setActiveSection] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Local settings state
  const [settings, setSettings] = useState({
    // General settings
    dashboardTitle: 'BioThings Dashboard',
    refreshInterval: preferences.refreshInterval || 30,
    timezone: preferences.timezone || 'UTC',
    language: preferences.language || 'en',
    
    // Notifications
    enableNotifications: true,
    emailNotifications: true,
    desktopNotifications: false,
    alertThreshold: 80,
    
    // Appearance
    theme: preferences.theme || 'light',
    compactMode: preferences.compactMode || false,
    showGridLines: true,
    animationsEnabled: preferences.animations || true,
    
    // WebSocket
    wsReconnectInterval: 5000,
    wsMaxRetries: 10,
    wsHeartbeatInterval: 30000,
    
    // Agent Management
    defaultAgentTimeout: 30000,
    maxConcurrentAgents: 100,
    agentMetricsRetention: 7,
    
    // Workflow Settings
    workflowHistoryLimit: 1000,
    autoRetryFailedWorkflows: true,
    maxWorkflowRetries: 3,
    
    // Data & Security
    dataRetentionDays: 30,
    enableAuditLogging: true,
    sessionTimeout: 3600,
    requireMFA: false,
  });

  const settingsSections: SettingsSection[] = [
    {
      id: 'general',
      title: 'General',
      description: 'Basic dashboard configuration',
      icon: <Settings className="w-5 h-5" />,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Alert and notification preferences',
      icon: <Bell className="w-5 h-5" />,
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Theme and display options',
      icon: <Palette className="w-5 h-5" />,
    },
    {
      id: 'websocket',
      title: 'WebSocket',
      description: 'Real-time connection settings',
      icon: <Wifi className="w-5 h-5" />,
    },
    {
      id: 'agents',
      title: 'Agents',
      description: 'Agent management configuration',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'workflows',
      title: 'Workflows',
      description: 'Workflow execution settings',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      id: 'security',
      title: 'Security & Data',
      description: 'Security and data retention settings',
      icon: <Shield className="w-5 h-5" />,
    },
  ];

  useEffect(() => {
    // Load saved settings from localStorage or API
    const savedSettings = localStorage.getItem('dashboard-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('dashboard-settings', JSON.stringify(settings));
      
      // Update stores
      if (settings.theme !== preferences.theme) {
        setTheme(settings.theme as 'light' | 'dark' | 'auto');
      }
      
      // Update preferences
      updatePreferences({
        refreshInterval: settings.refreshInterval,
        theme: settings.theme as 'light' | 'dark' | 'auto',
        compactMode: settings.compactMode,
        animations: settings.animationsEnabled,
        timezone: settings.timezone,
        language: settings.language,
      });

      setHasChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to default values
    setSettings({
      dashboardTitle: 'BioThings Dashboard',
      refreshInterval: 30,
      timezone: 'UTC',
      language: 'en',
      enableNotifications: true,
      emailNotifications: true,
      desktopNotifications: false,
      alertThreshold: 80,
      theme: 'light',
      compactMode: false,
      showGridLines: true,
      animationsEnabled: true,
      wsReconnectInterval: 5000,
      wsMaxRetries: 10,
      wsHeartbeatInterval: 30000,
      defaultAgentTimeout: 30000,
      maxConcurrentAgents: 100,
      agentMetricsRetention: 7,
      workflowHistoryLimit: 1000,
      autoRetryFailedWorkflows: true,
      maxWorkflowRetries: 3,
      dataRetentionDays: 30,
      enableAuditLogging: true,
      sessionTimeout: 3600,
      requireMFA: false,
    });
    setHasChanges(true);
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dashboard Title
        </label>
        <Input
          value={settings.dashboardTitle}
          onChange={(e) => handleSettingChange('dashboardTitle', e.target.value)}
          placeholder="Enter dashboard title"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Refresh Interval (seconds)
        </label>
        <Select
          value={settings.refreshInterval.toString()}
          onChange={(value) => handleSettingChange('refreshInterval', parseInt(value))}
          options={[
            { value: '5', label: '5 seconds' },
            { value: '10', label: '10 seconds' },
            { value: '30', label: '30 seconds' },
            { value: '60', label: '1 minute' },
            { value: '300', label: '5 minutes' },
          ]}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Timezone
        </label>
        <Select
          value={settings.timezone}
          onChange={(value) => handleSettingChange('timezone', value)}
          options={[
            { value: 'UTC', label: 'UTC' },
            { value: 'America/New_York', label: 'Eastern Time' },
            { value: 'America/Chicago', label: 'Central Time' },
            { value: 'America/Denver', label: 'Mountain Time' },
            { value: 'America/Los_Angeles', label: 'Pacific Time' },
          ]}
        />
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable Notifications
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Receive alerts and notifications
          </p>
        </div>
        <Switch
          checked={settings.enableNotifications}
          onChange={(checked) => handleSettingChange('enableNotifications', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Notifications
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Send notifications via email
          </p>
        </div>
        <Switch
          checked={settings.emailNotifications}
          onChange={(checked) => handleSettingChange('emailNotifications', checked)}
          disabled={!settings.enableNotifications}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Desktop Notifications
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Show browser notifications
          </p>
        </div>
        <Switch
          checked={settings.desktopNotifications}
          onChange={(checked) => handleSettingChange('desktopNotifications', checked)}
          disabled={!settings.enableNotifications}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Alert Threshold (%)
        </label>
        <Input
          type="number"
          value={settings.alertThreshold}
          onChange={(e) => handleSettingChange('alertThreshold', parseInt(e.target.value))}
          min={0}
          max={100}
        />
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Theme
        </label>
        <Select
          value={settings.theme}
          onChange={(value) => handleSettingChange('theme', value)}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'auto', label: 'Auto' },
          ]}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Compact Mode
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Reduce spacing and padding
          </p>
        </div>
        <Switch
          checked={settings.compactMode}
          onChange={(checked) => handleSettingChange('compactMode', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Show Grid Lines
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Display grid lines in charts
          </p>
        </div>
        <Switch
          checked={settings.showGridLines}
          onChange={(checked) => handleSettingChange('showGridLines', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Animations
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enable UI animations
          </p>
        </div>
        <Switch
          checked={settings.animationsEnabled}
          onChange={(checked) => handleSettingChange('animationsEnabled', checked)}
        />
      </div>
    </div>
  );

  const renderWebSocketSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Connection Status
        </span>
        <Badge 
          variant={getConnectionStatus('dashboard') === 'connected' ? 'success' : 'danger'}
        >
          {getConnectionStatus('dashboard') === 'connected' ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reconnect Interval (ms)
        </label>
        <Input
          type="number"
          value={settings.wsReconnectInterval}
          onChange={(e) => handleSettingChange('wsReconnectInterval', parseInt(e.target.value))}
          min={1000}
          max={60000}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Max Retries
        </label>
        <Input
          type="number"
          value={settings.wsMaxRetries}
          onChange={(e) => handleSettingChange('wsMaxRetries', parseInt(e.target.value))}
          min={1}
          max={100}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Heartbeat Interval (ms)
        </label>
        <Input
          type="number"
          value={settings.wsHeartbeatInterval}
          onChange={(e) => handleSettingChange('wsHeartbeatInterval', parseInt(e.target.value))}
          min={5000}
          max={120000}
        />
      </div>
    </div>
  );

  const renderAgentSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Default Agent Timeout (ms)
        </label>
        <Input
          type="number"
          value={settings.defaultAgentTimeout}
          onChange={(e) => handleSettingChange('defaultAgentTimeout', parseInt(e.target.value))}
          min={1000}
          max={300000}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Max Concurrent Agents
        </label>
        <Input
          type="number"
          value={settings.maxConcurrentAgents}
          onChange={(e) => handleSettingChange('maxConcurrentAgents', parseInt(e.target.value))}
          min={1}
          max={1000}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Metrics Retention (days)
        </label>
        <Input
          type="number"
          value={settings.agentMetricsRetention}
          onChange={(e) => handleSettingChange('agentMetricsRetention', parseInt(e.target.value))}
          min={1}
          max={365}
        />
      </div>
    </div>
  );

  const renderWorkflowSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          History Limit
        </label>
        <Input
          type="number"
          value={settings.workflowHistoryLimit}
          onChange={(e) => handleSettingChange('workflowHistoryLimit', parseInt(e.target.value))}
          min={100}
          max={10000}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Auto-retry Failed Workflows
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Automatically retry failed workflows
          </p>
        </div>
        <Switch
          checked={settings.autoRetryFailedWorkflows}
          onChange={(checked) => handleSettingChange('autoRetryFailedWorkflows', checked)}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Max Workflow Retries
        </label>
        <Input
          type="number"
          value={settings.maxWorkflowRetries}
          onChange={(e) => handleSettingChange('maxWorkflowRetries', parseInt(e.target.value))}
          min={1}
          max={10}
          disabled={!settings.autoRetryFailedWorkflows}
        />
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Data Retention (days)
        </label>
        <Input
          type="number"
          value={settings.dataRetentionDays}
          onChange={(e) => handleSettingChange('dataRetentionDays', parseInt(e.target.value))}
          min={1}
          max={365}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable Audit Logging
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Log all user actions
          </p>
        </div>
        <Switch
          checked={settings.enableAuditLogging}
          onChange={(checked) => handleSettingChange('enableAuditLogging', checked)}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Session Timeout (seconds)
        </label>
        <Input
          type="number"
          value={settings.sessionTimeout}
          onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
          min={300}
          max={86400}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Require Multi-Factor Authentication
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Require MFA for all users
          </p>
        </div>
        <Switch
          checked={settings.requireMFA}
          onChange={(checked) => handleSettingChange('requireMFA', checked)}
        />
      </div>
    </div>
  );

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'websocket':
        return renderWebSocketSettings();
      case 'agents':
        return renderAgentSettings();
      case 'workflows':
        return renderWorkflowSettings();
      case 'security':
        return renderSecuritySettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure your BioThings Dashboard preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="warning">
              Unsaved Changes
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            icon={<RotateCcw />}
          >
            Reset
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
            icon={<Save />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <AlertBanner
          variant="success"
          title="Settings Saved"
          message="Your dashboard settings have been saved successfully."
          dismissible
          onDismiss={() => setShowSuccess(false)}
        />
      )}

      {/* Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {section.icon}
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {section.description}
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {settingsSections.find(s => s.id === activeSection)?.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {settingsSections.find(s => s.id === activeSection)?.description}
              </p>
            </div>
            
            {renderSettingsContent()}
          </Card>
        </div>
      </div>
    </div>
  );
}