export interface KeyboardShortcut {
  id: string
  name: string
  description: string
  keys: string[]
  action: string
  category: 'navigation' | 'actions' | 'editing' | 'system'
  customizable: boolean
}

export interface NotificationPreferences {
  sound: {
    enabled: boolean
    volume: number
    alertSound: string
    warningSound: string
    errorSound: string
  }
  desktop: {
    enabled: boolean
    showOnError: boolean
    showOnWarning: boolean
    showOnSuccess: boolean
    autoHide: boolean
    autoHideDelay: number
  }
  email: {
    enabled: boolean
    immediateAlerts: boolean
    dailyDigest: boolean
    weeklyReport: boolean
    emailAddress: string
    alertThreshold: 'all' | 'warnings' | 'errors'
  }
  inApp: {
    showBadges: boolean
    showToasts: boolean
    persistentAlerts: boolean
    groupSimilar: boolean
  }
}

export interface DataRetentionPolicy {
  logs: {
    enabled: boolean
    duration: number // days
    maxSize: number // MB
    compressionEnabled: boolean
  }
  metrics: {
    enabled: boolean
    duration: number // days
    aggregationLevel: 'raw' | 'hourly' | 'daily'
    maxDataPoints: number
  }
  exports: {
    enabled: boolean
    duration: number // days
    maxFiles: number
    autoCleanup: boolean
  }
  cache: {
    enabled: boolean
    maxSize: number // MB
    ttl: number // minutes
    clearOnRestart: boolean
  }
}

export interface AppearancePreferences {
  theme: 'light' | 'dark' | 'auto'
  colorScheme: 'default' | 'blue' | 'green' | 'purple' | 'orange'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  animations: boolean
  reducedMotion: boolean
  highContrast: boolean
}

export interface BehaviorPreferences {
  autoSave: boolean
  autoSaveInterval: number // minutes
  confirmDeletion: boolean
  confirmNavigation: boolean
  defaultPageSize: number
  enableTooltips: boolean
  showAdvancedFeatures: boolean
  enableKeyboardNavigation: boolean
}

export interface UserPreferences {
  appearance: AppearancePreferences
  behavior: BehaviorPreferences
  notifications: NotificationPreferences
  dataRetention: DataRetentionPolicy
  keyboardShortcuts: KeyboardShortcut[]
  lastUpdated: Date
  version: string
}

export interface PreferencesBackup {
  id: string
  name: string
  preferences: UserPreferences
  createdAt: Date
  description?: string
}

export class PreferencesManager {
  private preferences: UserPreferences
  private backups: PreferencesBackup[] = []
  private listeners: Map<string, (preferences: UserPreferences) => void> = new Map()
  private readonly storageKey = 'biothings-user-preferences'
  private readonly backupsKey = 'biothings-preferences-backups'

  constructor() {
    this.preferences = this.getDefaultPreferences()
    this.loadFromStorage()
    this.initializeKeyboardShortcuts()
  }

  // Preferences management
  public getPreferences(): UserPreferences {
    return { ...this.preferences }
  }

  public updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...updates,
      lastUpdated: new Date(),
    }

    this.saveToStorage()
    this.notifyListeners()
  }

  public updateAppearancePreferences(appearance: Partial<AppearancePreferences>): void {
    this.updatePreferences({
      appearance: { ...this.preferences.appearance, ...appearance },
    })
  }

  public updateBehaviorPreferences(behavior: Partial<BehaviorPreferences>): void {
    this.updatePreferences({
      behavior: { ...this.preferences.behavior, ...behavior },
    })
  }

  public updateNotificationPreferences(notifications: Partial<NotificationPreferences>): void {
    this.updatePreferences({
      notifications: { ...this.preferences.notifications, ...notifications },
    })
  }

  public updateDataRetentionPolicy(dataRetention: Partial<DataRetentionPolicy>): void {
    this.updatePreferences({
      dataRetention: { ...this.preferences.dataRetention, ...dataRetention },
    })
  }

  // Keyboard shortcuts management
  public getKeyboardShortcuts(): KeyboardShortcut[] {
    return [...this.preferences.keyboardShortcuts]
  }

  public getKeyboardShortcutsByCategory(
    category: KeyboardShortcut['category']
  ): KeyboardShortcut[] {
    return this.preferences.keyboardShortcuts.filter((shortcut) => shortcut.category === category)
  }

  public updateKeyboardShortcut(id: string, keys: string[]): boolean {
    const shortcut = this.preferences.keyboardShortcuts.find((s) => s.id === id)
    if (!shortcut || !shortcut.customizable) return false

    // Check for conflicts
    const conflict = this.preferences.keyboardShortcuts.find(
      (s) => s.id !== id && this.arraysEqual(s.keys, keys)
    )
    if (conflict) {
      throw new Error(`Keyboard shortcut conflict with "${conflict.name}"`)
    }

    shortcut.keys = keys
    this.updatePreferences({
      keyboardShortcuts: [...this.preferences.keyboardShortcuts],
    })
    return true
  }

  public resetKeyboardShortcut(id: string): boolean {
    const shortcut = this.preferences.keyboardShortcuts.find((s) => s.id === id)
    if (!shortcut || !shortcut.customizable) return false

    const defaultShortcuts = this.getDefaultKeyboardShortcuts()
    const defaultShortcut = defaultShortcuts.find((s) => s.id === id)
    if (!defaultShortcut) return false

    shortcut.keys = [...defaultShortcut.keys]
    this.updatePreferences({
      keyboardShortcuts: [...this.preferences.keyboardShortcuts],
    })
    return true
  }

  public resetAllKeyboardShortcuts(): void {
    this.updatePreferences({
      keyboardShortcuts: this.getDefaultKeyboardShortcuts(),
    })
  }

  // Backup and restore
  public createBackup(name: string, description?: string): PreferencesBackup {
    const backup: PreferencesBackup = {
      id: this.generateId(),
      name,
      preferences: { ...this.preferences },
      createdAt: new Date(),
      description,
    }

    this.backups.unshift(backup)

    // Keep only the most recent 10 backups
    if (this.backups.length > 10) {
      this.backups = this.backups.slice(0, 10)
    }

    this.saveBackupsToStorage()
    return backup
  }

  public getBackups(): PreferencesBackup[] {
    return [...this.backups]
  }

  public restoreFromBackup(backupId: string): boolean {
    const backup = this.backups.find((b) => b.id === backupId)
    if (!backup) return false

    this.preferences = { ...backup.preferences, lastUpdated: new Date() }
    this.saveToStorage()
    this.notifyListeners()
    return true
  }

  public deleteBackup(backupId: string): boolean {
    const initialLength = this.backups.length
    this.backups = this.backups.filter((b) => b.id !== backupId)

    if (this.backups.length !== initialLength) {
      this.saveBackupsToStorage()
      return true
    }
    return false
  }

  public exportPreferences(): string {
    return JSON.stringify(
      {
        preferences: this.preferences,
        backups: this.backups,
        exportedAt: new Date(),
        version: '1.0.0',
      },
      null,
      2
    )
  }

  public importPreferences(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)

      if (data.preferences && this.validatePreferences(data.preferences)) {
        this.preferences = { ...data.preferences, lastUpdated: new Date() }

        if (data.backups && Array.isArray(data.backups)) {
          this.backups = data.backups.slice(0, 10) // Limit to 10 backups
        }

        this.saveToStorage()
        this.saveBackupsToStorage()
        this.notifyListeners()
        return true
      }
    } catch (error) {
      console.error('Failed to import preferences:', error)
    }
    return false
  }

  // Reset and defaults
  public resetToDefaults(): void {
    this.preferences = this.getDefaultPreferences()
    this.saveToStorage()
    this.notifyListeners()
  }

  public resetCategory(category: keyof UserPreferences): void {
    const defaults = this.getDefaultPreferences()
    this.updatePreferences({
      [category]: defaults[category],
    })
  }

  // Event listeners
  public addListener(id: string, callback: (preferences: UserPreferences) => void): void {
    this.listeners.set(id, callback)
  }

  public removeListener(id: string): void {
    this.listeners.delete(id)
  }

  // Theme utilities
  public applyTheme(): void {
    const { theme, colorScheme } = this.preferences.appearance
    const root = document.documentElement

    // Apply theme
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }

    // Apply color scheme
    root.setAttribute('data-color-scheme', colorScheme)

    // Apply other appearance settings
    root.setAttribute('data-font-size', this.preferences.appearance.fontSize)
    root.setAttribute('data-compact-mode', this.preferences.appearance.compactMode.toString())
    root.setAttribute('data-animations', this.preferences.appearance.animations.toString())
    root.setAttribute('data-reduced-motion', this.preferences.appearance.reducedMotion.toString())
    root.setAttribute('data-high-contrast', this.preferences.appearance.highContrast.toString())
  }

  // Validation
  private validatePreferences(preferences: unknown): boolean {
    try {
      // Basic structure validation
      return (
        preferences &&
        typeof preferences === 'object' &&
        preferences.appearance &&
        preferences.behavior &&
        preferences.notifications &&
        preferences.dataRetention &&
        Array.isArray(preferences.keyboardShortcuts)
      )
    } catch {
      return false
    }
  }

  // Default preferences
  private getDefaultPreferences(): UserPreferences {
    return {
      appearance: {
        theme: 'auto',
        colorScheme: 'default',
        fontSize: 'medium',
        compactMode: false,
        animations: true,
        reducedMotion: false,
        highContrast: false,
      },
      behavior: {
        autoSave: true,
        autoSaveInterval: 5,
        confirmDeletion: true,
        confirmNavigation: false,
        defaultPageSize: 20,
        enableTooltips: true,
        showAdvancedFeatures: false,
        enableKeyboardNavigation: true,
      },
      notifications: {
        sound: {
          enabled: true,
          volume: 0.5,
          alertSound: 'default',
          warningSound: 'default',
          errorSound: 'default',
        },
        desktop: {
          enabled: false,
          showOnError: true,
          showOnWarning: false,
          showOnSuccess: false,
          autoHide: true,
          autoHideDelay: 5000,
        },
        email: {
          enabled: false,
          immediateAlerts: false,
          dailyDigest: false,
          weeklyReport: false,
          emailAddress: '',
          alertThreshold: 'errors',
        },
        inApp: {
          showBadges: true,
          showToasts: true,
          persistentAlerts: true,
          groupSimilar: true,
        },
      },
      dataRetention: {
        logs: {
          enabled: true,
          duration: 30,
          maxSize: 100,
          compressionEnabled: true,
        },
        metrics: {
          enabled: true,
          duration: 90,
          aggregationLevel: 'hourly',
          maxDataPoints: 10000,
        },
        exports: {
          enabled: true,
          duration: 7,
          maxFiles: 20,
          autoCleanup: true,
        },
        cache: {
          enabled: true,
          maxSize: 50,
          ttl: 60,
          clearOnRestart: false,
        },
      },
      keyboardShortcuts: this.getDefaultKeyboardShortcuts(),
      lastUpdated: new Date(),
      version: '1.0.0',
    }
  }

  private getDefaultKeyboardShortcuts(): KeyboardShortcut[] {
    return [
      {
        id: 'search',
        name: 'Quick Search',
        description: 'Open the search dialog',
        keys: ['cmd+k', 'ctrl+k'],
        action: 'search.open',
        category: 'navigation',
        customizable: true,
      },
      {
        id: 'command-palette',
        name: 'Command Palette',
        description: 'Open the command palette',
        keys: ['cmd+shift+p', 'ctrl+shift+p'],
        action: 'command.palette',
        category: 'navigation',
        customizable: true,
      },
      {
        id: 'dashboard',
        name: 'Go to Dashboard',
        description: 'Navigate to the main dashboard',
        keys: ['cmd+1', 'ctrl+1'],
        action: 'navigate.dashboard',
        category: 'navigation',
        customizable: true,
      },
      {
        id: 'agents',
        name: 'Go to Agents',
        description: 'Navigate to agents page',
        keys: ['cmd+2', 'ctrl+2'],
        action: 'navigate.agents',
        category: 'navigation',
        customizable: true,
      },
      {
        id: 'workflows',
        name: 'Go to Workflows',
        description: 'Navigate to workflows page',
        keys: ['cmd+3', 'ctrl+3'],
        action: 'navigate.workflows',
        category: 'navigation',
        customizable: true,
      },
      {
        id: 'refresh',
        name: 'Refresh Data',
        description: 'Refresh current page data',
        keys: ['f5', 'cmd+r', 'ctrl+r'],
        action: 'data.refresh',
        category: 'actions',
        customizable: true,
      },
      {
        id: 'save',
        name: 'Save',
        description: 'Save current changes',
        keys: ['cmd+s', 'ctrl+s'],
        action: 'data.save',
        category: 'actions',
        customizable: true,
      },
      {
        id: 'escape',
        name: 'Close Modal/Dialog',
        description: 'Close open modals or dialogs',
        keys: ['escape'],
        action: 'ui.close',
        category: 'system',
        customizable: false,
      },
    ]
  }

  private initializeKeyboardShortcuts(): void {
    // Apply theme on initialization
    this.applyTheme()

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.preferences.appearance.theme === 'auto') {
          this.applyTheme()
        }
      })
    }
  }

  // Helper methods
  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.preferences)
      } catch (error) {
        console.error('Error in preferences listener:', error)
      }
    })
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i])
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Storage management
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences, this.dateReplacer))
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (data) {
        const parsed = JSON.parse(data, this.dateReviver)
        if (this.validatePreferences(parsed)) {
          this.preferences = { ...this.preferences, ...parsed }
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  private saveBackupsToStorage(): void {
    try {
      localStorage.setItem(this.backupsKey, JSON.stringify(this.backups, this.dateReplacer))
    } catch (error) {
      console.error('Failed to save preferences backups:', error)
    }
  }

  private loadBackupsFromStorage(): void {
    try {
      const data = localStorage.getItem(this.backupsKey)
      if (data) {
        const parsed = JSON.parse(data, this.dateReviver)
        if (Array.isArray(parsed)) {
          this.backups = parsed
        }
      }
    } catch (error) {
      console.error('Failed to load preferences backups:', error)
    }
  }

  private dateReplacer(key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() }
    }
    return value
  }

  private dateReviver(key: string, value: unknown): unknown {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value)
    }
    return value
  }
}

// Global preferences manager instance
export const preferencesManager = new PreferencesManager()
