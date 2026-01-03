/**
 * Performance Monitor
 *
 * Application Performance Monitoring (APM) implementation with
 * span tracking, metrics collection, and request timing.
 */

import { getCorrelationId, getTraceContext, createChildSpan } from './correlation-context';
import { logEntry } from './log-entry-builder';
import type { LogMetrics } from '@/types/log-entry';

/**
 * Performance span for measuring operations
 */
export interface Span {
    /** Unique span ID */
    id: string;

    /** Span name */
    name: string;

    /** Parent span ID if any */
    parentId?: string;

    /** Start timestamp */
    startTime: number;

    /** End timestamp (set when span ends) */
    endTime?: number;

    /** Custom attributes */
    attributes: Record<string, unknown>;

    /** Span status */
    status: 'ok' | 'error';

    /** Error message if status is error */
    errorMessage?: string;
}

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric entry
 */
export interface Metric {
    name: string;
    type: MetricType;
    value: number;
    tags: Record<string, string>;
    timestamp: number;
}

/**
 * Performance thresholds for alerting
 */
export interface PerformanceThresholds {
    /** Slow request threshold in milliseconds */
    slowRequestMs: number;

    /** Very slow request threshold (for warning) */
    verySlowRequestMs: number;

    /** Database query slow threshold */
    slowDbQueryMs: number;

    /** External API slow threshold */
    slowExternalApiMs: number;
}

/**
 * Default performance thresholds
 */
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
    slowRequestMs: 1000,
    verySlowRequestMs: 3000,
    slowDbQueryMs: 500,
    slowExternalApiMs: 2000,
};

/**
 * Performance monitor implementation
 */
export class PerformanceMonitor {
    private spans = new Map<string, Span>();
    private metrics: Metric[] = [];
    private thresholds: PerformanceThresholds;
    private onMetric?: (metric: Metric) => void;
    private onSpan?: (span: Span) => void;
    private maxMetrics = 10000;

    constructor(options?: {
        thresholds?: Partial<PerformanceThresholds>;
        onMetric?: (metric: Metric) => void;
        onSpan?: (span: Span) => void;
    }) {
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...options?.thresholds };
        this.onMetric = options?.onMetric;
        this.onSpan = options?.onSpan;
    }

    /**
     * Start a new performance span
     */
    startSpan(name: string, context?: Record<string, unknown>): Span {
        const childContext = createChildSpan();
        const traceContext = getTraceContext();

        const span: Span = {
            id: childContext?.spanId || generateSpanId(),
            name,
            parentId: childContext?.parentSpanId || traceContext?.spanId,
            startTime: performance.now(),
            attributes: context || {},
            status: 'ok',
        };

        this.spans.set(span.id, span);
        return span;
    }

    /**
     * End a span and calculate duration
     */
    endSpan(span: Span, error?: Error): void {
        span.endTime = performance.now();

        if (error) {
            span.status = 'error';
            span.errorMessage = error.message;
        }

        const duration = span.endTime - span.startTime;
        span.attributes['duration'] = duration;

        // Check thresholds and log if slow
        this.checkThresholds(span, duration);

        // Notify listener
        if (this.onSpan) {
            this.onSpan(span);
        }

        // Record as metric
        this.recordMetric(`span.${span.name}.duration`, duration, {
            status: span.status,
        });

        // Clean up
        this.spans.delete(span.id);
    }

    /**
     * Wrap an async operation with span tracking
     */
    async trace<T>(
        name: string,
        operation: () => Promise<T>,
        context?: Record<string, unknown>
    ): Promise<T> {
        const span = this.startSpan(name, context);

        try {
            const result = await operation();
            this.endSpan(span);
            return result;
        } catch (error) {
            this.endSpan(span, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Wrap a sync operation with span tracking
     */
    traceSync<T>(
        name: string,
        operation: () => T,
        context?: Record<string, unknown>
    ): T {
        const span = this.startSpan(name, context);

        try {
            const result = operation();
            this.endSpan(span);
            return result;
        } catch (error) {
            this.endSpan(span, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Record a metric
     */
    recordMetric(
        name: string,
        value: number,
        tags: Record<string, string> = {},
        type: MetricType = 'gauge'
    ): void {
        const metric: Metric = {
            name,
            type,
            value,
            tags,
            timestamp: Date.now(),
        };

        // Add to local buffer
        if (this.metrics.length >= this.maxMetrics) {
            this.metrics.shift();
        }
        this.metrics.push(metric);

        // Notify listener
        if (this.onMetric) {
            this.onMetric(metric);
        }
    }

    /**
     * Increment a counter metric
     */
    increment(name: string, tags: Record<string, string> = {}, delta = 1): void {
        this.recordMetric(name, delta, tags, 'counter');
    }

    /**
     * Record a histogram value
     */
    histogram(name: string, value: number, tags: Record<string, string> = {}): void {
        this.recordMetric(name, value, tags, 'histogram');
    }

    /**
     * Record request duration
     */
    recordRequestDuration(
        method: string,
        route: string,
        statusCode: number,
        durationMs: number
    ): void {
        this.histogram('http.request.duration', durationMs, {
            method,
            route,
            status: String(statusCode),
        });

        // Log slow requests
        if (durationMs >= this.thresholds.verySlowRequestMs) {
            const entry = logEntry()
                .level('warn')
                .message(`Very slow request: ${method} ${route}`)
                .http(method as 'GET', route, statusCode)
                .duration(durationMs)
                .tag('performance', 'very_slow')
                .build();

            // In production, this would be sent to the logging system
            console.warn(JSON.stringify(entry));
        } else if (durationMs >= this.thresholds.slowRequestMs) {
            const entry = logEntry()
                .level('info')
                .message(`Slow request: ${method} ${route}`)
                .http(method as 'GET', route, statusCode)
                .duration(durationMs)
                .tag('performance', 'slow')
                .build();

            console.info(JSON.stringify(entry));
        }
    }

    /**
     * Record database query performance
     */
    recordDbQuery(query: string, durationMs: number, error?: Error): void {
        this.histogram('db.query.duration', durationMs, {
            query: query.slice(0, 50), // Truncate for tag safety
            error: error ? 'true' : 'false',
        });

        if (durationMs >= this.thresholds.slowDbQueryMs) {
            const entry = logEntry()
                .level('warn')
                .message('Slow database query')
                .component('Database')
                .action('query')
                .duration(durationMs)
                .data({ query: query.slice(0, 200) })
                .tag('performance', 'slow_query')
                .build();

            console.warn(JSON.stringify(entry));
        }
    }

    /**
     * Record external API call performance
     */
    recordExternalApi(url: string, durationMs: number, statusCode?: number): void {
        const host = new URL(url).host;

        this.histogram('external.api.duration', durationMs, {
            host,
            status: String(statusCode || 0),
        });

        if (durationMs >= this.thresholds.slowExternalApiMs) {
            const entry = logEntry()
                .level('warn')
                .message(`Slow external API call: ${host}`)
                .component('ExternalAPI')
                .duration(durationMs)
                .data({ url, statusCode })
                .tag('performance', 'slow_api')
                .build();

            console.warn(JSON.stringify(entry));
        }
    }

    /**
     * Check thresholds and log warnings
     */
    private checkThresholds(span: Span, durationMs: number): void {
        const type = span.attributes['type'] as string;

        if (type === 'db' && durationMs >= this.thresholds.slowDbQueryMs) {
            this.recordDbQuery(span.name, durationMs);
        } else if (type === 'http' && durationMs >= this.thresholds.slowExternalApiMs) {
            this.recordExternalApi(span.name, durationMs);
        }
    }

    /**
     * Get current metrics
     */
    getMetrics(): Metric[] {
        return [...this.metrics];
    }

    /**
     * Get metrics aggregated by name
     */
    getAggregatedMetrics(): Record<string, { count: number; sum: number; avg: number; min: number; max: number }> {
        const aggregated: Record<string, { count: number; sum: number; min: number; max: number }> = {};

        for (const metric of this.metrics) {
            if (!aggregated[metric.name]) {
                aggregated[metric.name] = {
                    count: 0,
                    sum: 0,
                    min: Infinity,
                    max: -Infinity,
                };
            }

            const agg = aggregated[metric.name];
            agg.count++;
            agg.sum += metric.value;
            agg.min = Math.min(agg.min, metric.value);
            agg.max = Math.max(agg.max, metric.value);
        }

        // Calculate averages
        const result: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};
        for (const [name, agg] of Object.entries(aggregated)) {
            result[name] = {
                ...agg,
                avg: agg.sum / agg.count,
            };
        }

        return result;
    }

    /**
     * Clear metrics (for testing)
     */
    clearMetrics(): void {
        this.metrics = [];
        this.spans.clear();
    }
}

/**
 * Generate a span ID
 */
function generateSpanId(): string {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Singleton performance monitor
 */
let monitorInstance: PerformanceMonitor | null = null;

/**
 * Get the global performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
    if (!monitorInstance) {
        monitorInstance = new PerformanceMonitor();
    }
    return monitorInstance;
}

/**
 * Convenience functions
 */
export const perf = {
    startSpan: (name: string, context?: Record<string, unknown>) =>
        getPerformanceMonitor().startSpan(name, context),

    endSpan: (span: Span, error?: Error) =>
        getPerformanceMonitor().endSpan(span, error),

    trace: <T>(name: string, operation: () => Promise<T>, context?: Record<string, unknown>) =>
        getPerformanceMonitor().trace(name, operation, context),

    traceSync: <T>(name: string, operation: () => T, context?: Record<string, unknown>) =>
        getPerformanceMonitor().traceSync(name, operation, context),

    recordMetric: (name: string, value: number, tags?: Record<string, string>) =>
        getPerformanceMonitor().recordMetric(name, value, tags),

    increment: (name: string, tags?: Record<string, string>, delta?: number) =>
        getPerformanceMonitor().increment(name, tags, delta),

    histogram: (name: string, value: number, tags?: Record<string, string>) =>
        getPerformanceMonitor().histogram(name, value, tags),
};
