export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  category: 'render' | 'network' | 'memory' | 'user' | 'system';
  threshold?: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  rerenderCount: number;
  propsChanges: number;
  timestamp: Date;
}

export interface NetworkMetric {
  url: string;
  method: string;
  duration: number;
  status: number;
  size: number;
  timestamp: Date;
  type: 'fetch' | 'websocket' | 'other';
}

export interface MemoryMetric {
  used: number;
  total: number;
  limit: number;
  timestamp: Date;
}

export interface UserInteractionMetric {
  type: 'click' | 'scroll' | 'input' | 'navigation';
  target: string;
  duration?: number;
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface PerformanceReport {
  id: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  summary: {
    averageRenderTime: number;
    slowestComponents: ComponentRenderMetric[];
    networkRequestsCount: number;
    averageNetworkLatency: number;
    memoryUsagePeak: number;
    userInteractions: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: ComponentRenderMetric[] = [];
  private networkMetrics: NetworkMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private userMetrics: UserInteractionMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;
  private readonly maxMetrics = 1000;
  private readonly alertThresholds = {
    renderTime: 16, // 60fps = 16.67ms per frame
    networkLatency: 1000, // 1 second
    memoryUsage: 50 * 1024 * 1024, // 50MB
    longTask: 50, // 50ms
  };

  constructor() {
    this.initializeObservers();
  }

  // Main control methods
  public start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startObservers();
    this.startMemoryMonitoring();
    this.startUserInteractionMonitoring();
    this.startWebSocketMonitoring();
    
    console.log('Performance monitoring started');
  }

  public stop(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.stopObservers();
    
    console.log('Performance monitoring stopped');
  }

  public isRunning(): boolean {
    return this.isMonitoring;
  }

  // Metric recording methods
  public recordRenderMetric(componentName: string, renderTime: number, rerenderCount = 1): void {
    const metric: ComponentRenderMetric = {
      componentName,
      renderTime,
      rerenderCount,
      propsChanges: 0,
      timestamp: new Date(),
    };

    this.componentMetrics.push(metric);
    this.addPerformanceMetric('render_time', renderTime, 'render', 'ms', this.alertThresholds.renderTime);
    
    // Check for slow renders
    if (renderTime > this.alertThresholds.renderTime) {
      this.createAlert('warning', 'component_render', renderTime, this.alertThresholds.renderTime, 
        `Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }

    this.pruneMetrics();
  }

  public recordNetworkMetric(url: string, method: string, duration: number, status: number, size = 0): void {
    const metric: NetworkMetric = {
      url,
      method,
      duration,
      status,
      size,
      timestamp: new Date(),
      type: 'fetch',
    };

    this.networkMetrics.push(metric);
    this.addPerformanceMetric('network_latency', duration, 'network', 'ms', this.alertThresholds.networkLatency);
    
    // Check for slow requests
    if (duration > this.alertThresholds.networkLatency) {
      this.createAlert('warning', 'network_latency', duration, this.alertThresholds.networkLatency,
        `Slow network request: ${method} ${url} took ${duration}ms`);
    }

    // Check for failed requests
    if (status >= 400) {
      this.createAlert('error', 'network_error', status, 399,
        `Network error: ${method} ${url} returned ${status}`);
    }

    this.pruneMetrics();
  }

  public recordWebSocketLatency(latency: number): void {
    this.addPerformanceMetric('websocket_latency', latency, 'network', 'ms', 500);
    
    if (latency > 500) {
      this.createAlert('warning', 'websocket_latency', latency, 500,
        `High WebSocket latency: ${latency}ms`);
    }
  }

  public recordUserInteraction(type: UserInteractionMetric['type'], target: string, duration?: number): void {
    const metric: UserInteractionMetric = {
      type,
      target,
      duration,
      timestamp: new Date(),
    };

    this.userMetrics.push(metric);
    
    if (duration) {
      this.addPerformanceMetric(`user_${type}`, duration, 'user', 'ms');
    }

    this.pruneMetrics();
  }

  // Data retrieval methods
  public getMetrics(category?: PerformanceMetric['category'], limit?: number): PerformanceMetric[] {
    let filtered = category ? this.metrics.filter(m => m.category === category) : this.metrics;
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getComponentMetrics(componentName?: string): ComponentRenderMetric[] {
    return componentName 
      ? this.componentMetrics.filter(m => m.componentName === componentName)
      : this.componentMetrics;
  }

  public getNetworkMetrics(): NetworkMetric[] {
    return this.networkMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getAlerts(): PerformanceAlert[] {
    return this.alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  public clearAlerts(): void {
    this.alerts = [];
  }

  // Analysis methods
  public getAverageRenderTime(componentName?: string): number {
    const metrics = componentName 
      ? this.componentMetrics.filter(m => m.componentName === componentName)
      : this.componentMetrics;
    
    if (metrics.length === 0) return 0;
    
    return metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
  }

  public getSlowestComponents(limit = 5): ComponentRenderMetric[] {
    const componentAverages = new Map<string, { total: number; count: number; latest: ComponentRenderMetric }>();
    
    this.componentMetrics.forEach(metric => {
      const existing = componentAverages.get(metric.componentName);
      if (existing) {
        existing.total += metric.renderTime;
        existing.count++;
        if (metric.timestamp > existing.latest.timestamp) {
          existing.latest = metric;
        }
      } else {
        componentAverages.set(metric.componentName, {
          total: metric.renderTime,
          count: 1,
          latest: metric,
        });
      }
    });

    return Array.from(componentAverages.entries())
      .map(([name, data]) => ({
        ...data.latest,
        renderTime: data.total / data.count,
      }))
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, limit);
  }

  public getNetworkSummary(): { totalRequests: number; averageLatency: number; errorRate: number } {
    const requests = this.networkMetrics;
    const totalRequests = requests.length;
    
    if (totalRequests === 0) {
      return { totalRequests: 0, averageLatency: 0, errorRate: 0 };
    }

    const averageLatency = requests.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    const errors = requests.filter(r => r.status >= 400).length;
    const errorRate = (errors / totalRequests) * 100;

    return { totalRequests, averageLatency, errorRate };
  }

  public generateReport(timeRange?: { start: Date; end: Date }): PerformanceReport {
    const now = new Date();
    const range = timeRange || {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: now,
    };

    const filteredMetrics = this.metrics.filter(
      m => m.timestamp >= range.start && m.timestamp <= range.end
    );

    const filteredAlerts = this.alerts.filter(
      a => a.timestamp >= range.start && a.timestamp <= range.end
    );

    const networkSummary = this.getNetworkSummary();
    
    return {
      id: this.generateId(),
      generatedAt: now,
      timeRange: range,
      metrics: filteredMetrics,
      alerts: filteredAlerts,
      summary: {
        averageRenderTime: this.getAverageRenderTime(),
        slowestComponents: this.getSlowestComponents(),
        networkRequestsCount: networkSummary.totalRequests,
        averageNetworkLatency: networkSummary.averageLatency,
        memoryUsagePeak: Math.max(...this.memoryMetrics.map(m => m.used)),
        userInteractions: this.userMetrics.length,
      },
    };
  }

  // Private methods
  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Performance Observer for paint timing
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            this.addPerformanceMetric(entry.name, entry.startTime, 'render', 'ms');
          });
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (error) {
        console.warn('Paint observer not supported:', error);
      }

      // Long task observer
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            this.addPerformanceMetric('long_task', entry.duration, 'system', 'ms', this.alertThresholds.longTask);
            
            if (entry.duration > this.alertThresholds.longTask) {
              this.createAlert('warning', 'long_task', entry.duration, this.alertThresholds.longTask,
                `Long task detected: ${entry.duration.toFixed(2)}ms`);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  private startObservers(): void {
    // Additional performance monitoring setup
  }

  private stopObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Error disconnecting observer:', error);
      }
    });
    this.observers = [];
  }

  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !('performance' in window) || !('memory' in performance)) return;

    const monitorMemory = () => {
      if (!this.isMonitoring) return;

      const memory = (performance as any).memory;
      if (memory) {
        const metric: MemoryMetric = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: new Date(),
        };

        this.memoryMetrics.push(metric);
        this.addPerformanceMetric('memory_usage', memory.usedJSHeapSize, 'memory', 'bytes', this.alertThresholds.memoryUsage);

        if (memory.usedJSHeapSize > this.alertThresholds.memoryUsage) {
          this.createAlert('warning', 'memory_usage', memory.usedJSHeapSize, this.alertThresholds.memoryUsage,
            `High memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
      }

      setTimeout(monitorMemory, 5000); // Check every 5 seconds
    };

    monitorMemory();
  }

  private startUserInteractionMonitoring(): void {
    if (typeof window === 'undefined') return;

    const trackInteraction = (type: UserInteractionMetric['type']) => (event: Event) => {
      const target = event.target as HTMLElement;
      const targetDesc = target.tagName + (target.className ? `.${target.className}` : '') + (target.id ? `#${target.id}` : '');
      
      this.recordUserInteraction(type, targetDesc);
    };

    window.addEventListener('click', trackInteraction('click'));
    window.addEventListener('input', trackInteraction('input'));
    window.addEventListener('scroll', trackInteraction('scroll'));
  }

  private startWebSocketMonitoring(): void {
    // This would be integrated with the WebSocket manager
    // For now, just a placeholder
  }

  private addPerformanceMetric(name: string, value: number, category: PerformanceMetric['category'], unit: PerformanceMetric['unit'], threshold?: number): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      category,
      threshold,
      unit,
    };

    this.metrics.push(metric);
  }

  private createAlert(type: PerformanceAlert['type'], metric: string, value: number, threshold: number, message: string): void {
    const alert: PerformanceAlert = {
      id: this.generateId(),
      type,
      metric,
      value,
      threshold,
      message,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
  }

  private pruneMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    if (this.componentMetrics.length > this.maxMetrics) {
      this.componentMetrics = this.componentMetrics.slice(-this.maxMetrics);
    }
    
    if (this.networkMetrics.length > this.maxMetrics) {
      this.networkMetrics = this.networkMetrics.slice(-this.maxMetrics);
    }
    
    if (this.memoryMetrics.length > this.maxMetrics) {
      this.memoryMetrics = this.memoryMetrics.slice(-this.maxMetrics);
    }
    
    if (this.userMetrics.length > this.maxMetrics) {
      this.userMetrics = this.userMetrics.slice(-this.maxMetrics);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();

  return {
    recordRender: () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordRenderMetric(componentName, renderTime);
    },
  };
}