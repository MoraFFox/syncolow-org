import { QueryClient } from '@tanstack/react-query';
import { invalidationEngine } from './cache/invalidation-engine';
import { invalidationScheduler } from './cache/invalidation-scheduler';
import { backgroundRefresher } from './cache/background-refresher';
import { warmingScheduler } from './cache/warming-scheduler';
import { prefetchStrategy } from './cache/prefetch-strategy';
import { tabSyncManager } from './cache/tab-sync-manager';
import { quotaManager } from './cache/quota-manager';
import { logger } from '@/lib/logger';

/**
 * Cache System Initialization
 * 
 * Centralizes initialization of all cache-related systems:
 * - InvalidationEngine with QueryClient
 * - BackgroundRefresher with QueryClient
 * - WarmingScheduler startup
 * - InvalidationScheduler startup
 * - Tab synchronization listeners
 * - Quota management
 */

interface CacheInitOptions {
    enableWarming?: boolean;
    enableScheduledInvalidation?: boolean;
    enableBackgroundRefresh?: boolean;
    requestPersistence?: boolean;
}

const DEFAULT_OPTIONS: CacheInitOptions = {
    enableWarming: true,
    enableScheduledInvalidation: true,
    enableBackgroundRefresh: true,
    requestPersistence: true,
};

/**
 * Initialize the entire cache system.
 * Call this once during app startup after QueryClient is created.
 */
export async function initializeCacheSystem(
    queryClient: QueryClient,
    options: CacheInitOptions = {}
): Promise<void> {
    const config = { ...DEFAULT_OPTIONS, ...options };

    logger.debug('Initializing cache system...', { component: 'CacheInit' });

    // 1. Initialize core engines with QueryClient
    invalidationEngine.initialize(queryClient);
    backgroundRefresher.initialize(queryClient);

    // 2. Set up tab synchronization listeners
    setupTabSyncListeners();

    // 3. Start schedulers based on config
    if (config.enableWarming) {
        warmingScheduler.start();
    }

    if (config.enableScheduledInvalidation) {
        invalidationScheduler.start();
    }

    if (config.enableBackgroundRefresh) {
        backgroundRefresher.start();
    }

    // 4. Request persistent storage
    if (config.requestPersistence) {
        const persisted = await quotaManager.requestPersistence();
        logger.debug(`Storage persistence: ${persisted ? 'granted' : 'denied'}`, {
            component: 'CacheInit',
        });
    }

    // 5. Check initial quota status
    const quotaStatus = await quotaManager.checkQuota();
    if (quotaStatus.isWarning) {
        logger.warn('Storage quota warning', {
            component: 'CacheInit',
            usage: quotaStatus.usagePercent * 100,
        });
    }

    logger.debug('Cache system initialized', {
        component: 'CacheInit',
        warming: config.enableWarming,
        scheduledInvalidation: config.enableScheduledInvalidation,
        backgroundRefresh: config.enableBackgroundRefresh,
    });
}

/**
 * Set up tab synchronization listeners.
 */
function setupTabSyncListeners(): void {
    // Listen for invalidation broadcasts from other tabs
    tabSyncManager.subscribe('invalidate', (payload) => {
        const { entity, entityId } = payload as { entity: string; entityId?: string };
        invalidationEngine.invalidateNow(entity, entityId, 'tab-sync');
        logger.debug('Invalidated from tab sync', {
            component: 'CacheInit',
            entity,
        });
    });

    // Listen for sync completions (trigger UI refresh)
    tabSyncManager.subscribe('sync-complete', (payload) => {
        const { operationCount } = payload as { operationCount: number };
        logger.debug(`Sync complete in another tab: ${operationCount} operations`, {
            component: 'CacheInit',
        });
    });
}

/**
 * Shutdown the cache system.
 * Call this during app unmount or before hot reload.
 */
export function shutdownCacheSystem(): void {
    warmingScheduler.stop();
    invalidationScheduler.stop();
    backgroundRefresher.stop();
    tabSyncManager.destroy();

    logger.debug('Cache system shut down', { component: 'CacheInit' });
}

/**
 * Register entity fetchers for prefetching and background refresh.
 * Call this after data layer is initialized.
 */
export function registerEntityFetchers(
    fetchers: Record<string, (params?: Record<string, unknown>) => Promise<unknown>>
): void {
    prefetchStrategy.registerFetchers(fetchers);

    // Also register for background refresh
    for (const [entity, fetcher] of Object.entries(fetchers)) {
        backgroundRefresher.registerFetcher(entity, fetcher);
    }

    logger.debug('Entity fetchers registered', {
        component: 'CacheInit',
        entities: Object.keys(fetchers),
    });
}
