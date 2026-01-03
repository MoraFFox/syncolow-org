import { CacheKey, CacheKeyParams, PrefetchPriority, getCachePolicy } from './types';
import { CacheKeyFactory } from './key-factory';
import { universalCache } from './universal-cache';
import { logger } from '@/lib/logger';

/**
 * Prefetch Strategy
 * 
 * Implements intelligent prefetching based on:
 * - Route prediction (likely next navigation targets)
 * - Link hover prefetching
 * - Priority-based prefetch queue
 * - Bandwidth-aware throttling
 */

interface PrefetchItem {
    key: CacheKey;
    fetcher: () => Promise<unknown>;
    priority: PrefetchPriority;
    scheduledAt: number;
}

/**
 * Priority weights for prefetch ordering.
 * Lower values = higher priority.
 */
const PRIORITY_WEIGHTS: Record<PrefetchPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};

/**
 * Convert entity to its default fetcher.
 * In real usage, these would be imported from your data layer.
 */
type FetcherMap = Record<string, (params?: CacheKeyParams) => Promise<unknown>>;

export class PrefetchStrategy {
    private queue: PrefetchItem[] = [];
    private processing = false;
    private readonly maxConcurrent = 2;
    private activeCount = 0;
    private fetcherMap: FetcherMap = {};

    /**
     * Register fetchers for entities.
     * Call this during app initialization with your data fetching functions.
     */
    registerFetchers(fetchers: FetcherMap): void {
        this.fetcherMap = { ...this.fetcherMap, ...fetchers };
    }

    /**
     * Schedule a prefetch with priority.
     * The item will be added to the queue and processed when resources are available.
     */
    schedule(
        key: CacheKey,
        fetcher: () => Promise<unknown>,
        priority: PrefetchPriority = 'medium'
    ): void {
        // Don't add duplicates
        const keyStr = JSON.stringify(key);
        if (this.queue.some(item => JSON.stringify(item.key) === keyStr)) {
            return;
        }

        this.queue.push({
            key,
            fetcher,
            priority,
            scheduledAt: Date.now(),
        });

        // Sort by priority (lower weight = higher priority)
        this.queue.sort((a, b) => PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority]);

        // Process queue if not already processing
        this.processQueue();
    }

    /**
     * Prefetch an entity list with automatic priority based on cache policy.
     */
    scheduleEntity(entity: string, params: CacheKeyParams = {}): void {
        const policy = getCachePolicy(entity);
        const key = CacheKeyFactory.list(entity, params);
        const fetcher = this.fetcherMap[entity];

        if (!fetcher) {
            logger.warn(`No fetcher registered for entity: ${entity}`, {
                component: 'PrefetchStrategy'
            });
            return;
        }

        this.schedule(key, () => fetcher(params), policy.prefetchPriority);
    }

    /**
     * Prefetch an entity and its related entities.
     * Uses the entity relationship graph from CacheKeyFactory.
     */
    scheduleWithRelations(
        entity: string,
        params: CacheKeyParams = {},
        depth: number = 1
    ): void {
        // Schedule main entity
        this.scheduleEntity(entity, params);

        // Schedule related entities
        const relatedEntities = CacheKeyFactory.getRelatedEntities(entity, depth);
        for (const related of relatedEntities) {
            // Extract relevant params for related entity
            this.scheduleEntity(related, {});
        }
    }

    /**
     * Process the prefetch queue.
     * Respects concurrent limits and connection quality.
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;
        if (this.activeCount >= this.maxConcurrent) return;

        // Check if we should prefetch based on connection
        if (!this.shouldPrefetch()) {
            logger.debug('Prefetch skipped due to connection constraints', {
                component: 'PrefetchStrategy',
            });
            return;
        }

        this.processing = true;

        while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
            const item = this.queue.shift();
            if (!item) break;

            this.activeCount++;

            // Don't await - process in parallel up to maxConcurrent
            this.prefetchItem(item).finally(() => {
                this.activeCount--;
                // Continue processing when a slot frees up
                if (this.queue.length > 0) {
                    this.processQueue();
                }
            });
        }

        this.processing = false;
    }

    /**
     * Execute a single prefetch.
     */
    private async prefetchItem(item: PrefetchItem): Promise<void> {
        try {
            await universalCache.prefetch(item.key, item.fetcher);
            logger.debug('Prefetch completed', {
                component: 'PrefetchStrategy',
                key: JSON.stringify(item.key).slice(0, 100),
            });
        } catch (err) {
            logger.warn('Prefetch failed', {
                component: 'PrefetchStrategy',
                key: JSON.stringify(item.key).slice(0, 100),
                error: err instanceof Error ? err.message : 'Unknown',
            });
        }
    }

    /**
     * Check if we should prefetch based on connection quality.
     * Disables prefetching on slow connections.
     */
    private shouldPrefetch(): boolean {
        if (!navigator.onLine) return false;

        // Check Network Information API
        const navWithConn = navigator as Navigator & {
            connection?: { effectiveType?: string; saveData?: boolean };
        };

        if (navWithConn.connection?.saveData) {
            return false; // Respect data saver mode
        }

        const effectiveType = navWithConn.connection?.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            return false; // Too slow for prefetching
        }

        return true;
    }

    /**
     * Clear the prefetch queue.
     * Useful when navigating away from a page.
     */
    clearQueue(): void {
        this.queue = [];
    }

    /**
     * Get queue statistics for debugging.
     */
    getStats(): { queued: number; active: number } {
        return {
            queued: this.queue.length,
            active: this.activeCount,
        };
    }
}

// Export singleton
export const prefetchStrategy = new PrefetchStrategy();
