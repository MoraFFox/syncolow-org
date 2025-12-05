import { DrillKind, DrillPayload } from './drilldown-types';

export interface DrillAnalyticsEvent {
  id: string;
  kind: DrillKind;
  entityId: string;
  action: 'preview' | 'navigate' | 'dialog';
  timestamp: number;
}

export interface DrillAnalyticsMetrics {
  totalEvents: number;
  previewToNavigateConversion: number;
  mostViewedEntities: Array<{ kind: DrillKind; entityId: string; count: number }>;
  eventsByKind: Record<DrillKind, number>;
}

export interface DrillPerformanceSummary {
  averageLoadTime: number;
  p50LoadTime: number;
  p95LoadTime: number;
  p99LoadTime: number;
  cacheHitRate: number;
  errorRate: number;
  totalSamples: number;
  slowestEntities: Array<{ kind: DrillKind; entityId: string; averageDuration: number; count: number }>;
  loadsByKind: Array<{ kind: DrillKind; count: number; averageDuration: number }>;
}

export interface DrillPreviewPerformanceMetric {
  id: string;
  kind: DrillKind;
  entityId: string;
  duration: number;
  cacheHit: boolean;
  timestamp: number;
  error?: string;
}

export const drillAnalytics = new class DrillAnalytics {
  private events: DrillAnalyticsEvent[] = [];
  private performanceMetrics: DrillPreviewPerformanceMetric[] = [];
  private readonly STORAGE_KEY = 'drill-analytics-events';
  private readonly PERFORMANCE_KEY = 'drill-analytics-performance';
  private readonly MAX_EVENTS = 1000;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const storedEvents = localStorage.getItem(this.STORAGE_KEY);
      if (storedEvents) {
        this.events = JSON.parse(storedEvents);
      }
      const storedMetrics = localStorage.getItem(this.PERFORMANCE_KEY);
      if (storedMetrics) {
        this.performanceMetrics = JSON.parse(storedMetrics);
      }
    } catch (error) {
      console.error('Failed to load drill analytics:', error);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events.slice(-this.MAX_EVENTS)));
      localStorage.setItem(this.PERFORMANCE_KEY, JSON.stringify(this.performanceMetrics.slice(-this.MAX_EVENTS)));
    } catch (error) {
      console.error('Failed to save drill analytics:', error);
    }
  }

  track(kind: DrillKind, payload: DrillPayload, action: 'preview' | 'navigate' | 'dialog') {
    const entityId = (payload as { id?: string; value?: string }).id || (payload as { id?: string; value?: string }).value || 'unknown';
    
    const event: DrillAnalyticsEvent = {
      id: `${Date.now()}-${Math.random()}`,
      kind,
      entityId: String(entityId),
      action,
      timestamp: Date.now(),
    };

    this.events.push(event);
    this.saveToStorage();
  }

  trackPreviewLoad(kind: DrillKind, entityId: string, duration: number, cacheHit: boolean, error?: string) {
    const metric: DrillPreviewPerformanceMetric = {
      id: `${Date.now()}-${Math.random()}`,
      kind,
      entityId,
      duration,
      cacheHit,
      timestamp: Date.now(),
      error
    };

    this.performanceMetrics.push(metric);
    this.saveToStorage();
  }

  getMetrics(since?: number): DrillAnalyticsMetrics {
    const filteredEvents = since 
      ? this.events.filter(e => e.timestamp >= since)
      : this.events;

    const previewCount = filteredEvents.filter(e => e.action === 'preview').length;
    const navigateCount = filteredEvents.filter(e => e.action === 'navigate' || e.action === 'dialog').length;

    const entityCounts = new Map<string, number>();
    filteredEvents.forEach(event => {
      const key = `${event.kind}:${event.entityId}`;
      entityCounts.set(key, (entityCounts.get(key) || 0) + 1);
    });

    const mostViewedEntities = Array.from(entityCounts.entries())
      .map(([key, count]) => {
        const [kind, entityId] = key.split(':');
        return { kind: kind as DrillKind, entityId, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const eventsByKind = filteredEvents.reduce((acc, event) => {
      acc[event.kind] = (acc[event.kind] || 0) + 1;
      return acc;
    }, {} as Record<DrillKind, number>);

    return {
      totalEvents: filteredEvents.length,
      previewToNavigateConversion: previewCount > 0 ? navigateCount / previewCount : 0,
      mostViewedEntities,
      eventsByKind,
    };
  }

  getPerformanceMetrics(since?: number): DrillPerformanceSummary | null {
    const metrics = since 
      ? this.performanceMetrics.filter(m => m.timestamp >= since)
      : this.performanceMetrics;

    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    const errors = metrics.filter(m => m.error).length;

    // Slowest entities grouped by kind and entityId
    const entityDurations = new Map<string, { kind: DrillKind; entityId: string; durations: number[] }>();
    metrics.forEach(m => {
      const key = `${m.kind}:${m.entityId}`;
      if (!entityDurations.has(key)) {
        entityDurations.set(key, { kind: m.kind, entityId: m.entityId, durations: [] });
      }
      entityDurations.get(key)!.durations.push(m.duration);
    });

    const slowestEntities = Array.from(entityDurations.values())
      .map(({ kind, entityId, durations }) => ({
        kind,
        entityId,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        count: durations.length
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);

    // Breakdown by DrillKind
    const kindMetrics = new Map<DrillKind, { count: number; totalDuration: number }>();
    metrics.forEach(m => {
      if (!kindMetrics.has(m.kind)) {
        kindMetrics.set(m.kind, { count: 0, totalDuration: 0 });
      }
      const km = kindMetrics.get(m.kind)!;
      km.count++;
      km.totalDuration += m.duration;
    });

    const loadsByKind = Array.from(kindMetrics.entries()).map(([kind, { count, totalDuration }]) => ({
      kind,
      count,
      averageDuration: totalDuration / count
    }));

    return {
      averageLoadTime: totalDuration / metrics.length,
      p50LoadTime: durations[Math.floor(durations.length * 0.5)] || 0,
      p95LoadTime: durations[Math.floor(durations.length * 0.95)] || 0,
      p99LoadTime: durations[Math.floor(durations.length * 0.99)] || 0,
      cacheHitRate: cacheHits / metrics.length,
      errorRate: errors / metrics.length,
      totalSamples: metrics.length,
      slowestEntities,
      loadsByKind
    };
  }

  clearOldEvents(olderThan: number) {
    this.events = this.events.filter(e => e.timestamp >= olderThan);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= olderThan);
    this.saveToStorage();
  }
}();
