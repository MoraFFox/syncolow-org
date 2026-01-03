import { invalidationEngine } from './invalidation-engine';
import { getCachePolicy } from './types';
import { logger } from '@/lib/logger';

/**
 * Invalidation Scheduler
 * 
 * Handles time-based and event-based invalidation:
 * - Business hour-aware refresh
 * - Periodic background invalidation
 * - Event-triggered invalidation (e.g., order status change -> refresh dashboard)
 */

interface ScheduledInvalidation {
    entity: string;
    intervalMs: number;
    lastRun: number;
    enabled: boolean;
    businessHoursOnly: boolean;
}

interface InvalidationTrigger {
    event: string;
    targetEntities: string[];
    condition?: (eventData: unknown) => boolean;
}

export class InvalidationScheduler {
    private schedules: Map<string, ScheduledInvalidation> = new Map();
    private triggers: InvalidationTrigger[] = [];
    private intervalId: number | null = null;
    private readonly CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

    constructor() {
        this.initializeDefaultSchedules();
        this.initializeDefaultTriggers();
    }

    /**
     * Initialize default invalidation schedules.
     */
    private initializeDefaultSchedules(): void {
        // Dashboard stats - refresh every 5 minutes during business hours
        this.addSchedule({
            entity: 'dashboard-stats',
            intervalMs: 5 * 60 * 1000,
            lastRun: 0,
            enabled: true,
            businessHoursOnly: true,
        });

        // Notifications - refresh every minute
        this.addSchedule({
            entity: 'notifications',
            intervalMs: 60 * 1000,
            lastRun: 0,
            enabled: true,
            businessHoursOnly: false,
        });

        // Orders - refresh every 2 minutes during business hours
        this.addSchedule({
            entity: 'orders',
            intervalMs: 2 * 60 * 1000,
            lastRun: 0,
            enabled: true,
            businessHoursOnly: true,
        });
    }

    /**
     * Initialize default event triggers.
     */
    private initializeDefaultTriggers(): void {
        // Order status change -> refresh dashboard
        this.addTrigger({
            event: 'order:status-changed',
            targetEntities: ['dashboard-stats', 'orders'],
        });

        // New order created -> refresh lists
        this.addTrigger({
            event: 'order:created',
            targetEntities: ['orders', 'dashboard-stats', 'companies'],
        });

        // Company updated -> refresh related
        this.addTrigger({
            event: 'company:updated',
            targetEntities: ['companies', 'orders', 'branches'],
        });

        // Product updated -> refresh orders that may contain it
        this.addTrigger({
            event: 'product:updated',
            targetEntities: ['products', 'orders'],
        });
    }

    /**
     * Add a scheduled invalidation.
     */
    addSchedule(schedule: ScheduledInvalidation): void {
        this.schedules.set(schedule.entity, schedule);
    }

    /**
     * Remove a scheduled invalidation.
     */
    removeSchedule(entity: string): void {
        this.schedules.delete(entity);
    }

    /**
     * Add an event trigger.
     */
    addTrigger(trigger: InvalidationTrigger): void {
        this.triggers.push(trigger);
    }

    /**
     * Start the scheduler.
     */
    start(): void {
        if (this.intervalId) return;

        this.intervalId = window.setInterval(
            () => this.checkSchedules(),
            this.CHECK_INTERVAL_MS
        );

        logger.debug('InvalidationScheduler started', { component: 'InvalidationScheduler' });
    }

    /**
     * Stop the scheduler.
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        logger.debug('InvalidationScheduler stopped', { component: 'InvalidationScheduler' });
    }

    /**
     * Check and execute scheduled invalidations.
     */
    private checkSchedules(): void {
        const now = Date.now();
        const isBusinessHours = this.isBusinessHours();

        for (const [entity, schedule] of this.schedules) {
            if (!schedule.enabled) continue;
            if (schedule.businessHoursOnly && !isBusinessHours) continue;

            const elapsed = now - schedule.lastRun;
            if (elapsed >= schedule.intervalMs) {
                schedule.lastRun = now;
                invalidationEngine.invalidate(entity, undefined, 'scheduled');

                logger.debug('Scheduled invalidation executed', {
                    component: 'InvalidationScheduler',
                    entity,
                });
            }
        }
    }

    /**
     * Fire an event trigger.
     * Call this when events occur in your application.
     */
    fireEvent(event: string, eventData?: unknown): void {
        for (const trigger of this.triggers) {
            if (trigger.event !== event) continue;

            // Check condition if present
            if (trigger.condition && !trigger.condition(eventData)) continue;

            // Invalidate target entities
            for (const entity of trigger.targetEntities) {
                invalidationEngine.invalidate(entity, undefined, `event:${event}`);
            }

            logger.debug('Event trigger fired', {
                component: 'InvalidationScheduler',
                event,
                targets: trigger.targetEntities,
            });
        }
    }

    /**
     * Check if current time is within business hours.
     * Business hours: 8 AM - 6 PM, Monday-Friday
     */
    private isBusinessHours(): boolean {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();

        // Weekend
        if (day === 0 || day === 6) return false;

        // Outside 8 AM - 6 PM
        if (hour < 8 || hour >= 18) return false;

        return true;
    }

    /**
     * Get current schedule status.
     */
    getStatus(): { isRunning: boolean; schedules: Array<{ entity: string; nextRun: number }> } {
        const now = Date.now();
        const scheduleInfo = Array.from(this.schedules.entries()).map(([entity, schedule]) => ({
            entity,
            nextRun: schedule.lastRun + schedule.intervalMs - now,
        }));

        return {
            isRunning: this.intervalId !== null,
            schedules: scheduleInfo,
        };
    }
}

// Export singleton
export const invalidationScheduler = new InvalidationScheduler();
