/**
 * Logging Health Check API Route
 *
 * Provides health status for the logging system including
 * transport status, buffer utilization, and processing metrics.
 */

import { NextResponse } from 'next/server';
import { getLoggerConfig } from '@/lib/logger-config';
import { getMetricsCollector } from '@/lib/metrics-collector';
import { withTraceContext } from '@/lib/with-trace-context';

/**
 * Health status response
 */
interface LoggingHealthStatus {
    /** Overall health status */
    status: 'healthy' | 'degraded' | 'unhealthy';

    /** Timestamp of check */
    timestamp: string;

    /** Individual transport status */
    transports: TransportStatus[];

    /** Buffer metrics */
    buffer: {
        size: number;
        maxSize: number;
        utilization: number;
        droppedCount: number;
        retryQueueSize: number;
    };

    /** Processing metrics */
    processing: {
        logsPerSecond: number;
        avgProcessingTimeMs: number;
        errorRate: number;
    };

    /** Configuration info */
    config: {
        minLevel: string;
        enabledTransports: string[];
        samplingRate: number;
    };

    /** Uptime in seconds */
    uptimeSeconds: number;

    /** Any issues detected */
    issues: string[];
}

/**
 * Transport status
 */
interface TransportStatus {
    name: string;
    enabled: boolean;
    healthy: boolean;
    lastSuccess?: string;
    lastError?: string;
    successCount: number;
    failureCount: number;
    avgLatencyMs: number;
}

// Track startup time
const STARTUP_TIME = Date.now();

/**
 * GET /api/health/logging
 * 
 * Returns comprehensive health status of the logging system
 */
export const GET = withTraceContext(async (): Promise<NextResponse<LoggingHealthStatus>> => {
    const config = getLoggerConfig();
    const issues: string[] = [];

    // Get transports status (simulated for now)
    const transports: TransportStatus[] = config.transports.map((t) => ({
        name: t.name,
        enabled: t.enabled,
        healthy: true, // Would check actual transport health
        successCount: 0,
        failureCount: 0,
        avgLatencyMs: 0,
    }));

    // Check for unhealthy transports
    const unhealthyTransports = transports.filter((t) => t.enabled && !t.healthy);
    if (unhealthyTransports.length > 0) {
        issues.push(`Unhealthy transports: ${unhealthyTransports.map((t) => t.name).join(', ')}`);
    }

    // Get buffer metrics (simulated)
    const buffer = {
        size: 0,
        maxSize: config.buffer.maxSize,
        utilization: 0,
        droppedCount: 0,
        retryQueueSize: 0,
    };

    // Check buffer utilization
    if (buffer.utilization > 0.8) {
        issues.push(`High buffer utilization: ${(buffer.utilization * 100).toFixed(1)}%`);
    }

    if (buffer.droppedCount > 0) {
        issues.push(`Logs dropped due to buffer overflow: ${buffer.droppedCount}`);
    }

    // Get processing metrics
    const metricsCollector = getMetricsCollector();
    const requestMetrics = metricsCollector.getRequestMetrics();

    const processing = {
        logsPerSecond: requestMetrics.requestsPerSecond,
        avgProcessingTimeMs: requestMetrics.responseTime.avg,
        errorRate: requestMetrics.errorRate,
    };

    // Check error rate
    if (processing.errorRate > 0.1) {
        issues.push(`High error rate: ${(processing.errorRate * 100).toFixed(1)}%`);
    }

    // Determine overall status
    let status: LoggingHealthStatus['status'] = 'healthy';
    if (issues.length > 0) {
        status = issues.some((i) => i.includes('Unhealthy')) ? 'unhealthy' : 'degraded';
    }

    const response: LoggingHealthStatus = {
        status,
        timestamp: new Date().toISOString(),
        transports,
        buffer,
        processing,
        config: {
            minLevel: config.minLevel,
            enabledTransports: config.transports.filter((t) => t.enabled).map((t) => t.name),
            samplingRate: config.sampling.defaultRate,
        },
        uptimeSeconds: Math.floor((Date.now() - STARTUP_TIME) / 1000),
        issues,
    };

    // Set appropriate status code
    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
});
