import { idbStorage } from './indexed-db';
import { universalCache } from './universal-cache';
import { logger } from '@/lib/logger';

/**
 * Cache Analytics
 * 
 * Provides visibility into cache performance and health:
 * - Real-time metrics (hit rate, size, staleness)
 * - Performance tracking
 * - Health scoring
 */

interface CacheAnalytics {
    hitRate: number;
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    indexedDBSize: number;
    entryCount: number;
    staleEntries: number;
    healthScore: number;
    recommendations: string[];
}

interface PerformanceEntry {
    timestamp: number;
    operation: 'get' | 'set' | 'invalidate';
    durationMs: number;
    cached: boolean;
}

export class CacheAnalyticsTracker {
    private performanceLog: PerformanceEntry[] = [];
    private readonly MAX_LOG_SIZE = 1000;
    private cacheHits = 0;
    private cacheMisses = 0;

    /**
     * Record a cache access.
     */
    recordAccess(hit: boolean, durationMs: number): void {
        if (hit) {
            this.cacheHits++;
        } else {
            this.cacheMisses++;
        }

        this.performanceLog.push({
            timestamp: Date.now(),
            operation: 'get',
            durationMs,
            cached: hit,
        });

        this.trimLog();
    }

    /**
     * Record a cache write.
     */
    recordWrite(durationMs: number): void {
        this.performanceLog.push({
            timestamp: Date.now(),
            operation: 'set',
            durationMs,
            cached: true,
        });

        this.trimLog();
    }

    /**
     * Record an invalidation.
     */
    recordInvalidation(durationMs: number): void {
        this.performanceLog.push({
            timestamp: Date.now(),
            operation: 'invalidate',
            durationMs,
            cached: false,
        });

        this.trimLog();
    }

    /**
     * Get comprehensive analytics.
     */
    async getAnalytics(): Promise<CacheAnalytics> {
        const totalQueries = this.cacheHits + this.cacheMisses;
        const hitRate = totalQueries > 0 ? (this.cacheHits / totalQueries) * 100 : 0;

        // Get metrics from universal cache
        const metrics = universalCache.getMetrics();

        // Estimate IndexedDB size (simplified)
        let indexedDBSize = 0;
        let entryCount = 0;
        let staleEntries = 0;

        try {
            // This is a rough estimate - actual implementation would scan IDB
            const estimate = await navigator.storage?.estimate?.();
            indexedDBSize = estimate?.usage || 0;
            entryCount = metrics.hits.memory + metrics.hits.disk;
            staleEntries = metrics.staleHits;
        } catch {
            // Storage API not available
        }

        // Calculate health score
        const healthScore = this.calculateHealthScore(hitRate, metrics.errors);

        // Generate recommendations
        const recommendations = this.generateRecommendations(hitRate, staleEntries, metrics.errors);

        return {
            hitRate,
            totalQueries,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            indexedDBSize,
            entryCount,
            staleEntries,
            healthScore,
            recommendations,
        };
    }

    /**
     * Get performance statistics.
     */
    getPerformanceStats(): {
        avgGetTime: number;
        avgWriteTime: number;
        p95GetTime: number;
    } {
        const gets = this.performanceLog.filter(e => e.operation === 'get');
        const writes = this.performanceLog.filter(e => e.operation === 'set');

        const avgGetTime = gets.length > 0
            ? gets.reduce((sum, e) => sum + e.durationMs, 0) / gets.length
            : 0;

        const avgWriteTime = writes.length > 0
            ? writes.reduce((sum, e) => sum + e.durationMs, 0) / writes.length
            : 0;

        // Calculate P95 for gets
        const sortedGets = gets.map(e => e.durationMs).sort((a, b) => a - b);
        const p95Index = Math.floor(sortedGets.length * 0.95);
        const p95GetTime = sortedGets[p95Index] || 0;

        return {
            avgGetTime,
            avgWriteTime,
            p95GetTime,
        };
    }

    /**
     * Calculate cache health score (0-100).
     */
    private calculateHealthScore(hitRate: number, errors: number): number {
        let score = 100;

        // Hit rate contribution (40%)
        score -= Math.max(0, (80 - hitRate) * 0.5);

        // Error penalty (30%)
        score -= Math.min(30, errors * 3);

        // Performance penalty (30%) - based on P95
        const { p95GetTime } = this.getPerformanceStats();
        if (p95GetTime > 100) score -= 10;
        if (p95GetTime > 500) score -= 10;
        if (p95GetTime > 1000) score -= 10;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Generate recommendations based on analytics.
     */
    private generateRecommendations(
        hitRate: number,
        staleEntries: number,
        errors: number
    ): string[] {
        const recommendations: string[] = [];

        if (hitRate < 50) {
            recommendations.push('Low hit rate. Consider increasing cache stale times or enabling prefetching.');
        }

        if (staleEntries > 100) {
            recommendations.push('Many stale entries. Consider running cache pruning more frequently.');
        }

        if (errors > 10) {
            recommendations.push('High error count. Check network connectivity and API health.');
        }

        const { p95GetTime } = this.getPerformanceStats();
        if (p95GetTime > 500) {
            recommendations.push('Slow cache access times. Consider optimizing IndexedDB queries.');
        }

        if (recommendations.length === 0) {
            recommendations.push('Cache is performing well!');
        }

        return recommendations;
    }

    /**
     * Trim performance log to max size.
     */
    private trimLog(): void {
        if (this.performanceLog.length > this.MAX_LOG_SIZE) {
            this.performanceLog = this.performanceLog.slice(-this.MAX_LOG_SIZE);
        }
    }

    /**
     * Reset all analytics.
     */
    reset(): void {
        this.performanceLog = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * Export analytics for debugging.
     */
    export(): object {
        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            performanceLogSize: this.performanceLog.length,
            recentPerformance: this.performanceLog.slice(-10),
        };
    }
}

// Export singleton
export const cacheAnalytics = new CacheAnalyticsTracker();
