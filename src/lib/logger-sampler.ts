/**
 * Logger Sampler
 *
 * Implements log sampling and rate limiting to prevent log flooding
 * in high-traffic scenarios while ensuring critical logs are not lost.
 */

import type { LogEntry, LogLevel } from '@/types/log-entry';
import { LOG_LEVEL_VALUES } from '@/types/log-entry';
import { getLoggerConfig } from './logger-config';

/**
 * Sampler statistics
 */
export interface SamplerStats {
    /** Total entries received */
    totalReceived: number;

    /** Total entries sampled (kept) */
    totalSampled: number;

    /** Total entries dropped by sampling */
    droppedBySampling: number;

    /** Total entries dropped by rate limiting */
    droppedByRateLimit: number;

    /** Current sampling rates by level */
    currentRates: Record<LogLevel, number>;
}

/**
 * Token bucket for rate limiting
 */
interface TokenBucket {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number; // tokens per second
}

/**
 * Logger sampler implementation
 */
export class LoggerSampler {
    private stats: SamplerStats;
    private buckets = new Map<string, TokenBucket>();
    private errorBurstCounts = new Map<string, number>();
    private errorBurstResetTime = new Map<string, number>();
    private burstAllowance: number;
    private rateLimitPerSecond: number;
    private levelRates: Record<LogLevel, number>;

    constructor(options?: {
        burstAllowance?: number;
        rateLimitPerSecond?: number;
        levelRates?: Partial<Record<LogLevel, number>>;
    }) {
        const config = getLoggerConfig();

        this.burstAllowance = options?.burstAllowance ?? config.sampling.burstAllowance;
        this.rateLimitPerSecond = options?.rateLimitPerSecond ?? config.sampling.rateLimitPerSecond;

        this.levelRates = {
            trace: options?.levelRates?.trace ?? config.sampling.levelRates.trace ?? 0.1,
            debug: options?.levelRates?.debug ?? config.sampling.levelRates.debug ?? 0.25,
            info: options?.levelRates?.info ?? config.sampling.levelRates.info ?? 0.5,
            warn: options?.levelRates?.warn ?? config.sampling.levelRates.warn ?? 1.0,
            error: options?.levelRates?.error ?? config.sampling.levelRates.error ?? 1.0,
            fatal: options?.levelRates?.fatal ?? config.sampling.levelRates.fatal ?? 1.0,
        };

        this.stats = {
            totalReceived: 0,
            totalSampled: 0,
            droppedBySampling: 0,
            droppedByRateLimit: 0,
            currentRates: { ...this.levelRates },
        };
    }

    /**
     * Determine if a log entry should be sampled (kept)
     * Returns true if the entry should be logged, false if it should be dropped
     */
    shouldSample(level: LogLevel, context?: any): boolean {
        this.stats.totalReceived++;

        // Always log fatal errors
        if (level === 'fatal') {
            this.stats.totalSampled++;
            return true;
        }

        // Apply burst allowance for errors
        if (level === 'error') {
            const key = this.getErrorKeyFromParams(level, context);
            if (this.checkBurstAllowance(key)) {
                this.stats.totalSampled++;
                return true;
            }
        }

        // Check rate limiting
        const componentKey = context?.component || 'default';
        if (!this.checkRateLimit(componentKey)) {
            this.stats.droppedByRateLimit++;
            return false;
        }

        // Apply level-based sampling
        const rate = this.levelRates[level];
        if (Math.random() > rate) {
            this.stats.droppedBySampling++;
            return false;
        }

        this.stats.totalSampled++;
        return true;
    }

    /**
     * Get a unique key for error deduplication from parameters
     */
    private getErrorKeyFromParams(level: LogLevel, context?: any): string {
        const parts = [
            context?.component || 'unknown',
            context?.action || 'unknown',
            'Error',
            '',
        ];
        return parts.join(':');
    }

    /**
     * Sample a batch of entries
     * Returns the entries that should be logged
     */
    sampleBatch(entries: LogEntry[]): LogEntry[] {
        return entries.filter((entry) => this.shouldSample(entry.level, entry.context));
    }

    /**
     * Get a unique key for error deduplication
     */
    private getErrorKey(entry: LogEntry): string {
        const parts = [
            entry.context?.component || 'unknown',
            entry.context?.action || 'unknown',
            entry.error?.name || 'Error',
            entry.error?.message?.slice(0, 50) || '',
        ];
        return parts.join(':');
    }

    /**
     * Check if an error qualifies for burst allowance
     * Returns true if this error type hasn't exceeded burst limit
     */
    private checkBurstAllowance(errorKey: string): boolean {
        const now = Date.now();
        const resetTime = this.errorBurstResetTime.get(errorKey) || 0;

        // Reset burst count every minute
        if (now > resetTime) {
            this.errorBurstCounts.set(errorKey, 0);
            this.errorBurstResetTime.set(errorKey, now + 60000);
        }

        const count = this.errorBurstCounts.get(errorKey) || 0;

        if (count < this.burstAllowance) {
            this.errorBurstCounts.set(errorKey, count + 1);
            return true;
        }

        return false;
    }

    /**
     * Check rate limiting using token bucket algorithm
     */
    private checkRateLimit(key: string): boolean {
        const bucket = this.getOrCreateBucket(key);
        const now = Date.now();

        // Refill tokens based on time elapsed
        const elapsed = (now - bucket.lastRefill) / 1000;
        bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + elapsed * bucket.refillRate);
        bucket.lastRefill = now;

        // Check if we have a token
        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            return true;
        }

        return false;
    }

    /**
     * Get or create a token bucket for a key
     */
    private getOrCreateBucket(key: string): TokenBucket {
        let bucket = this.buckets.get(key);

        if (!bucket) {
            bucket = {
                tokens: this.rateLimitPerSecond,
                lastRefill: Date.now(),
                maxTokens: this.rateLimitPerSecond * 2, // Allow burst up to 2x
                refillRate: this.rateLimitPerSecond,
            };
            this.buckets.set(key, bucket);
        }

        return bucket;
    }

    /**
     * Update sampling rate for a specific level
     */
    setLevelRate(level: LogLevel, rate: number): void {
        this.levelRates[level] = Math.max(0, Math.min(1, rate));
        this.stats.currentRates[level] = this.levelRates[level];
    }

    /**
     * Update rate limit
     */
    setRateLimit(ratePerSecond: number): void {
        this.rateLimitPerSecond = ratePerSecond;
        // Update existing buckets
        for (const bucket of this.buckets.values()) {
            bucket.maxTokens = ratePerSecond * 2;
            bucket.refillRate = ratePerSecond;
        }
    }

    /**
     * Get current statistics
     */
    getStats(): SamplerStats {
        return { ...this.stats };
    }

    /**
     * Get current drop rate (percentage of logs being dropped)
     */
    getDropRate(): number {
        if (this.stats.totalReceived === 0) return 0;
        const dropped = this.stats.droppedBySampling + this.stats.droppedByRateLimit;
        return dropped / this.stats.totalReceived;
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            totalReceived: 0,
            totalSampled: 0,
            droppedBySampling: 0,
            droppedByRateLimit: 0,
            currentRates: { ...this.levelRates },
        };
    }

    /**
     * Clear all state (for testing)
     */
    clear(): void {
        this.buckets.clear();
        this.errorBurstCounts.clear();
        this.errorBurstResetTime.clear();
        this.resetStats();
    }
}

/**
 * Singleton sampler instance
 */
let samplerInstance: LoggerSampler | null = null;

/**
 * Get or create the global logger sampler
 */
export function getLoggerSampler(): LoggerSampler {
    if (!samplerInstance) {
        samplerInstance = new LoggerSampler();
    }
    return samplerInstance;
}

/**
 * Reset the sampler (for testing)
 */
export function resetLoggerSampler(): void {
    if (samplerInstance) {
        samplerInstance.clear();
    }
    samplerInstance = null;
}

/**
 * Adaptive sampling based on system load
 * Reduces sampling rates when system is under high load
 */
export class AdaptiveSampler extends LoggerSampler {
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private baseRates: Record<LogLevel, number>;

    constructor(options?: ConstructorParameters<typeof LoggerSampler>[0]) {
        super(options);

        this.baseRates = { ...this.getStats().currentRates };

        // Check system load periodically and adjust rates
        this.checkInterval = setInterval(() => {
            this.adjustRates();
        }, 10000); // Every 10 seconds
    }

    /**
     * Adjust sampling rates based on current drop rate
     */
    private adjustRates(): void {
        const dropRate = this.getDropRate();

        if (dropRate > 0.5) {
            // Increase sampling (reduce logged entries) when drop rate is high
            this.applyMultiplier(0.8);
        } else if (dropRate < 0.1 && this.canIncreaseSampling()) {
            // Decrease sampling (log more) when drop rate is low
            this.applyMultiplier(1.1);
        }
    }

    /**
     * Apply a multiplier to current rates
     */
    private applyMultiplier(multiplier: number): void {
        const levels: LogLevel[] = ['trace', 'debug', 'info'];

        for (const level of levels) {
            const baseRate = this.baseRates[level];
            const currentStats = this.getStats();
            const currentRate = currentStats.currentRates[level];

            // Don't go below 10% of base rate or above 100%
            const newRate = Math.max(
                baseRate * 0.1,
                Math.min(1.0, currentRate * multiplier)
            );

            this.setLevelRate(level, newRate);
        }
    }

    /**
     * Check if we can increase sampling rates
     */
    private canIncreaseSampling(): boolean {
        const stats = this.getStats();
        const rates = stats.currentRates;

        // Can increase if any rate is below its base rate
        return (
            rates.trace < this.baseRates.trace ||
            rates.debug < this.baseRates.debug ||
            rates.info < this.baseRates.info
        );
    }

    /**
     * Cleanup
     */
    shutdown(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}
