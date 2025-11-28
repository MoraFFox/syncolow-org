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

class DrillAnalytics {
  private events: DrillAnalyticsEvent[] = [];
  private readonly STORAGE_KEY = 'drill-analytics-events';
  private readonly MAX_EVENTS = 1000;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load drill analytics:', error);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events.slice(-this.MAX_EVENTS)));
    } catch (error) {
      console.error('Failed to save drill analytics:', error);
    }
  }

  track(kind: DrillKind, payload: DrillPayload, action: 'preview' | 'navigate' | 'dialog') {
    const entityId = (payload as any).id || (payload as any).value || 'unknown';
    
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

  clearOldEvents(olderThan: number) {
    this.events = this.events.filter(e => e.timestamp >= olderThan);
    this.saveToStorage();
  }
}

export const drillAnalytics = new DrillAnalytics();
