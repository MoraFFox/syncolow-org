/**
 * Base Transport
 *
 * Abstract base class for all log transport implementations.
 * Provides common functionality for error handling, retry logic,
 * and health checking.
 */

import type { LogEntry, LogLevel, TransportConfig } from '@/types/log-entry';
import { LOG_LEVEL_VALUES } from '@/types/log-entry';

/**
 * Transport health status
 */
export interface TransportHealth {
    /** Whether the transport is operational */
    healthy: boolean;

    /** Last successful log time */
    lastSuccessTime?: Date;

    /** Last error time */
    lastErrorTime?: Date;

    /** Last error message */
    lastError?: string;

    /** Number of consecutive failures */
    consecutiveFailures: number;

    /** Total logs sent successfully */
    successCount: number;

    /** Total logs that failed to send */
    failureCount: number;

    /** Current retry queue size */
    retryQueueSize: number;
}

/**
 * Transport statistics
 */
export interface TransportStats {
    /** Transport name */
    name: string;

    /** Whether transport is enabled */
    enabled: boolean;

    /** Health status */
    health: TransportHealth;

    /** Average latency in milliseconds */
    avgLatencyMs: number;

    /** Logs processed per second (recent) */
    throughput: number;
}

/**
 * Abstract base class for log transports
 */
export abstract class BaseTransport {
    protected readonly name: string;
    protected readonly config: TransportConfig;
    protected health: TransportHealth;
    protected enabled: boolean;
    protected latencies: number[] = []; // Rolling window for avg latency
    protected lastThroughputCheck = Date.now();
    protected throughputCount = 0;

    constructor(name: string, config: TransportConfig) {
        this.name = name;
        this.config = config;
        this.enabled = config.enabled;
        this.health = {
            healthy: true,
            consecutiveFailures: 0,
            successCount: 0,
            failureCount: 0,
            retryQueueSize: 0,
        };
    }

    /**
     * Get transport name
     */
    getName(): string {
        return this.name;
    }

    /**
     * Check if transport is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Check if transport is healthy
     */
    isHealthy(): boolean {
        return this.health.healthy;
    }

    /**
     * Get transport health status
     */
    getHealth(): TransportHealth {
        return { ...this.health };
    }

    /**
     * Get transport statistics
     */
    getStats(): TransportStats {
        const now = Date.now();
        const elapsed = (now - this.lastThroughputCheck) / 1000;
        const throughput = elapsed > 0 ? this.throughputCount / elapsed : 0;

        return {
            name: this.name,
            enabled: this.config.enabled,
            health: this.getHealth(),
            avgLatencyMs: this.calculateAvgLatency(),
            throughput,
        };
    }

    /**
     * Check if a log entry should be processed by this transport
     */
    shouldProcess(entry: LogEntry): boolean {
        if (!this.enabled) return false;

        const entryLevel = LOG_LEVEL_VALUES[entry.level];
        const minLevel = LOG_LEVEL_VALUES[this.config.minLevel];

        if (entryLevel < minLevel) return false;

        if (this.config.maxLevel) {
            const maxLevel = LOG_LEVEL_VALUES[this.config.maxLevel];
            if (entryLevel > maxLevel) return false;
        }

        // Apply sampling
        if (this.config.samplingRate !== undefined && this.config.samplingRate < 1) {
            if (Math.random() > this.config.samplingRate) {
                return false;
            }
        }

        return true;
    }

    /**
     * Log an entry. This is the main entry point for sending logs.
     */
    async log(entry: LogEntry): Promise<void> {
        if (!this.shouldProcess(entry)) return;

        const startTime = Date.now();

        try {
            await this.doLog(entry);
            this.recordSuccess(startTime);
        } catch (error) {
            this.recordFailure(error);
            await this.handleError(entry, error);
        }
    }

    /**
     * Log multiple entries in batch
     */
    async logBatch(entries: LogEntry[]): Promise<void> {
        const filteredEntries = entries.filter((e) => this.shouldProcess(e));
        if (filteredEntries.length === 0) return;

        const startTime = Date.now();

        try {
            await this.doLogBatch(filteredEntries);
            this.recordSuccess(startTime, filteredEntries.length);
        } catch (error) {
            this.recordFailure(error, filteredEntries.length);
            await this.handleBatchError(filteredEntries, error);
        }
    }

    /**
     * Flush any buffered logs
     */
    async flush(): Promise<void> {
        // Override in subclasses if buffering is used
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        await this.flush();
    }

    /**
     * Abstract method: Implement actual log sending in subclasses
     */
    protected abstract doLog(entry: LogEntry): Promise<void>;

    /**
     * Batch logging implementation. Default: send one by one
     */
    protected async doLogBatch(entries: LogEntry[]): Promise<void> {
        for (const entry of entries) {
            await this.doLog(entry);
        }
    }

    /**
     * Handle error for a single log entry
     */
    protected async handleError(entry: LogEntry, error: unknown): Promise<void> {
        // Default: just record the failure. Override for retry logic.
        const message = error instanceof Error ? error.message : String(error);
        this.updateHealthOnError(message);
    }

    /**
     * Handle error for batch logging
     */
    protected async handleBatchError(entries: LogEntry[], error: unknown): Promise<void> {
        const message = error instanceof Error ? error.message : String(error);
        this.updateHealthOnError(message);
    }

    /**
     * Record successful log transmission
     */
    protected recordSuccess(startTime: number, count = 1): void {
        const latency = Date.now() - startTime;
        this.latencies.push(latency);
        if (this.latencies.length > 100) {
            this.latencies.shift();
        }

        this.health.successCount += count;
        this.health.consecutiveFailures = 0;
        this.health.healthy = true;
        this.health.lastSuccessTime = new Date();

        this.throughputCount += count;
    }

    /**
     * Record failed log transmission
     */
    protected recordFailure(error: unknown, count = 1): void {
        this.health.failureCount += count;
        this.health.consecutiveFailures += 1;
        this.health.lastErrorTime = new Date();
        this.health.lastError = error instanceof Error ? error.message : String(error);

        // Mark as unhealthy after 5 consecutive failures
        if (this.health.consecutiveFailures >= 5) {
            this.health.healthy = false;
        }
    }

    /**
     * Update health status on error
     */
    protected updateHealthOnError(message: string): void {
        this.health.lastError = message;
        this.health.lastErrorTime = new Date();
    }

    /**
     * Calculate average latency from rolling window
     */
    protected calculateAvgLatency(): number {
        if (this.latencies.length === 0) return 0;
        const sum = this.latencies.reduce((a, b) => a + b, 0);
        return sum / this.latencies.length;
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    protected calculateRetryDelay(attempt: number): number {
        const baseDelay = this.config.retry?.backoffMs || 1000;
        const maxDelay = 30000; // 30 seconds max
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        // Add jitter (±10%)
        const jitter = delay * 0.1 * (Math.random() * 2 - 1);
        return delay + jitter;
    }

    /**
     * Sleep utility for retry delays
     */
    protected sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Retry an operation with exponential backoff
     */
    protected async withRetry<T>(
        operation: () => Promise<T>,
        maxRetries?: number
    ): Promise<T> {
        const retries = maxRetries ?? this.config.retry?.maxRetries ?? 3;
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < retries) {
                    const delay = this.calculateRetryDelay(attempt);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError;
    }
}

/**
 * Factory function type for creating transports
 */
export type TransportFactory = (config: TransportConfig) => BaseTransport;

/**
 * Transport registry for dynamic transport creation
 */
export class TransportRegistry {
    private factories = new Map<string, TransportFactory>();

    /**
     * Register a transport factory
     */
    register(name: string, factory: TransportFactory): void {
        this.factories.set(name, factory);
    }

    /**
     * Create a transport by name
     */
    create(config: TransportConfig): BaseTransport | undefined {
        const factory = this.factories.get(config.name);
        if (!factory) return undefined;
        return factory(config);
    }

    /**
     * Get registered transport names
     */
    getRegisteredNames(): string[] {
        return Array.from(this.factories.keys());
    }
}

/**
 * Global transport registry instance
 */
export const transportRegistry = new TransportRegistry();
