import { behaviorTracker } from './behavior-tracker';
import { routePredictor } from './route-predictor';
import { prefetchStrategy } from './prefetch-strategy';
import { logger } from '@/lib/logger';

/**
 * Warming Scheduler
 * 
 * Schedules cache warming during idle time based on:
 * - User behavior patterns
 * - Predicted routes
 * - Time-of-day patterns
 * 
 * Uses requestIdleCallback for non-blocking warm-up.
 */

interface WarmingTask {
    entity: string;
    priority: number;
    reason: string;
}

export class WarmingScheduler {
    private isWarming = false;
    private warmingInterval: number | null = null;
    private readonly WARMING_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes

    /**
     * Start the warming scheduler.
     * Should be called on app startup.
     */
    start(): void {
        if (this.warmingInterval) return;

        // Initial warming after short delay
        setTimeout(() => this.runWarmingCycle(), 2000);

        // Schedule periodic warming
        this.warmingInterval = window.setInterval(
            () => this.runWarmingCycle(),
            this.WARMING_INTERVAL_MS
        );

        logger.debug('Warming scheduler started', { component: 'WarmingScheduler' });
    }

    /**
     * Stop the warming scheduler.
     */
    stop(): void {
        if (this.warmingInterval) {
            clearInterval(this.warmingInterval);
            this.warmingInterval = null;
        }
        logger.debug('Warming scheduler stopped', { component: 'WarmingScheduler' });
    }

    /**
     * Run a warming cycle.
     * Uses requestIdleCallback to avoid blocking the main thread.
     */
    runWarmingCycle(): void {
        if (this.isWarming) return;

        // Check if we should warm (online, not on slow connection)
        if (!this.shouldWarm()) {
            logger.debug('Skipping warming cycle - conditions not met', {
                component: 'WarmingScheduler',
            });
            return;
        }

        this.isWarming = true;

        // Use requestIdleCallback if available, otherwise setTimeout
        const scheduleIdle = typeof requestIdleCallback !== 'undefined'
            ? requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 50);

        scheduleIdle(() => {
            this.executeWarming().finally(() => {
                this.isWarming = false;
            });
        });
    }

    /**
     * Execute the warming logic.
     */
    private async executeWarming(): Promise<void> {
        const tasks = this.determineWarmingTasks();

        logger.debug(`Warming ${tasks.length} entities`, {
            component: 'WarmingScheduler',
            tasks: tasks.map(t => t.entity),
        });

        for (const task of tasks) {
            // Schedule via prefetch strategy (respects priority and bandwidth)
            prefetchStrategy.scheduleEntity(task.entity);
        }
    }

    /**
     * Determine what entities should be warmed.
     */
    private determineWarmingTasks(): WarmingTask[] {
        const tasks: WarmingTask[] = [];
        const addedEntities = new Set<string>();

        // 1. Entities from frequently visited routes
        const frequentRoutes = behaviorTracker.getFrequentRoutes(5);
        for (const route of frequentRoutes) {
            const entities = routePredictor.getEntitiesForRoute(route);
            for (const entity of entities) {
                if (!addedEntities.has(entity)) {
                    tasks.push({
                        entity,
                        priority: 1,
                        reason: `frequent route: ${route}`,
                    });
                    addedEntities.add(entity);
                }
            }
        }

        // 2. Entities for current time of day
        const timeRoutes = behaviorTracker.getRoutesForCurrentTime(3);
        for (const route of timeRoutes) {
            const entities = routePredictor.getEntitiesForRoute(route);
            for (const entity of entities) {
                if (!addedEntities.has(entity)) {
                    tasks.push({
                        entity,
                        priority: 2,
                        reason: `time-of-day pattern: ${route}`,
                    });
                    addedEntities.add(entity);
                }
            }
        }

        // 3. Entities for current day of week
        const dayRoutes = behaviorTracker.getRoutesForCurrentDay(3);
        for (const route of dayRoutes) {
            const entities = routePredictor.getEntitiesForRoute(route);
            for (const entity of entities) {
                if (!addedEntities.has(entity)) {
                    tasks.push({
                        entity,
                        priority: 3,
                        reason: `day-of-week pattern: ${route}`,
                    });
                    addedEntities.add(entity);
                }
            }
        }

        // Sort by priority
        return tasks.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Check if conditions allow for cache warming.
     */
    private shouldWarm(): boolean {
        if (!navigator.onLine) return false;

        // Check Network Information API
        const navWithConn = navigator as Navigator & {
            connection?: { effectiveType?: string; saveData?: boolean };
        };

        if (navWithConn.connection?.saveData) return false;

        const effectiveType = navWithConn.connection?.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;

        return true;
    }

    /**
     * Get scheduler status.
     */
    getStatus(): { isActive: boolean; isWarming: boolean } {
        return {
            isActive: this.warmingInterval !== null,
            isWarming: this.isWarming,
        };
    }
}

// Export singleton
export const warmingScheduler = new WarmingScheduler();
