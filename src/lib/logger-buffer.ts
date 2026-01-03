/**
 * Logger Buffer
 *
 * In-memory circular buffer with batching and overflow protection
 * for log entries. Ensures logs are not lost during high-traffic
 * scenarios while maintaining memory bounds.
 */

import type { LogEntry } from '@/types/log-entry';
import { getLoggerConfig } from './logger-config';

/**
 * Buffer statistics
 */
export interface BufferStats {
    /** Current buffer size */
    size: number;

    /** Maximum buffer size */
    maxSize: number;

    /** Number of entries dropped due to overflow */
    droppedCount: number;

    /** Number of entries in retry queue */
    retryQueueSize: number;

    /** Last flush time */
    lastFlushTime?: Date;

    /** Total entries flushed */
    totalFlushed: number;
}

/**
 * Retry queue entry
 */
interface RetryEntry {
    entry: LogEntry;
    attempts: number;
    nextRetryTime: number;
}

/**
 * Logger buffer implementation
 */
export class LoggerBuffer {
    private buffer: LogEntry[] = [];
    private retryQueue: RetryEntry[] = [];
    private maxSize: number;
    private maxRetryQueueSize: number;
    private maxRetries: number;
    private baseBackoffMs: number;
    private droppedCount = 0;
    private totalFlushed = 0;
    private lastFlushTime?: Date;
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private onFlush: (entries: LogEntry[]) => Promise<void>;
    private isShuttingDown = false;

    constructor(
        onFlush: (entries: LogEntry[]) => Promise<void>,
        options?: {
            maxSize?: number;
            flushIntervalMs?: number;
            maxRetryQueueSize?: number;
            maxRetries?: number;
            baseBackoffMs?: number;
        }
    ) {
        const config = getLoggerConfig();

        this.onFlush = onFlush;
        this.maxSize = options?.maxSize ?? config.buffer.maxSize;
        this.maxRetryQueueSize = options?.maxRetryQueueSize ?? config.buffer.maxRetryQueueSize;
        this.maxRetries = options?.maxRetries ?? config.buffer.maxRetries;
        this.baseBackoffMs = options?.baseBackoffMs ?? config.buffer.baseBackoffMs;

        const flushInterval = options?.flushIntervalMs ?? config.buffer.flushIntervalMs;

        // Start automatic flush timer
        this.flushTimer = setInterval(() => {
            this.flush().catch((err) => {
                console.error('LoggerBuffer: Flush failed', err);
            });
        }, flushInterval);

        // Handle process exit
        this.setupGracefulShutdown();
    }

    /**
     * Add a log entry to the buffer
     */
    add(entry: LogEntry): void {
        if (this.isShuttingDown) return;

        if (this.buffer.length >= this.maxSize) {
            // Drop oldest entry (circular buffer behavior)
            this.buffer.shift();
            this.droppedCount++;
        }

        this.buffer.push(entry);
    }

    /**
     * Add multiple entries to the buffer
     */
    addBatch(entries: LogEntry[]): void {
        for (const entry of entries) {
            this.add(entry);
        }
    }

    /**
     * Flush the buffer
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0 && this.retryQueue.length === 0) return;

        // Process retry queue first
        await this.processRetryQueue();

        if (this.buffer.length === 0) return;

        const entries = [...this.buffer];
        this.buffer = [];

        try {
            await this.onFlush(entries);
            this.totalFlushed += entries.length;
            this.lastFlushTime = new Date();
        } catch (error) {
            // Add failed entries to retry queue
            this.addToRetryQueue(entries);
        }
    }

    /**
     * Process entries in the retry queue
     */
    private async processRetryQueue(): Promise<void> {
        const now = Date.now();
        const readyEntries: RetryEntry[] = [];
        const remainingEntries: RetryEntry[] = [];

        for (const retryEntry of this.retryQueue) {
            if (retryEntry.nextRetryTime <= now) {
                readyEntries.push(retryEntry);
            } else {
                remainingEntries.push(retryEntry);
            }
        }

        this.retryQueue = remainingEntries;

        if (readyEntries.length === 0) return;

        const entries = readyEntries.map((r) => r.entry);

        try {
            await this.onFlush(entries);
            this.totalFlushed += entries.length;
        } catch {
            // Re-add to retry queue with incremented attempt count
            for (const retryEntry of readyEntries) {
                if (retryEntry.attempts < this.maxRetries) {
                    this.addToRetryQueueSingle(retryEntry.entry, retryEntry.attempts + 1);
                } else {
                    // Max retries exceeded, drop the entry
                    this.droppedCount++;
                }
            }
        }
    }

    /**
     * Add entries to retry queue
     */
    private addToRetryQueue(entries: LogEntry[]): void {
        for (const entry of entries) {
            this.addToRetryQueueSingle(entry, 1);
        }
    }

    /**
     * Add single entry to retry queue
     */
    private addToRetryQueueSingle(entry: LogEntry, attempts: number): void {
        if (this.retryQueue.length >= this.maxRetryQueueSize) {
            // Drop oldest retry entry
            this.retryQueue.shift();
            this.droppedCount++;
        }

        const backoffMs = this.calculateBackoff(attempts);
        this.retryQueue.push({
            entry,
            attempts,
            nextRetryTime: Date.now() + backoffMs,
        });
    }

    /**
     * Calculate backoff time with exponential growth and jitter
     */
    private calculateBackoff(attempt: number): number {
        const maxBackoff = 30000; // 30 seconds
        const baseBackoff = Math.min(this.baseBackoffMs * Math.pow(2, attempt - 1), maxBackoff);
        // Add 10% jitter
        const jitter = baseBackoff * 0.1 * (Math.random() * 2 - 1);
        return baseBackoff + jitter;
    }

    /**
     * Get buffer statistics
     */
    getStats(): BufferStats {
        return {
            size: this.buffer.length,
            maxSize: this.maxSize,
            droppedCount: this.droppedCount,
            retryQueueSize: this.retryQueue.length,
            lastFlushTime: this.lastFlushTime,
            totalFlushed: this.totalFlushed,
        };
    }

    /**
     * Get current buffer size
     */
    size(): number {
        return this.buffer.length;
    }

    /**
     * Check if buffer is empty
     */
    isEmpty(): boolean {
        return this.buffer.length === 0 && this.retryQueue.length === 0;
    }

    /**
     * Clear the buffer (for testing)
     */
    clear(): void {
        this.buffer = [];
        this.retryQueue = [];
    }

    /**
     * Set up graceful shutdown handlers
     */
    private setupGracefulShutdown(): void {
        const shutdown = async () => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;

            if (this.flushTimer) {
                clearInterval(this.flushTimer);
                this.flushTimer = null;
            }

            try {
                await this.flush();
            } catch (err) {
                console.error('LoggerBuffer: Final flush failed', err);
            }
        };

        // Only set up handlers in Node.js environment
        if (typeof process !== 'undefined' && process.on) {
            process.on('beforeExit', shutdown);
            process.on('SIGTERM', shutdown);
            process.on('SIGINT', shutdown);
        }
    }

    /**
     * Shutdown the buffer (call before process exit)
     */
    async shutdown(): Promise<void> {
        this.isShuttingDown = true;

        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        await this.flush();
    }
}

/**
 * Singleton buffer instance
 */
let bufferInstance: LoggerBuffer | null = null;

/**
 * Get or create the global logger buffer
 */
export function getLoggerBuffer(
    onFlush: (entries: LogEntry[]) => Promise<void>
): LoggerBuffer {
    if (!bufferInstance) {
        bufferInstance = new LoggerBuffer(onFlush);
    }
    return bufferInstance;
}

/**
 * Reset the buffer (for testing)
 */
export function resetLoggerBuffer(): void {
    if (bufferInstance) {
        bufferInstance.clear();
        bufferInstance = null;
    }
}
