import { DrillKind, DrillPayload } from './drilldown-types';
import { logger } from './logger';

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

/**
 * Metrics for tracking expanded hit area interactions
 */
export interface HitAreaMetric {
  id: string;
  kind: DrillKind;
  entityId: string;
  /** Whether the interaction used expanded hit area (true) or direct hover (false) */
  usedExpandedArea: boolean;
  /** Distance from element center when triggered (0 if direct hover) */
  triggerDistance: number;
  /** Hit area padding that was configured */
  hitAreaPadding: number;
  /** Whether this led to a navigation */
  converted: boolean;
  timestamp: number;
}

/**
 * Summary of hit area interaction analytics
 */
export interface HitAreaAnalyticsSummary {
  /** Total number of hit area interactions tracked */
  totalInteractions: number;
  /** Percentage of interactions using expanded hit area */
  expandedAreaUsageRate: number;
  /** Average distance from element when triggered */
  averageTriggerDistance: number;
  /** Conversion rate for expanded area vs direct hover */
  expandedAreaConversionRate: number;
  /** Conversion rate for direct hover */
  directHoverConversionRate: number;
  /** Distribution of interactions by distance bucket */
  distanceDistribution: Array<{ bucket: string; count: number; conversionRate: number }>;
}

export const drillAnalytics = new class DrillAnalytics {
  private events: DrillAnalyticsEvent[] = [];
  private performanceMetrics: DrillPreviewPerformanceMetric[] = [];
  private hitAreaMetrics: HitAreaMetric[] = [];
  private readonly STORAGE_KEY = 'drill-analytics-events';
  private readonly PERFORMANCE_KEY = 'drill-analytics-performance';
  private readonly HIT_AREA_KEY = 'drill-analytics-hit-area';
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
      const storedHitArea = localStorage.getItem(this.HIT_AREA_KEY);
      if (storedHitArea) {
        this.hitAreaMetrics = JSON.parse(storedHitArea);
      }
    } catch (error) {
      logger.error(error, { component: 'DrillAnalytics', action: 'loadFromStorage' });
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events.slice(-this.MAX_EVENTS)));
      localStorage.setItem(this.PERFORMANCE_KEY, JSON.stringify(this.performanceMetrics.slice(-this.MAX_EVENTS)));
      localStorage.setItem(this.HIT_AREA_KEY, JSON.stringify(this.hitAreaMetrics.slice(-this.MAX_EVENTS)));
    } catch (error) {
      logger.error(error, { component: 'DrillAnalytics', action: 'saveToStorage' });
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

  /**
   * Track a hit area interaction for analytics
   * @param kind - The drill entity kind
   * @param entityId - The entity identifier
   * @param usedExpandedArea - Whether the expanded hit area was used
   * @param triggerDistance - Distance from element center when triggered
   * @param hitAreaPadding - The configured hit area padding
   * @param converted - Whether this interaction led to navigation
   */
  trackHitAreaInteraction(
    kind: DrillKind,
    entityId: string,
    usedExpandedArea: boolean,
    triggerDistance: number,
    hitAreaPadding: number,
    converted: boolean = false
  ) {
    const metric: HitAreaMetric = {
      id: `${Date.now()}-${Math.random()}`,
      kind,
      entityId,
      usedExpandedArea,
      triggerDistance,
      hitAreaPadding,
      converted,
      timestamp: Date.now(),
    };

    this.hitAreaMetrics.push(metric);
    this.saveToStorage();
  }

  /**
   * Mark a previous hit area interaction as converted (navigated)
   * @param kind - The drill entity kind
   * @param entityId - The entity identifier
   */
  markHitAreaConversion(kind: DrillKind, entityId: string) {
    // Find the most recent interaction for this entity and mark as converted
    for (let i = this.hitAreaMetrics.length - 1; i >= 0; i--) {
      const metric = this.hitAreaMetrics[i];
      if (metric.kind === kind && metric.entityId === entityId && !metric.converted) {
        metric.converted = true;
        this.saveToStorage();
        break;
      }
    }
  }

  /**
   * Get hit area analytics summary
   * @param since - Optional timestamp to filter metrics since
   */
  getHitAreaMetrics(since?: number): HitAreaAnalyticsSummary | null {
    const metrics = since
      ? this.hitAreaMetrics.filter(m => m.timestamp >= since)
      : this.hitAreaMetrics;

    if (metrics.length === 0) return null;

    const expandedAreaMetrics = metrics.filter(m => m.usedExpandedArea);
    const directHoverMetrics = metrics.filter(m => !m.usedExpandedArea);

    // Calculate conversion rates
    const expandedAreaConversions = expandedAreaMetrics.filter(m => m.converted).length;
    const directHoverConversions = directHoverMetrics.filter(m => m.converted).length;

    // Calculate average trigger distance
    const totalDistance = expandedAreaMetrics.reduce((sum, m) => sum + m.triggerDistance, 0);
    const averageTriggerDistance = expandedAreaMetrics.length > 0
      ? totalDistance / expandedAreaMetrics.length
      : 0;

    // Create distance distribution buckets
    const distanceBuckets = [
      { min: 0, max: 4, label: '0-4px' },
      { min: 4, max: 8, label: '4-8px' },
      { min: 8, max: 12, label: '8-12px' },
      { min: 12, max: 16, label: '12-16px' },
      { min: 16, max: Infinity, label: '16px+' },
    ];

    const distanceDistribution = distanceBuckets.map(bucket => {
      const bucketMetrics = expandedAreaMetrics.filter(
        m => m.triggerDistance >= bucket.min && m.triggerDistance < bucket.max
      );
      const bucketConversions = bucketMetrics.filter(m => m.converted).length;

      return {
        bucket: bucket.label,
        count: bucketMetrics.length,
        conversionRate: bucketMetrics.length > 0
          ? bucketConversions / bucketMetrics.length
          : 0,
      };
    });

    return {
      totalInteractions: metrics.length,
      expandedAreaUsageRate: expandedAreaMetrics.length / metrics.length,
      averageTriggerDistance,
      expandedAreaConversionRate: expandedAreaMetrics.length > 0
        ? expandedAreaConversions / expandedAreaMetrics.length
        : 0,
      directHoverConversionRate: directHoverMetrics.length > 0
        ? directHoverConversions / directHoverMetrics.length
        : 0,
      distanceDistribution,
    };
  }

  clearOldEvents(olderThan: number) {
    this.events = this.events.filter(e => e.timestamp >= olderThan);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= olderThan);
    this.hitAreaMetrics = this.hitAreaMetrics.filter(m => m.timestamp >= olderThan);
    this.saveToStorage();
  }
}();
