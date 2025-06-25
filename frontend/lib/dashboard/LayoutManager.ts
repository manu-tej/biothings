export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  settings: Record<string, any>;
  visible: boolean;
  resizable: boolean;
  movable: boolean;
  minSize?: WidgetSize;
  maxSize?: WidgetSize;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  gridSize: number;
  columns: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  layout: Omit<DashboardLayout, 'id' | 'name' | 'description' | 'createdAt' | 'updatedAt'>;
  category: 'default' | 'monitoring' | 'analytics' | 'minimal' | 'custom';
}

export interface GridConstraints {
  minColumns: number;
  maxColumns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
}

export class LayoutManager {
  private layouts: Map<string, DashboardLayout> = new Map();
  private activeLayoutId: string | null = null;
  private presets: LayoutPreset[] = [];
  private gridConstraints: GridConstraints = {
    minColumns: 1,
    maxColumns: 12,
    rowHeight: 100,
    margin: [10, 10],
    containerPadding: [10, 10],
  };

  constructor() {
    this.initializePresets();
    this.loadFromStorage();
  }

  // Layout management
  public createLayout(name: string, description?: string): DashboardLayout {
    const layout: DashboardLayout = {
      id: this.generateId(),
      name,
      description,
      widgets: [],
      gridSize: 12,
      columns: 12,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.layouts.set(layout.id, layout);
    this.saveToStorage();
    return layout;
  }

  public getLayout(id: string): DashboardLayout | null {
    return this.layouts.get(id) || null;
  }

  public getAllLayouts(): DashboardLayout[] {
    return Array.from(this.layouts.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  public updateLayout(id: string, updates: Partial<DashboardLayout>): boolean {
    const layout = this.layouts.get(id);
    if (!layout) return false;

    const updatedLayout = {
      ...layout,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.layouts.set(id, updatedLayout);
    this.saveToStorage();
    return true;
  }

  public deleteLayout(id: string): boolean {
    const layout = this.layouts.get(id);
    if (!layout || layout.isDefault) return false;

    this.layouts.delete(id);
    if (this.activeLayoutId === id) {
      this.activeLayoutId = this.getDefaultLayout()?.id || null;
    }
    this.saveToStorage();
    return true;
  }

  public duplicateLayout(id: string, newName: string): DashboardLayout | null {
    const original = this.layouts.get(id);
    if (!original) return null;

    const duplicate: DashboardLayout = {
      ...original,
      id: this.generateId(),
      name: newName,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      widgets: original.widgets.map(widget => ({
        ...widget,
        id: this.generateId(),
      })),
    };

    this.layouts.set(duplicate.id, duplicate);
    this.saveToStorage();
    return duplicate;
  }

  // Widget management
  public addWidget(layoutId: string, widget: Omit<WidgetConfig, 'id'>): WidgetConfig | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const newWidget: WidgetConfig = {
      id: this.generateId(),
      ...widget,
    };

    // Find available position
    const position = this.findAvailablePosition(layout, newWidget.size);
    newWidget.position = position;

    layout.widgets.push(newWidget);
    layout.updatedAt = new Date();
    
    this.layouts.set(layoutId, layout);
    this.saveToStorage();
    return newWidget;
  }

  public updateWidget(layoutId: string, widgetId: string, updates: Partial<WidgetConfig>): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const widgetIndex = layout.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return false;

    // Validate constraints
    if (updates.position && !this.isValidPosition(layout, widgetId, updates.position, updates.size)) {
      return false;
    }

    if (updates.size && !this.isValidSize(layout.widgets[widgetIndex], updates.size)) {
      return false;
    }

    layout.widgets[widgetIndex] = {
      ...layout.widgets[widgetIndex],
      ...updates,
    };
    layout.updatedAt = new Date();

    this.layouts.set(layoutId, layout);
    this.saveToStorage();
    return true;
  }

  public removeWidget(layoutId: string, widgetId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const initialLength = layout.widgets.length;
    layout.widgets = layout.widgets.filter(w => w.id !== widgetId);
    
    if (layout.widgets.length === initialLength) return false;

    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);
    this.saveToStorage();
    return true;
  }

  public moveWidget(layoutId: string, widgetId: string, newPosition: WidgetPosition): boolean {
    return this.updateWidget(layoutId, widgetId, { position: newPosition });
  }

  public resizeWidget(layoutId: string, widgetId: string, newSize: WidgetSize): boolean {
    return this.updateWidget(layoutId, widgetId, { size: newSize });
  }

  // Active layout management
  public setActiveLayout(id: string): boolean {
    if (!this.layouts.has(id)) return false;
    this.activeLayoutId = id;
    this.saveToStorage();
    return true;
  }

  public getActiveLayout(): DashboardLayout | null {
    return this.activeLayoutId ? this.layouts.get(this.activeLayoutId) || null : null;
  }

  public getDefaultLayout(): DashboardLayout | null {
    return Array.from(this.layouts.values()).find(layout => layout.isDefault) || null;
  }

  // Preset management
  public getPresets(): LayoutPreset[] {
    return this.presets;
  }

  public getPresetsByCategory(category: LayoutPreset['category']): LayoutPreset[] {
    return this.presets.filter(preset => preset.category === category);
  }

  public applyPreset(presetId: string, layoutName?: string): DashboardLayout | null {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) return null;

    const layout: DashboardLayout = {
      id: this.generateId(),
      name: layoutName || `${preset.name} Layout`,
      description: preset.description,
      widgets: preset.layout.widgets.map(widget => ({
        ...widget,
        id: this.generateId(),
      })),
      gridSize: preset.layout.gridSize,
      columns: preset.layout.columns,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.layouts.set(layout.id, layout);
    this.saveToStorage();
    return layout;
  }

  // Grid utilities
  public snapToGrid(position: WidgetPosition): WidgetPosition {
    const gridSize = this.gridConstraints.rowHeight;
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }

  public getGridConstraints(): GridConstraints {
    return { ...this.gridConstraints };
  }

  public updateGridConstraints(constraints: Partial<GridConstraints>): void {
    this.gridConstraints = { ...this.gridConstraints, ...constraints };
    this.saveToStorage();
  }

  // Validation helpers
  private isValidPosition(layout: DashboardLayout, widgetId: string, position: WidgetPosition, size?: WidgetSize): boolean {
    const widget = layout.widgets.find(w => w.id === widgetId);
    if (!widget) return false;

    const widgetSize = size || widget.size;
    const widgetBounds = {
      left: position.x,
      top: position.y,
      right: position.x + widgetSize.width,
      bottom: position.y + widgetSize.height,
    };

    // Check bounds
    if (widgetBounds.left < 0 || widgetBounds.top < 0) return false;
    if (widgetBounds.right > layout.columns || widgetBounds.bottom > 100) return false;

    // Check for overlaps with other widgets
    for (const otherWidget of layout.widgets) {
      if (otherWidget.id === widgetId) continue;

      const otherBounds = {
        left: otherWidget.position.x,
        top: otherWidget.position.y,
        right: otherWidget.position.x + otherWidget.size.width,
        bottom: otherWidget.position.y + otherWidget.size.height,
      };

      if (this.boundsOverlap(widgetBounds, otherBounds)) {
        return false;
      }
    }

    return true;
  }

  private isValidSize(widget: WidgetConfig, size: WidgetSize): boolean {
    if (widget.minSize) {
      if (size.width < widget.minSize.width || size.height < widget.minSize.height) {
        return false;
      }
    }

    if (widget.maxSize) {
      if (size.width > widget.maxSize.width || size.height > widget.maxSize.height) {
        return false;
      }
    }

    return true;
  }

  private boundsOverlap(bounds1: any, bounds2: any): boolean {
    return !(
      bounds1.right <= bounds2.left ||
      bounds1.left >= bounds2.right ||
      bounds1.bottom <= bounds2.top ||
      bounds1.top >= bounds2.bottom
    );
  }

  private findAvailablePosition(layout: DashboardLayout, size: WidgetSize): WidgetPosition {
    // Simple algorithm: try positions from top-left, row by row
    for (let y = 0; y <= 50; y++) {
      for (let x = 0; x <= layout.columns - size.width; x++) {
        const position = { x, y };
        if (this.isValidPosition(layout, '', position, size)) {
          return position;
        }
      }
    }

    // Fallback: place at the bottom
    return { x: 0, y: 50 };
  }

  // Preset initialization
  private initializePresets(): void {
    this.presets = [
      {
        id: 'default',
        name: 'Default',
        description: 'Standard dashboard layout with essential widgets',
        category: 'default',
        layout: {
          widgets: [
            {
              id: 'metrics-overview',
              type: 'metrics',
              title: 'System Metrics',
              position: { x: 0, y: 0 },
              size: { width: 6, height: 3 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
            {
              id: 'agent-status',
              type: 'agent-list',
              title: 'Active Agents',
              position: { x: 6, y: 0 },
              size: { width: 6, height: 3 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
            {
              id: 'workflow-progress',
              type: 'workflow-chart',
              title: 'Workflow Progress',
              position: { x: 0, y: 3 },
              size: { width: 12, height: 4 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
          ],
          gridSize: 12,
          columns: 12,
          isDefault: true,
        },
      },
      {
        id: 'monitoring',
        name: 'Monitoring',
        description: 'Focus on system health and performance monitoring',
        category: 'monitoring',
        layout: {
          widgets: [
            {
              id: 'system-health',
              type: 'health-status',
              title: 'System Health',
              position: { x: 0, y: 0 },
              size: { width: 4, height: 2 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
            {
              id: 'performance-metrics',
              type: 'performance-chart',
              title: 'Performance Metrics',
              position: { x: 4, y: 0 },
              size: { width: 8, height: 4 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
            {
              id: 'alerts',
              type: 'alerts',
              title: 'Active Alerts',
              position: { x: 0, y: 2 },
              size: { width: 4, height: 2 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
          ],
          gridSize: 12,
          columns: 12,
          isDefault: false,
        },
      },
      {
        id: 'analytics',
        name: 'Analytics',
        description: 'Data analysis and insights dashboard',
        category: 'analytics',
        layout: {
          widgets: [
            {
              id: 'analytics-overview',
              type: 'analytics-chart',
              title: 'Analytics Overview',
              position: { x: 0, y: 0 },
              size: { width: 8, height: 3 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
            {
              id: 'data-insights',
              type: 'insights',
              title: 'Key Insights',
              position: { x: 8, y: 0 },
              size: { width: 4, height: 3 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
            {
              id: 'trends',
              type: 'trend-analysis',
              title: 'Trend Analysis',
              position: { x: 0, y: 3 },
              size: { width: 12, height: 4 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
          ],
          gridSize: 12,
          columns: 12,
          isDefault: false,
        },
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean, minimal layout with essential information only',
        category: 'minimal',
        layout: {
          widgets: [
            {
              id: 'status-summary',
              type: 'status-card',
              title: 'System Status',
              position: { x: 0, y: 0 },
              size: { width: 12, height: 2 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
            {
              id: 'quick-actions',
              type: 'quick-actions',
              title: 'Quick Actions',
              position: { x: 0, y: 2 },
              size: { width: 12, height: 1 },
              settings: {},
              visible: true,
              resizable: true,
              movable: true,
            },
          ],
          gridSize: 12,
          columns: 12,
          isDefault: false,
        },
      },
    ];
  }

  // Storage management
  private saveToStorage(): void {
    try {
      const data = {
        layouts: Array.from(this.layouts.entries()),
        activeLayoutId: this.activeLayoutId,
        gridConstraints: this.gridConstraints,
      };
      localStorage.setItem('biothings-dashboard-layouts', JSON.stringify(data, this.dateReplacer));
    } catch (error) {
      console.error('Failed to save layout data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('biothings-dashboard-layouts');
      if (data) {
        const parsed = JSON.parse(data, this.dateReviver);
        if (parsed.layouts) {
          this.layouts = new Map(parsed.layouts);
        }
        this.activeLayoutId = parsed.activeLayoutId || null;
        if (parsed.gridConstraints) {
          this.gridConstraints = { ...this.gridConstraints, ...parsed.gridConstraints };
        }
      }

      // Ensure we have a default layout
      if (this.layouts.size === 0) {
        const defaultLayout = this.applyPreset('default', 'Default Layout');
        if (defaultLayout) {
          defaultLayout.isDefault = true;
          this.layouts.set(defaultLayout.id, defaultLayout);
          this.activeLayoutId = defaultLayout.id;
        }
      }
    } catch (error) {
      console.error('Failed to load layout data:', error);
      // Create default layout on error
      const defaultLayout = this.applyPreset('default', 'Default Layout');
      if (defaultLayout) {
        defaultLayout.isDefault = true;
        this.layouts.set(defaultLayout.id, defaultLayout);
        this.activeLayoutId = defaultLayout.id;
      }
    }
  }

  private dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  private dateReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Global layout manager instance
export const layoutManager = new LayoutManager();