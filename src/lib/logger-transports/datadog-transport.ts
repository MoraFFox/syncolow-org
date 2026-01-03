/**
 * DataDog Transport
 *
 * Integration with DataDog APM for logs, metrics, and traces.
 */

import type { LogEntry, TransportConfig } from '@/types/log-entry';
import { BaseTransport, transportRegistry } from './base-transport';

/**
 * DataDog transport configuration options
 */
export interface DataDogTransportOptions {
    [key: string]: unknown;
    /** DataDog API key */
    apiKey?: string;

    /** DataDog application key (for some endpoints) */
    appKey?: string;

    /** DataDog site (e.g., 'datadoghq.com', 'datadoghq.eu') */
    site?: string;

    /** Service name */
    service?: string;

    /** Source (e.g., 'nodejs') */
    source?: string;

    /** Custom hostname */
    hostname?: string;

    /** Custom tags */
    tags?: string[];

    /** Batch size */
    batchSize?: number;

    /** Flush interval in milliseconds */
    flushIntervalMs?: number;
}

/**
 * DataDog log entry format
 */
interface DataDogLogEntry {
    timestamp: number;
    message: string;
    level: string;
    ddsource: string;
    ddtags: string;
    service: string;
    hostname?: string;
    status: string;
    [key: string]: unknown;
}

/**
 * DataDog transport implementation
 */
export class DataDogTransport extends BaseTransport {
    private readonly options: {
        apiKey: string;
        site: string;
        service: string;
        source: string;
        hostname: string;
        tags: string[];
        batchSize: number;
        flushIntervalMs: number;
        appKey?: string;
        [key: string]: unknown;
    };
    private buffer: DataDogLogEntry[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private isFlushing = false;

    constructor(config: TransportConfig) {
        super('datadog', config);

        const opts = config.options as DataDogTransportOptions | undefined;

        this.options = {
            apiKey: opts?.apiKey || process.env.DATADOG_API_KEY || '',
            appKey: opts?.appKey || process.env.DATADOG_APP_KEY,
            site: opts?.site || process.env.DATADOG_SITE || 'datadoghq.com',
            service: opts?.service || 'synergyflow-erp',
            source: opts?.source || 'nodejs',
            hostname: opts?.hostname || process.env.HOSTNAME || 'unknown',
            tags: opts?.tags || [],
            batchSize: opts?.batchSize || 50,
            flushIntervalMs: opts?.flushIntervalMs || 5000,
        };

        if (!this.options.apiKey) {
            console.warn('DataDogTransport: No API key provided');
        }

        // Start flush timer
        this.flushTimer = setInterval(() => {
            this.flush().catch((err) => {
                console.error('DataDogTransport: Failed to flush buffer', err);
            });
        }, this.options.flushIntervalMs);
    }

    protected async doLog(entry: LogEntry): Promise<void> {
        if (!this.options.apiKey) return;

        const ddEntry = this.transformEntry(entry);
        this.buffer.push(ddEntry);

        if (this.buffer.length >= this.options.batchSize) {
            await this.flush();
        }
    }

    protected async doLogBatch(entries: LogEntry[]): Promise<void> {
        if (!this.options.apiKey) return;

        const ddEntries = entries.map((e) => this.transformEntry(e));
        this.buffer.push(...ddEntries);

        if (this.buffer.length >= this.options.batchSize) {
            await this.flush();
        }
    }

    /**
     * Transform log entry to DataDog format
     */
    private transformEntry(entry: LogEntry): DataDogLogEntry {
        const tags = [...this.options.tags];

        // Add correlation ID
        if (entry.correlationId) {
            tags.push(`correlation_id:${entry.correlationId}`);
        }

        // Add trace IDs
        if (entry.traceId) {
            tags.push(`trace_id:${entry.traceId}`);
        }
        if (entry.spanId) {
            tags.push(`span_id:${entry.spanId}`);
        }

        // Add component and action
        if (entry.context?.component) {
            tags.push(`component:${entry.context.component}`);
        }
        if (entry.context?.action) {
            tags.push(`action:${entry.context.action}`);
        }

        // Add environment
        tags.push(`env:${entry.environment}`);

        // Add custom tags from entry
        if (entry.context?.tags) {
            Object.entries(entry.context.tags).forEach(([key, value]) => {
                tags.push(`${key}:${value}`);
            });
        }

        const ddEntry: DataDogLogEntry = {
            timestamp: new Date(entry.timestamp).getTime(),
            message: entry.message,
            level: entry.level,
            ddsource: this.options.source,
            ddtags: tags.join(','),
            service: this.options.service,
            hostname: this.options.hostname,
            status: this.mapStatus(entry.level),
        };

        // Add error details
        if (entry.error) {
            ddEntry.error = {
                kind: entry.error.name,
                message: entry.error.message,
                stack: entry.error.stack,
                category: entry.error.category,
            };
        }

        // Add HTTP details
        if (entry.context?.method && entry.context?.route) {
            ddEntry.http = {
                method: entry.context.method,
                url: entry.context.route,
                status_code: entry.context.statusCode,
            };
        }

        // Add user details
        if (entry.context?.userId) {
            ddEntry.usr = {
                id: entry.context.userId,
                session_id: entry.context.sessionId,
            };
        }

        // Add performance metrics
        if (entry.metrics) {
            ddEntry.metrics = entry.metrics;
        }

        // Add additional context data
        if (entry.context?.data) {
            ddEntry.context = entry.context.data;
        }

        return ddEntry;
    }

    /**
     * Map log level to DataDog status
     */
    private mapStatus(level: string): string {
        switch (level) {
            case 'trace':
            case 'debug':
                return 'debug';
            case 'info':
                return 'info';
            case 'warn':
                return 'warn';
            case 'error':
                return 'error';
            case 'fatal':
                return 'critical';
            default:
                return 'info';
        }
    }

    /**
     * Flush buffer to DataDog
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;
        if (this.isFlushing) return;
        if (!this.options.apiKey) return;

        this.isFlushing = true;
        const entries = [...this.buffer];
        this.buffer = [];

        try {
            await this.sendToDataDog(entries);
        } catch (error) {
            // Re-add entries to buffer on failure
            const maxBufferSize = this.options.batchSize * 10;
            const reAddCount = Math.min(entries.length, maxBufferSize - this.buffer.length);
            if (reAddCount > 0) {
                this.buffer.unshift(...entries.slice(0, reAddCount));
            }
            throw error;
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Send logs to DataDog HTTP API
     */
    private async sendToDataDog(entries: DataDogLogEntry[]): Promise<void> {
        const endpoint = `https://http-intake.logs.${this.options.site}/api/v2/logs`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': this.options.apiKey,
            },
            body: JSON.stringify(entries),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`DataDog API error: ${response.status} ${text}`);
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        await this.flush();
    }
}

/**
 * Register DataDog transport in the registry
 */
transportRegistry.register('datadog', (config) => new DataDogTransport(config));

/**
 * Factory function for creating DataDog transport
 */
export function createDataDogTransport(options?: DataDogTransportOptions): DataDogTransport {
    return new DataDogTransport({
        name: 'datadog',
        enabled: true,
        minLevel: 'info',
        options,
    });
}
