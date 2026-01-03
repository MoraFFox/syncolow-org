import { logger } from '@/lib/logger';

/**
 * Behavior Tracker
 * 
 * Logs and analyzes user navigation patterns for cache warming optimization.
 * 
 * Features:
 * - Tracks navigation frequency per route
 * - Records time-of-day patterns
 * - Stores user session information
 * - Provides data for ML-lite pattern prediction
 */

interface PageView {
    route: string;
    timestamp: number;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: number; // 0-6, Sunday-Saturday
    sessionId: string;
}

interface RouteStats {
    route: string;
    totalViews: number;
    lastVisited: number;
    timeOfDayDistribution: Record<string, number>;
    dayOfWeekDistribution: Record<number, number>;
    avgSessionPosition: number; // Average position in session
}

const STORAGE_KEY = 'behavior_tracker';
const MAX_HISTORY = 500;

export class BehaviorTracker {
    private history: PageView[] = [];
    private sessionId: string;
    private sessionPosition: number = 0;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.loadFromStorage();
    }

    /**
     * Track a page view.
     */
    trackPageView(route: string): void {
        this.sessionPosition++;

        const now = new Date();
        const pageView: PageView = {
            route: this.normalizeRoute(route),
            timestamp: now.getTime(),
            timeOfDay: this.getTimeOfDay(now),
            dayOfWeek: now.getDay(),
            sessionId: this.sessionId,
        };

        this.history.push(pageView);

        // Trim history to max size
        if (this.history.length > MAX_HISTORY) {
            this.history = this.history.slice(-MAX_HISTORY);
        }

        this.saveToStorage();
    }

    /**
     * Get statistics for all tracked routes.
     */
    getRouteStats(): RouteStats[] {
        const statsMap = new Map<string, RouteStats>();

        for (const view of this.history) {
            const existing = statsMap.get(view.route) || {
                route: view.route,
                totalViews: 0,
                lastVisited: 0,
                timeOfDayDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
                dayOfWeekDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
                avgSessionPosition: 0,
            };

            existing.totalViews++;
            existing.lastVisited = Math.max(existing.lastVisited, view.timestamp);
            existing.timeOfDayDistribution[view.timeOfDay]++;
            existing.dayOfWeekDistribution[view.dayOfWeek]++;

            statsMap.set(view.route, existing);
        }

        return Array.from(statsMap.values())
            .sort((a, b) => b.totalViews - a.totalViews);
    }

    /**
     * Get the most frequently visited routes.
     */
    getFrequentRoutes(limit: number = 5): string[] {
        return this.getRouteStats()
            .slice(0, limit)
            .map(s => s.route);
    }

    /**
     * Get routes frequently visited at current time of day.
     */
    getRoutesForCurrentTime(limit: number = 3): string[] {
        const currentTimeOfDay = this.getTimeOfDay(new Date());

        return this.getRouteStats()
            .sort((a, b) => {
                const aScore = a.timeOfDayDistribution[currentTimeOfDay] || 0;
                const bScore = b.timeOfDayDistribution[currentTimeOfDay] || 0;
                return bScore - aScore;
            })
            .slice(0, limit)
            .map(s => s.route);
    }

    /**
     * Get routes frequently visited on current day of week.
     */
    getRoutesForCurrentDay(limit: number = 3): string[] {
        const currentDay = new Date().getDay();

        return this.getRouteStats()
            .sort((a, b) => {
                const aScore = a.dayOfWeekDistribution[currentDay] || 0;
                const bScore = b.dayOfWeekDistribution[currentDay] || 0;
                return bScore - aScore;
            })
            .slice(0, limit)
            .map(s => s.route);
    }

    /**
     * Get the time of day category.
     */
    private getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
        const hour = date.getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }

    /**
     * Normalize route by replacing dynamic segments.
     */
    private normalizeRoute(route: string): string {
        return route
            .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/[id]')
            .replace(/\/\d+/g, '/[id]');
    }

    /**
     * Generate a unique session ID.
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Load history from localStorage.
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.history = JSON.parse(stored);
            }
        } catch (err) {
            logger.warn('Failed to load behavior history', { component: 'BehaviorTracker' });
        }
    }

    /**
     * Save history to localStorage.
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
        } catch (err) {
            logger.warn('Failed to save behavior history', { component: 'BehaviorTracker' });
        }
    }

    /**
     * Clear all tracked data.
     */
    clear(): void {
        this.history = [];
        this.sessionPosition = 0;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignore storage errors
        }
    }

    /**
     * Get tracking statistics.
     */
    getStats(): { totalViews: number; uniqueRoutes: number; sessionViews: number } {
        const uniqueRoutes = new Set(this.history.map(h => h.route)).size;
        const sessionViews = this.history.filter(h => h.sessionId === this.sessionId).length;

        return {
            totalViews: this.history.length,
            uniqueRoutes,
            sessionViews,
        };
    }
}

// Export singleton
export const behaviorTracker = new BehaviorTracker();
