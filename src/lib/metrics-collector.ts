/**
 * Metrics Collector
 *
 * Centralized metrics collection for performance monitoring,
 * system health tracking, and dashboard analytics.
 */

import type { Metric } from './performance-monitor';

/**
 * System metrics snapshot
 */
export interface SystemMetrics {
    /** Timestamp of collection */
    timestamp: string;

    /** Memory usage */
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
        percentUsed: number;
    };

    /** CPU usage */
    cpu?: {
        user: number;
        system: number;
        percentUsed: number;
    };

    /** Event loop lag in milliseconds */
    eventLoopLag?: number;

    /** Active handles and requests */
    handles?: {
        active: number;
        requests: number;
    };

    /** Process uptime in seconds */
    uptime: number;
}

/**
 * Request metrics for a time period
 */
export interface RequestMetrics {
    /** Time period start */
    periodStart: string;

    /** Time period end */
    periodEnd: string;

    /** Total requests */
    totalRequests: number;

    /** Successful requests (2xx) */
    successfulRequests: number;

    /** Client errors (4xx) */
    clientErrors: number;

    /** Server errors (5xx) */
    serverErrors: number;

    /** Response time percentiles */
    responseTime: {
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        avg: number;
    };

    /** Requests per second */
    requestsPerSecond: number;

    /** Error rate */
    errorRate: number;
}

/**
 * Metrics aggregation window
 */
export type AggregationWindow = '1m' | '5m' | '15m' | '1h' | '24h';

/**
 * Aggregated metric value
 */
interface AggregatedValue {
    count: number;
    sum: number;
    min: number;
    max: number;
    values: number[]; // For percentile calculations
    lastUpdated: number;
}

/**
 * Metrics collector implementation
 */
export class MetricsCollector {
    private metrics = new Map<string, Map<string, AggregatedValue>>();
    private requestDurations: number[] = [];
    private requestStatusCodes: number[] = [];
    private collectionStartTime = Date.now();
    private maxValuesForPercentiles = 1000;
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Clean up old data periodically
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Every minute
    }

    /**
     * Record a metric
     */
    record(metric: Metric): void {
        const key = this.getMetricKey(metric.name, metric.tags);

        if (!this.metrics.has(metric.name)) {
            this.metrics.set(metric.name, new Map());
        }

        const metricMap = this.metrics.get(metric.name)!;

        if (!metricMap.has(key)) {
            metricMap.set(key, {
                count: 0,
                sum: 0,
                min: Infinity,
                max: -Infinity,
                values: [],
                lastUpdated: Date.now(),
            });
        }

        const agg = metricMap.get(key)!;
        agg.count++;
        agg.sum += metric.value;
        agg.min = Math.min(agg.min, metric.value);
        agg.max = Math.max(agg.max, metric.value);
        agg.lastUpdated = Date.now();

        // Keep values for percentile calculations (with limit)
        agg.values.push(metric.value);
        if (agg.values.length > this.maxValuesForPercentiles) {
            agg.values.shift();
        }
    }

    /**
     * Record an HTTP request
     */
    recordRequest(durationMs: number, statusCode: number): void {
        this.requestDurations.push(durationMs);
        this.requestStatusCodes.push(statusCode);

        // Keep last 10000 requests
        if (this.requestDurations.length > 10000) {
            this.requestDurations.shift();
            this.requestStatusCodes.shift();
        }
    }

    /**
     * Get request metrics for a time period
     */
    getRequestMetrics(): RequestMetrics {
        const now = Date.now();
        const periodStart = new Date(this.collectionStartTime).toISOString();
        const periodEnd = new Date(now).toISOString();
        const durationSeconds = (now - this.collectionStartTime) / 1000;

        const total = this.requestDurations.length;
        const successful = this.requestStatusCodes.filter((s) => s >= 200 && s < 300).length;
        const clientErrors = this.requestStatusCodes.filter((s) => s >= 400 && s < 500).length;
        const serverErrors = this.requestStatusCodes.filter((s) => s >= 500).length;

        const sortedDurations = [...this.requestDurations].sort((a, b) => a - b);

        return {
            periodStart,
            periodEnd,
            totalRequests: total,
            successfulRequests: successful,
            clientErrors,
            serverErrors,
            responseTime: {
                p50: this.percentile(sortedDurations, 50),
                p75: this.percentile(sortedDurations, 75),
                p90: this.percentile(sortedDurations, 90),
                p95: this.percentile(sortedDurations, 95),
                p99: this.percentile(sortedDurations, 99),
                avg: sortedDurations.length > 0
                    ? sortedDurations.reduce((a, b) => a + b, 0) / sortedDurations.length
                    : 0,
            },
            requestsPerSecond: durationSeconds > 0 ? total / durationSeconds : 0,
            errorRate: total > 0 ? (clientErrors + serverErrors) / total : 0,
        };
    }

    /**
     * Get system metrics
     */
    getSystemMetrics(): SystemMetrics {
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        return {
            timestamp: new Date().toISOString(),
            memory: {
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external,
                rss: memoryUsage.rss,
                percentUsed: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
            },
            uptime,
        };
    }

    /**
     * Get aggregated value for a metric
     */
    getMetric(name: string, tags?: Record<string, string>): {
        count: number;
        sum: number;
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
    } | null {
        const metricMap = this.metrics.get(name);
        if (!metricMap) return null;

        if (tags) {
            const key = this.getMetricKey(name, tags);
            const agg = metricMap.get(key);
            if (!agg) return null;
            return this.formatAggregation(agg);
        }

        // Aggregate all tags
        const combined: AggregatedValue = {
            count: 0,
            sum: 0,
            min: Infinity,
            max: -Infinity,
            values: [],
            lastUpdated: 0,
        };

        for (const agg of metricMap.values()) {
            combined.count += agg.count;
            combined.sum += agg.sum;
            combined.min = Math.min(combined.min, agg.min);
            combined.max = Math.max(combined.max, agg.max);
            combined.values.push(...agg.values);
            combined.lastUpdated = Math.max(combined.lastUpdated, agg.lastUpdated);
        }

        return this.formatAggregation(combined);
    }

    /**
     * Get all metric names
     */
    getMetricNames(): string[] {
        return Array.from(this.metrics.keys());
    }

    /**
     * Export all metrics as JSON
     */
    export(): Record<string, unknown> {
        const result: Record<string, unknown> = {
            timestamp: new Date().toISOString(),
            system: this.getSystemMetrics(),
            requests: this.getRequestMetrics(),
            metrics: {},
        };

        for (const name of this.metrics.keys()) {
            (result.metrics as Record<string, unknown>)[name] = this.getMetric(name);
        }

        return result;
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.metrics.clear();
        this.requestDurations = [];
        this.requestStatusCodes = [];
        this.collectionStartTime = Date.now();
    }

    /**
     * Clean up old data
     */
    private cleanup(): void {
        const maxAge = 3600000; // 1 hour
        const now = Date.now();

        for (const metricMap of this.metrics.values()) {
            for (const [key, agg] of metricMap.entries()) {
                if (now - agg.lastUpdated > maxAge) {
                    metricMap.delete(key);
                }
            }
        }
    }

    /**
     * Generate a unique key for metric + tags
     */
    private getMetricKey(name: string, tags: Record<string, string>): string {
        const sortedTags = Object.entries(tags || {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join(',');
        return `${name}|${sortedTags}`;
    }

    /**
     * Calculate percentile
     */
    private percentile(sortedValues: number[], p: number): number {
        if (sortedValues.length === 0) return 0;
        const index = Math.ceil((p / 100) * sortedValues.length) - 1;
        return sortedValues[Math.max(0, index)];
    }

    /**
     * Format aggregated value
     */
    private formatAggregation(agg: AggregatedValue): {
        count: number;
        sum: number;
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
    } {
        const sortedValues = [...agg.values].sort((a, b) => a - b);

        return {
            count: agg.count,
            sum: agg.sum,
            avg: agg.count > 0 ? agg.sum / agg.count : 0,
            min: agg.min === Infinity ? 0 : agg.min,
            max: agg.max === -Infinity ? 0 : agg.max,
            p50: this.percentile(sortedValues, 50),
            p95: this.percentile(sortedValues, 95),
            p99: this.percentile(sortedValues, 99),
        };
    }

    /**
     * Shutdown collector
     */
    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

/**
 * Singleton instance
 */
let collectorInstance: MetricsCollector | null = null;

/**
 * Get the global metrics collector
 */
export function getMetricsCollector(): MetricsCollector {
    if (!collectorInstance) {
        collectorInstance = new MetricsCollector();
    }
    return collectorInstance;
}

/**
 * Reset the metrics collector (for testing)
 */
export function resetMetricsCollector(): void {
    if (collectorInstance) {
        collectorInstance.shutdown();
    }
    collectorInstance = null;
}
