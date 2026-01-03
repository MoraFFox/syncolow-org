import { logger } from '@/lib/logger';

/**
 * Quota Manager
 * 
 * Manages storage quotas and prevents cache bloat:
 * - Storage quota monitoring
 * - Automatic pruning based on usage
 * - Size limits per entity type
 * - LRU eviction with access tracking
 */

interface QuotaConfig {
    maxTotalSize: number;      // Maximum total cache size in bytes
    warningThreshold: number;  // Percentage at which to warn (0-1)
    criticalThreshold: number; // Percentage at which to auto-prune (0-1)
    entityLimits: Record<string, number>; // Max entries per entity
}

interface QuotaStatus {
    totalUsage: number;
    quotaAvailable: number;
    usagePercent: number;
    isWarning: boolean;
    isCritical: boolean;
}

const DEFAULT_CONFIG: QuotaConfig = {
    maxTotalSize: 100 * 1024 * 1024, // 100 MB
    warningThreshold: 0.7,
    criticalThreshold: 0.9,
    entityLimits: {
        orders: 5000,
        companies: 2000,
        products: 10000,
        notifications: 500,
        'dashboard-stats': 100,
        'user-settings': 50,
        maintenance: 1000,
        feedback: 1000,
    },
};

export class QuotaManager {
    private config: QuotaConfig;
    private accessTracker: Map<string, number> = new Map();

    constructor(config: Partial<QuotaConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Check current storage quota status.
     */
    async checkQuota(): Promise<QuotaStatus> {
        try {
            const estimate = await navigator.storage?.estimate?.();

            if (!estimate) {
                return this.getDefaultStatus();
            }

            const totalUsage = estimate.usage || 0;
            const quotaAvailable = estimate.quota || this.config.maxTotalSize;
            const usagePercent = totalUsage / quotaAvailable;

            return {
                totalUsage,
                quotaAvailable,
                usagePercent,
                isWarning: usagePercent >= this.config.warningThreshold,
                isCritical: usagePercent >= this.config.criticalThreshold,
            };
        } catch (err) {
            logger.warn('Failed to check storage quota', { component: 'QuotaManager' });
            return this.getDefaultStatus();
        }
    }

    /**
     * Record an access for LRU tracking.
     */
    recordAccess(cacheKey: string): void {
        this.accessTracker.set(cacheKey, Date.now());
    }

    /**
     * Get least recently used keys.
     */
    getLRUKeys(count: number): string[] {
        const entries = Array.from(this.accessTracker.entries());
        entries.sort((a, b) => a[1] - b[1]); // Sort by timestamp ascending
        return entries.slice(0, count).map(([key]) => key);
    }

    /**
     * Check if entity is within its limit.
     */
    isWithinLimit(entity: string, currentCount: number): boolean {
        const limit = this.config.entityLimits[entity] || 1000;
        return currentCount < limit;
    }

    /**
     * Get the limit for an entity.
     */
    getEntityLimit(entity: string): number {
        return this.config.entityLimits[entity] || 1000;
    }

    /**
     * Calculate how many entries to prune for an entity.
     */
    calculatePruneCount(entity: string, currentCount: number): number {
        const limit = this.getEntityLimit(entity);
        if (currentCount <= limit) return 0;

        // Prune to 80% of limit
        return currentCount - Math.floor(limit * 0.8);
    }

    /**
     * Request persistent storage.
     */
    async requestPersistence(): Promise<boolean> {
        try {
            if (navigator.storage?.persist) {
                const granted = await navigator.storage.persist();
                logger.debug(`Storage persistence: ${granted ? 'granted' : 'denied'}`, {
                    component: 'QuotaManager',
                });
                return granted;
            }
            return false;
        } catch (err) {
            logger.warn('Failed to request persistent storage', { component: 'QuotaManager' });
            return false;
        }
    }

    /**
     * Check if storage is persisted.
     */
    async isPersisted(): Promise<boolean> {
        try {
            if (navigator.storage?.persisted) {
                return await navigator.storage.persisted();
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Clear access tracking.
     */
    clearAccessTracking(): void {
        this.accessTracker.clear();
    }

    /**
     * Get default status when Storage API is unavailable.
     */
    private getDefaultStatus(): QuotaStatus {
        return {
            totalUsage: 0,
            quotaAvailable: this.config.maxTotalSize,
            usagePercent: 0,
            isWarning: false,
            isCritical: false,
        };
    }

    /**
     * Get current config.
     */
    getConfig(): QuotaConfig {
        return { ...this.config };
    }

    /**
     * Update config.
     */
    updateConfig(updates: Partial<QuotaConfig>): void {
        this.config = { ...this.config, ...updates };
    }
}

// Export singleton
export const quotaManager = new QuotaManager();
