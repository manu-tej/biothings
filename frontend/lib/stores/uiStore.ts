import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'auto';
export type ViewMode = 'grid' | 'list' | 'compact';
export type DateFormat = 'relative' | 'absolute';

export interface LayoutConfig {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  headerHeight: number;
  mainContentPadding: number;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  gridCols: number;
  gridRows: number;
  gap: number;
  isDefault: boolean;
  isLocked: boolean;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  position: GridPosition;
  size: GridSize;
  title?: string;
  config: Record<string, any>;
  hidden?: boolean;
}

export type WidgetType = 
  | 'agent-overview'
  | 'workflow-status'
  | 'system-metrics'
  | 'activity-feed'
  | 'chart'
  | 'custom';

export interface GridPosition {
  x: number;
  y: number;
}

export interface GridSize {
  width: number;
  height: number;
}

export interface FilterState {
  globalSearch: string;
  agentFilters: {
    status?: string[];
    type?: string[];
    capabilities?: string[];
  };
  workflowFilters: {
    status?: string[];
    dateRange?: DateRange;
  };
  timeRange: TimeRange;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type TimeRange = 
  | 'last-hour'
  | 'last-24h'
  | 'last-7d'
  | 'last-30d'
  | 'custom';

export interface UIPreferences {
  theme: Theme;
  language: string;
  timezone: string;
  dateFormat: DateFormat;
  viewMode: ViewMode;
  animations: boolean;
  soundEffects: boolean;
  compactMode: boolean;
  showTooltips: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
}

export interface UIState {
  // Layout
  layout: LayoutConfig;
  dashboardLayout: DashboardLayout;
  
  // Preferences
  preferences: UIPreferences;
  
  // UI State
  activeFilters: FilterState;
  isFullscreen: boolean;
  isMobileView: boolean;
  activeModal: string | null;
  openPanels: Set<string>;
  expandedCards: Set<string>;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  updateLayout: (layout: Partial<LayoutConfig>) => void;
  
  setDashboardLayout: (layout: DashboardLayout) => void;
  updateWidget: (widgetId: string, config: Partial<WidgetConfig>) => void;
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (widgetId: string) => void;
  
  updatePreferences: (prefs: Partial<UIPreferences>) => void;
  updateFilters: (filters: Partial<FilterState>) => void;
  setGlobalSearch: (search: string) => void;
  
  setActiveModal: (modalId: string | null) => void;
  togglePanel: (panelId: string) => void;
  toggleCard: (cardId: string) => void;
  
  setFullscreen: (fullscreen: boolean) => void;
  setMobileView: (mobile: boolean) => void;
  reset: () => void;
}

const defaultLayout: LayoutConfig = {
  sidebarCollapsed: false,
  sidebarWidth: 240,
  headerHeight: 64,
  mainContentPadding: 24,
};

const defaultDashboardLayout: DashboardLayout = {
  id: 'default',
  name: 'Default Layout',
  widgets: [],
  gridCols: 12,
  gridRows: 8,
  gap: 16,
  isDefault: true,
  isLocked: false,
};

const defaultPreferences: UIPreferences = {
  theme: 'auto',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'relative',
  viewMode: 'grid',
  animations: true,
  soundEffects: false,
  compactMode: false,
  showTooltips: true,
  autoRefresh: true,
  refreshInterval: 30,
};

const defaultFilters: FilterState = {
  globalSearch: '',
  agentFilters: {},
  workflowFilters: {},
  timeRange: 'last-24h',
};

const initialState = {
  layout: defaultLayout,
  dashboardLayout: defaultDashboardLayout,
  preferences: defaultPreferences,
  activeFilters: defaultFilters,
  isFullscreen: false,
  isMobileView: false,
  activeModal: null,
  openPanels: new Set<string>(),
  expandedCards: new Set<string>(),
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        // Theme and layout actions
        setTheme: (theme) => set((state) => ({
          preferences: { ...state.preferences, theme }
        })),
        
        toggleSidebar: () => set((state) => ({
          layout: { ...state.layout, sidebarCollapsed: !state.layout.sidebarCollapsed }
        })),
        
        setSidebarWidth: (width) => set((state) => ({
          layout: { ...state.layout, sidebarWidth: width }
        })),
        
        updateLayout: (layout) => set((state) => ({
          layout: { ...state.layout, ...layout }
        })),
        
        // Dashboard layout actions
        setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
        
        updateWidget: (widgetId, config) => set((state) => ({
          dashboardLayout: {
            ...state.dashboardLayout,
            widgets: state.dashboardLayout.widgets.map(w =>
              w.id === widgetId ? { ...w, ...config } : w
            )
          }
        })),
        
        addWidget: (widget) => set((state) => ({
          dashboardLayout: {
            ...state.dashboardLayout,
            widgets: [...state.dashboardLayout.widgets, widget]
          }
        })),
        
        removeWidget: (widgetId) => set((state) => ({
          dashboardLayout: {
            ...state.dashboardLayout,
            widgets: state.dashboardLayout.widgets.filter(w => w.id !== widgetId)
          }
        })),
        
        // Preference actions
        updatePreferences: (prefs) => set((state) => ({
          preferences: { ...state.preferences, ...prefs }
        })),
        
        // Filter actions
        updateFilters: (filters) => set((state) => ({
          activeFilters: { ...state.activeFilters, ...filters }
        })),
        
        setGlobalSearch: (search) => set((state) => ({
          activeFilters: { ...state.activeFilters, globalSearch: search }
        })),
        
        // Modal and panel actions
        setActiveModal: (modalId) => set({ activeModal: modalId }),
        
        togglePanel: (panelId) => set((state) => {
          const newPanels = new Set(state.openPanels);
          if (newPanels.has(panelId)) {
            newPanels.delete(panelId);
          } else {
            newPanels.add(panelId);
          }
          return { openPanels: newPanels };
        }),
        
        toggleCard: (cardId) => set((state) => {
          const newCards = new Set(state.expandedCards);
          if (newCards.has(cardId)) {
            newCards.delete(cardId);
          } else {
            newCards.add(cardId);
          }
          return { expandedCards: newCards };
        }),
        
        // View state actions
        setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
        setMobileView: (mobile) => set({ isMobileView: mobile }),
        
        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          // Persist user preferences and layout
          layout: state.layout,
          dashboardLayout: state.dashboardLayout,
          preferences: state.preferences,
          activeFilters: state.activeFilters,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
);

// Selector hooks
export const useTheme = () => useUIStore((state) => state.preferences.theme);
export const useIsSidebarCollapsed = () => useUIStore((state) => state.layout.sidebarCollapsed);
export const useViewMode = () => useUIStore((state) => state.preferences.viewMode);
export const useIsAutoRefresh = () => useUIStore((state) => state.preferences.autoRefresh);
export const useRefreshInterval = () => useUIStore((state) => state.preferences.refreshInterval);
export const useGlobalSearch = () => useUIStore((state) => state.activeFilters.globalSearch);
export const useTimeRange = () => useUIStore((state) => state.activeFilters.timeRange);

// Utility function to apply theme
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
};

// Watch for theme changes
if (typeof window !== 'undefined') {
  const unsubscribe = useUIStore.subscribe(
    (state) => applyTheme(state.preferences.theme)
  );
  
  // Apply initial theme
  applyTheme(useUIStore.getState().preferences.theme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = useUIStore.getState().preferences.theme;
    if (currentTheme === 'auto') {
      applyTheme('auto');
    }
  });
}