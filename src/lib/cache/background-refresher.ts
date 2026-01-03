import { QueryClient } from '@tanstack/react-query';
import { getCachePolicy, CacheKey } from './types';
import { CacheKeyFactory } from './key-factory';
import { logger } from '@/lib/logger';

/**
 * Background Refresher
 * 
 * Handles background refresh of critical data:
 * - Priority-based refresh queue
 * - Visibility-aware refreshing (pause when tab hidden)
 * - Network-aware throttling
 */

interface RefreshTask {
    key: CacheKey;
    fetcher: () => Promise<unknown>;
    priority: number;
    lastRefresh: number;
    intervalMs: number;
}

type FetcherRegistry = Map<string, (params?: Record<string, unknown>) => Promise<unknown>>;

export class BackgroundRefresher {
    private queryClient: QueryClient | null = null;
    private tasks: Map<string, RefreshTask> = new Map();
    private intervalId: number | null = null;
    private fetchers: FetcherRegistry = new Map();
    private isVisible = true;
    private readonly CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

    constructor() {
        // Listen for visibility changes
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                this.isVisible = document.visibilityState === 'visible';
                if (this.isVisible) {
                    // Resume checking when tab becomes visible
                    this.checkTasks();
                }
            });
        }
    }

    /**
     * Initialize with QueryClient.
     */
    initialize(queryClient: QueryClient): void {
        this.queryClient = queryClient;
    }

    /**
     * Register a fetcher for an entity.
     */
    registerFetcher(entity: string, fetcher: (params?: Record<string, unknown>) => Promise<unknown>): void {
        this.fetchers.set(entity, fetcher);
    }

    /**
     * Add a task to the refresh queue.
     */
    addTask(
        entity: string,
        params: import('./types').CacheKeyParams = {},
        priority: number = 5
    ): void {
        const key = CacheKeyFactory.list(entity, params);
        const keyStr = JSON.stringify(key);
        const policy = getCachePolicy(entity);

        const fetcher = this.fetchers.get(entity);
        if (!fetcher) {
            logger.warn(`No fetcher registered for background refresh: ${entity}`, {
                component: 'BackgroundRefresher',
            });
            return;
        }

        this.tasks.set(keyStr, {
            key,
            fetcher: () => fetcher(params),
            priority,
            lastRefresh: 0,
            intervalMs: policy.staleTime * 0.8, // Refresh before stale
        });
    }

    /**
     * Remove a task from the queue.
     */
    removeTask(entity: string, params: import('./types').CacheKeyParams = {}): void {
        const key = CacheKeyFactory.list(entity, params);
        const keyStr = JSON.stringify(key);
        this.tasks.delete(keyStr);
    }

    /**
     * Start the background refresher.
     */
    start(): void {
        if (this.intervalId) return;

        this.intervalId = window.setInterval(
            () => this.checkTasks(),
            this.CHECK_INTERVAL_MS
        );

        logger.debug('BackgroundRefresher started', { component: 'BackgroundRefresher' });
    }

    /**
     * Stop the background refresher.
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        logger.debug('BackgroundRefresher stopped', { component: 'BackgroundRefresher' });
    }

    /**
     * Check and execute refresh tasks.
     */
    private async checkTasks(): Promise<void> {
        if (!this.isVisible || !this.shouldRefresh()) return;

        const now = Date.now();

        // Sort tasks by priority
        const sortedTasks = Array.from(this.tasks.values())
            .filter(task => now - task.lastRefresh >= task.intervalMs)
            .sort((a, b) => a.priority - b.priority);

        // Execute up to 2 tasks per check
        const tasksToRun = sortedTasks.slice(0, 2);

        for (const task of tasksToRun) {
            await this.executeTask(task);
        }
    }

    /**
     * Execute a single refresh task.
     */
    private async executeTask(task: RefreshTask): Promise<void> {
        if (!this.queryClient) return;

        try {
            const data = await task.fetcher();

            // Update React Query cache
            this.queryClient.setQueryData(task.key as unknown as readonly unknown[], data);

            // Update last refresh time
            const keyStr = JSON.stringify(task.key);
            const existing = this.tasks.get(keyStr);
            if (existing) {
                existing.lastRefresh = Date.now();
            }

            logger.debug('Background refresh completed', {
                component: 'BackgroundRefresher',
                key: JSON.stringify(task.key).slice(0, 50),
            });
        } catch (err) {
            logger.warn('Background refresh failed', {
                component: 'BackgroundRefresher',
                error: err instanceof Error ? err.message : 'Unknown',
            });
        }
    }

    /**
     * Check if we should refresh based on network conditions.
     */
    private shouldRefresh(): boolean {
        if (!navigator.onLine) return false;

        const navWithConn = navigator as Navigator & {
            connection?: { effectiveType?: string; saveData?: boolean };
        };

        if (navWithConn.connection?.saveData) return false;

        const effectiveType = navWithConn.connection?.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;

        return true;
    }

    /**
     * Force refresh all tasks immediately.
     */
    async forceRefreshAll(): Promise<void> {
        for (const task of this.tasks.values()) {
            await this.executeTask(task);
        }
    }

    /**
     * Get refresher status.
     */
    getStatus(): { isRunning: boolean; taskCount: number; isVisible: boolean } {
        return {
            isRunning: this.intervalId !== null,
            taskCount: this.tasks.size,
            isVisible: this.isVisible,
        };
    }
}

// Export singleton
export const backgroundRefresher = new BackgroundRefresher();
