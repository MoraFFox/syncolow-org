/**
 * HTTP Transport
 *
 * Batch HTTP transport for sending logs to remote aggregation services
 * like Elasticsearch, Loki, CloudWatch, or custom endpoints.
 */

import type { LogEntry, TransportConfig } from '@/types/log-entry';
import { BaseTransport, transportRegistry } from './base-transport';

/**
 * HTTP transport configuration options
 */
export interface HttpTransportOptions {
    [key: string]: unknown;
    /** Endpoint URL for log submission */
    endpoint: string;

    /** HTTP method */
    method?: 'POST' | 'PUT';

    /** Additional headers */
    headers?: Record<string, string>;

    /** Authentication type */
    auth?: {
        type: 'bearer' | 'basic' | 'api-key';
        token?: string;
        username?: string;
        password?: string;
        apiKeyHeader?: string;
        apiKey?: string;
    };

    /** Request timeout in milliseconds */
    timeoutMs?: number;

    /** Batch size for bulk submission */
    batchSize?: number;

    /** Flush interval in milliseconds */
    flushIntervalMs?: number;

    /** Custom payload transformer */
    transformPayload?: (entries: LogEntry[]) => unknown;

    /** Custom success validator */
    isSuccess?: (response: Response) => boolean;
}

/**
 * HTTP transport implementation
 */
export class HttpTransport extends BaseTransport {
    private readonly options: {
        endpoint: string;
        method: 'POST' | 'PUT';
        headers: Record<string, string>;
        timeoutMs: number;
        batchSize: number;
        flushIntervalMs: number;
        auth?: {
            type: 'bearer' | 'basic' | 'api-key';
            token?: string;
            username?: string;
            password?: string;
            apiKey?: string;
            apiKeyHeader?: string;
        };
        transformPayload?: (entries: LogEntry[]) => unknown;
        isSuccess?: (response: Response) => boolean;
        [key: string]: unknown;
    };
    private buffer: LogEntry[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private isFlushing = false;

    constructor(config: TransportConfig) {
        super('http', config);

        const opts = config.options as HttpTransportOptions | undefined;

        if (!opts?.endpoint) {
            throw new Error('HttpTransport: endpoint is required');
        }

        this.options = {
            endpoint: opts.endpoint,
            method: opts.method || 'POST',
            headers: opts.headers || {},
            auth: opts.auth,
            timeoutMs: opts.timeoutMs || 10000,
            batchSize: opts.batchSize || 100,
            flushIntervalMs: opts.flushIntervalMs || 5000,
            transformPayload: opts.transformPayload,
            isSuccess: opts.isSuccess,
        };

        // Start flush timer
        this.flushTimer = setInterval(() => {
            this.flush().catch((err) => {
                console.error('HttpTransport: Failed to flush buffer', err);
            });
        }, this.options.flushIntervalMs);
    }

    protected async doLog(entry: LogEntry): Promise<void> {
        this.buffer.push(entry);

        if (this.buffer.length >= this.options.batchSize) {
            await this.flush();
        }
    }

    protected async doLogBatch(entries: LogEntry[]): Promise<void> {
        this.buffer.push(...entries);

        if (this.buffer.length >= this.options.batchSize) {
            await this.flush();
        }
    }

    /**
     * Flush buffer to remote endpoint
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;
        if (this.isFlushing) return;

        this.isFlushing = true;
        const entries = [...this.buffer];
        this.buffer = [];

        try {
            await this.sendBatch(entries);
        } catch (error) {
            // Re-add entries to buffer on failure (up to max buffer size)
            const maxBufferSize = this.options.batchSize * 10;
            const reAddCount = Math.min(entries.length, maxBufferSize - this.buffer.length);
            if (reAddCount > 0) {
                this.buffer.unshift(...entries.slice(0, reAddCount));
                this.health.retryQueueSize = this.buffer.length;
            }
            throw error;
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Send batch of entries to endpoint
     */
    private async sendBatch(entries: LogEntry[]): Promise<void> {
        const payload = this.options.transformPayload
            ? this.options.transformPayload(entries)
            : entries;

        const headers = this.buildHeaders();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);

        try {
            const response = await fetch(this.options.endpoint, {
                method: this.options.method,
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const isSuccess = this.options.isSuccess
                ? this.options.isSuccess(response)
                : response.ok;

            if (!isSuccess) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Build request headers
     */
    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...this.options.headers,
        };

        if (this.options.auth) {
            switch (this.options.auth.type) {
                case 'bearer':
                    if (this.options.auth.token) {
                        headers['Authorization'] = `Bearer ${this.options.auth.token}`;
                    }
                    break;
                case 'basic':
                    if (this.options.auth.username && this.options.auth.password) {
                        const credentials = Buffer.from(
                            `${this.options.auth.username}:${this.options.auth.password}`
                        ).toString('base64');
                        headers['Authorization'] = `Basic ${credentials}`;
                    }
                    break;
                case 'api-key':
                    if (this.options.auth.apiKey) {
                        const headerName = this.options.auth.apiKeyHeader || 'X-API-Key';
                        headers[headerName] = this.options.auth.apiKey;
                    }
                    break;
            }
        }

        return headers;
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
 * Register HTTP transport in the registry
 */
transportRegistry.register('http', (config) => new HttpTransport(config));

/**
 * Factory function for creating HTTP transport
 */
export function createHttpTransport(options: HttpTransportOptions): HttpTransport {
    return new HttpTransport({
        name: 'http',
        enabled: true,
        minLevel: 'info',
        options,
    });
}

/**
 * Pre-configured factory for Elasticsearch
 */
export function createElasticsearchTransport(
    endpoint: string,
    indexPrefix = 'logs',
    auth?: HttpTransportOptions['auth']
): HttpTransport {
    return createHttpTransport({
        endpoint: `${endpoint}/${indexPrefix}-${new Date().toISOString().slice(0, 10)}/_bulk`,
        method: 'POST',
        auth,
        transformPayload: (entries) => {
            return entries
                .flatMap((entry) => [
                    JSON.stringify({ index: {} }),
                    JSON.stringify(entry),
                ])
                .join('\n') + '\n';
        },
        headers: {
            'Content-Type': 'application/x-ndjson',
        },
    });
}

/**
 * Pre-configured factory for Loki
 */
export function createLokiTransport(
    endpoint: string,
    labels: Record<string, string> = {}
): HttpTransport {
    return createHttpTransport({
        endpoint: `${endpoint}/loki/api/v1/push`,
        method: 'POST',
        transformPayload: (entries) => ({
            streams: [
                {
                    stream: labels,
                    values: entries.map((entry) => [
                        (new Date(entry.timestamp).getTime() * 1000000).toString(),
                        JSON.stringify(entry),
                    ]),
                },
            ],
        }),
    });
}
