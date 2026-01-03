/**
 * Logger Configuration
 *
 * Centralized configuration for the enterprise logging system.
 * Supports environment variables for flexible deployment configuration.
 */

import type { LogLevel, TransportConfig } from '@/types/log-entry';
import { LOG_LEVEL_VALUES } from '@/types/log-entry';

/**
 * Complete logger configuration structure
 */
export interface LoggerConfig {
    /** Minimum log level to output */
    minLevel: LogLevel;

    /** Output format */
    format: 'json' | 'pretty';

    /** Service name for identification */
    serviceName: string;

    /** Current environment */
    environment: string;

    /** Application version */
    version: string;

    /** Enabled transports */
    transports: TransportConfig[];

    /** Sampling configuration */
    sampling: SamplingConfig;

    /** Redaction configuration */
    redaction: RedactionConfig;

    /** Feature flags for gradual rollout */
    features: LoggerFeatureFlags;

    /** Buffering configuration */
    buffer: BufferConfig;
}

/**
 * Sampling configuration per log level
 */
export interface SamplingConfig {
    /** Default sampling rate (0-1) */
    defaultRate: number;

    /** Per-level sampling rates */
    levelRates: Partial<Record<LogLevel, number>>;

    /** Always log first N errors before sampling */
    burstAllowance: number;

    /** Rate limit per component (logs per second) */
    rateLimitPerSecond: number;
}

/**
 * Redaction/PII protection configuration
 */
export interface RedactionConfig {
    /** Whether to enable PII redaction */
    enabled: boolean;

    /** Redaction mode */
    mode: 'mask' | 'hash' | 'remove';

    /** Additional sensitive field patterns (regex strings) */
    additionalPatterns: string[];

    /** Whether to anonymize IP addresses */
    anonymizeIp: boolean;

    /** Hash algorithm for 'hash' mode */
    hashAlgorithm: 'sha256' | 'sha512';
}

/**
 * Feature flags for gradual rollout
 */
export interface LoggerFeatureFlags {
    /** Enable new logger system */
    enableNewLogger: boolean;

    /** Enable Sentry integration */
    enableSentry: boolean;

    /** Enable DataDog integration */
    enableDataDog: boolean;

    /** Enable CloudWatch integration */
    enableCloudWatch: boolean;

    /** Enable performance monitoring */
    enablePerformanceMonitoring: boolean;

    /** Enable audit logging */
    enableAuditLogging: boolean;

    /** Enable security event logging */
    enableSecurityLogging: boolean;

    /** Enable client-side logging */
    enableClientLogging: boolean;
}

/**
 * Buffer configuration for batching
 */
export interface BufferConfig {
    /** Maximum buffer size before forced flush */
    maxSize: number;

    /** Flush interval in milliseconds */
    flushIntervalMs: number;

    /** Maximum entries in retry queue */
    maxRetryQueueSize: number;

    /** Maximum retries for failed transmissions */
    maxRetries: number;

    /** Base backoff time in milliseconds */
    baseBackoffMs: number;
}

/**
 * Default base configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
    minLevel: 'info',
    format: 'json',
    serviceName: 'synergyflow-erp',
    environment: 'development',
    version: '3.0.0',
    transports: [],
    sampling: {
        defaultRate: 1.0,
        levelRates: {
            trace: 0.1,
            debug: 0.25,
            info: 0.5,
            warn: 1.0,
            error: 1.0,
            fatal: 1.0,
        },
        burstAllowance: 10,
        rateLimitPerSecond: 1000,
    },
    redaction: {
        enabled: true,
        mode: 'mask',
        additionalPatterns: [],
        anonymizeIp: true,
        hashAlgorithm: 'sha256',
    },
    features: {
        enableNewLogger: true,
        enableSentry: false,
        enableDataDog: false,
        enableCloudWatch: false,
        enablePerformanceMonitoring: false,
        enableAuditLogging: false,
        enableSecurityLogging: false,
        enableClientLogging: false,
    },
    buffer: {
        maxSize: 100,
        flushIntervalMs: 5000,
        maxRetryQueueSize: 10000,
        maxRetries: 3,
        baseBackoffMs: 1000,
    },
};

/**
 * Parse log level from string
 */
function parseLogLevel(value: string | undefined, fallback: LogLevel): LogLevel {
    if (!value) return fallback;
    const normalized = value.toLowerCase() as LogLevel;
    if (normalized in LOG_LEVEL_VALUES) {
        return normalized;
    }
    return fallback;
}

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) return fallback;
    return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse number from environment variable
 */
function parseNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse transports from comma-separated string
 */
function parseTransports(value: string | undefined): TransportConfig[] {
    if (!value) {
        // Default transports based on environment
        return [
            {
                name: 'console',
                enabled: true,
                minLevel: 'debug',
            },
        ];
    }

    return value.split(',').map((name) => ({
        name: name.trim(),
        enabled: true,
        minLevel: 'info' as LogLevel,
    }));
}

/**
 * Build configuration from environment variables
 */
export function buildConfig(): LoggerConfig {
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';

    return {
        minLevel: parseLogLevel(
            process.env.LOG_LEVEL,
            isDev ? 'debug' : 'info'
        ),
        format: (process.env.LOG_FORMAT as 'json' | 'pretty') || (isDev ? 'pretty' : 'json'),
        serviceName: process.env.SERVICE_NAME || DEFAULT_CONFIG.serviceName,
        environment: process.env.NODE_ENV || DEFAULT_CONFIG.environment,
        version: process.env.APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || DEFAULT_CONFIG.version,
        transports: parseTransports(process.env.LOG_TRANSPORTS),
        sampling: {
            defaultRate: parseNumber(process.env.LOG_SAMPLING_RATE, isProd ? 0.5 : 1.0),
            levelRates: {
                trace: parseNumber(process.env.LOG_SAMPLE_TRACE, 0.1),
                debug: parseNumber(process.env.LOG_SAMPLE_DEBUG, isDev ? 1.0 : 0.25),
                info: parseNumber(process.env.LOG_SAMPLE_INFO, 0.5),
                warn: 1.0,
                error: 1.0,
                fatal: 1.0,
            },
            burstAllowance: parseNumber(process.env.LOG_BURST_ALLOWANCE, 10),
            rateLimitPerSecond: parseNumber(process.env.LOG_RATE_LIMIT, 1000),
        },
        redaction: {
            enabled: parseBoolean(process.env.LOG_REDACTION_ENABLED, true),
            mode: (process.env.LOG_REDACTION_MODE as 'mask' | 'hash' | 'remove') || 'mask',
            additionalPatterns: process.env.LOG_REDACTION_PATTERNS?.split(',') || [],
            anonymizeIp: parseBoolean(process.env.LOG_ANONYMIZE_IP, isProd),
            hashAlgorithm: (process.env.LOG_HASH_ALGORITHM as 'sha256' | 'sha512') || 'sha256',
        },
        features: {
            enableNewLogger: parseBoolean(process.env.ENABLE_NEW_LOGGER, true),
            enableSentry: parseBoolean(process.env.ENABLE_SENTRY, false),
            enableDataDog: parseBoolean(process.env.ENABLE_DATADOG, false),
            enableCloudWatch: parseBoolean(process.env.ENABLE_CLOUDWATCH, false),
            enablePerformanceMonitoring: parseBoolean(process.env.ENABLE_PERFORMANCE_MONITORING, false),
            enableAuditLogging: parseBoolean(process.env.ENABLE_AUDIT_LOGGING, false),
            enableSecurityLogging: parseBoolean(process.env.ENABLE_SECURITY_LOGGING, false),
            enableClientLogging: parseBoolean(process.env.ENABLE_CLIENT_LOGGING, isDev),
        },
        buffer: {
            maxSize: parseNumber(process.env.LOG_BUFFER_SIZE, 100),
            flushIntervalMs: parseNumber(process.env.LOG_FLUSH_INTERVAL, 5000),
            maxRetryQueueSize: parseNumber(process.env.LOG_MAX_RETRY_QUEUE, 10000),
            maxRetries: parseNumber(process.env.LOG_MAX_RETRIES, 3),
            baseBackoffMs: parseNumber(process.env.LOG_BACKOFF_MS, 1000),
        },
    };
}

/**
 * Singleton configuration instance
 */
let configInstance: LoggerConfig | null = null;

/**
 * Get the current logger configuration
 * Builds from environment on first call, then caches
 */
export function getLoggerConfig(): LoggerConfig {
    if (!configInstance) {
        configInstance = buildConfig();
    }
    return configInstance;
}

/**
 * Update logger configuration at runtime
 * Useful for admin API adjustments
 */
export function updateLoggerConfig(updates: Partial<LoggerConfig>): LoggerConfig {
    configInstance = {
        ...getLoggerConfig(),
        ...updates,
    };
    return configInstance;
}

/**
 * Reset configuration to rebuild from environment
 * Useful for testing or dynamic reconfiguration
 */
export function resetLoggerConfig(): void {
    configInstance = null;
}

/**
 * Check if a log level should be output based on current config
 */
export function shouldLog(level: LogLevel): boolean {
    const config = getLoggerConfig();
    return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[config.minLevel];
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof LoggerFeatureFlags): boolean {
    return getLoggerConfig().features[feature];
}
