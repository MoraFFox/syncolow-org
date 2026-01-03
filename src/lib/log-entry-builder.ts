/**
 * Log Entry Builder
 *
 * Provides a fluent builder pattern for constructing consistent,
 * structured log entries with proper validation and enrichment.
 */

import type {
    LogEntry,
    LogLevel,
    LogContext,
    LogError,
    LogMetrics,
    LogBreadcrumb,
    ErrorCategory,
} from '@/types/log-entry';
import { getLoggerConfig } from './logger-config';
import { getCorrelationId, getTraceContext } from './correlation-context';

/**
 * Builder class for constructing LogEntry objects
 */
export class LogEntryBuilder {
    private entry: Partial<LogEntry>;

    constructor() {
        const config = getLoggerConfig();
        const traceContext = getTraceContext();

        this.entry = {
            timestamp: new Date().toISOString(),
            service: config.serviceName,
            environment: config.environment,
            version: config.version,
            correlationId: getCorrelationId(),
            traceId: traceContext?.traceId,
            spanId: traceContext?.spanId,
            context: {},
        };
    }

    /**
     * Set the log level
     */
    level(level: LogLevel): this {
        this.entry.level = level;
        return this;
    }

    /**
     * Set the log message
     */
    message(message: string): this {
        this.entry.message = message;
        return this;
    }

    /**
     * Set the component that generated the log
     */
    component(component: string): this {
        this.entry.context = {
            ...this.entry.context,
            component,
        };
        return this;
    }

    /**
     * Set the action being performed
     */
    action(action: string): this {
        this.entry.context = {
            ...this.entry.context,
            action,
        };
        return this;
    }

    /**
     * Set user context
     */
    user(userId: string, sessionId?: string): this {
        this.entry.context = {
            ...this.entry.context,
            userId,
            sessionId,
        };
        return this;
    }

    /**
     * Set HTTP request context
     */
    http(method: LogContext['method'], route: string, statusCode?: number): this {
        this.entry.context = {
            ...this.entry.context,
            method,
            route,
            statusCode,
        };
        return this;
    }

    /**
     * Set client information
     */
    client(ipAddress: string, userAgent?: string): this {
        const config = getLoggerConfig();

        // Anonymize IP if configured
        const processedIp = config.redaction.anonymizeIp
            ? anonymizeIpAddress(ipAddress)
            : ipAddress;

        this.entry.context = {
            ...this.entry.context,
            ipAddress: processedIp,
            userAgent,
        };
        return this;
    }

    /**
     * Add operation duration
     */
    duration(durationMs: number): this {
        this.entry.context = {
            ...this.entry.context,
            duration: durationMs,
        };
        if (!this.entry.metrics) {
            this.entry.metrics = {};
        }
        this.entry.metrics.durationMs = durationMs;
        return this;
    }

    /**
     * Add custom data to context
     */
    data(data: Record<string, unknown>): this {
        this.entry.context = {
            ...this.entry.context,
            data: {
                ...this.entry.context?.data,
                ...data,
            },
        };
        return this;
    }

    /**
     * Add tags for filtering
     */
    tags(tags: Record<string, string>): this {
        this.entry.context = {
            ...this.entry.context,
            tags: {
                ...this.entry.context?.tags,
                ...tags,
            },
        };
        return this;
    }

    /**
     * Add a single tag
     */
    tag(key: string, value: string): this {
        return this.tags({ [key]: value });
    }

    /**
     * Add error information
     */
    error(error: Error | unknown, options: ErrorOptions = {}): this {
        this.entry.error = buildLogError(error, options);

        // Automatically set level to error if not already set
        if (!this.entry.level) {
            this.entry.level = 'error';
        }

        return this;
    }

    /**
     * Add performance metrics
     */
    metrics(metrics: LogMetrics): this {
        this.entry.metrics = {
            ...this.entry.metrics,
            ...metrics,
        };
        return this;
    }

    /**
     * Add a breadcrumb
     */
    breadcrumb(breadcrumb: Omit<LogBreadcrumb, 'timestamp'>): this {
        const fullBreadcrumb: LogBreadcrumb = {
            ...breadcrumb,
            timestamp: new Date().toISOString(),
        };

        this.entry.context = {
            ...this.entry.context,
            breadcrumbs: [
                ...(this.entry.context?.breadcrumbs || []),
                fullBreadcrumb,
            ].slice(-10), // Keep last 10 breadcrumbs
        };
        return this;
    }

    /**
     * Override correlation ID
     */
    correlationId(id: string): this {
        this.entry.correlationId = id;
        return this;
    }

    /**
     * Set trace context manually
     */
    trace(traceId: string, spanId?: string): this {
        this.entry.traceId = traceId;
        if (spanId) {
            this.entry.spanId = spanId;
        }
        return this;
    }

    /**
     * Merge full context object
     */
    context(context: LogContext): this {
        this.entry.context = {
            ...this.entry.context,
            ...context,
        };
        return this;
    }

    /**
     * Build and validate the log entry
     */
    build(): LogEntry {
        // Validate required fields
        if (!this.entry.level) {
            throw new Error('Log entry must have a level');
        }
        if (!this.entry.message) {
            throw new Error('Log entry must have a message');
        }

        // Clean up empty context
        if (this.entry.context && Object.keys(this.entry.context).length === 0) {
            delete this.entry.context;
        }

        return this.entry as LogEntry;
    }
}

/**
 * Options for error building
 */
interface ErrorOptions {
    category?: ErrorCategory;
    impact?: LogError['impact'];
    isRecoverable?: boolean;
    code?: string;
}

/**
 * Build LogError from Error object or unknown
 */
function buildLogError(error: Error | unknown, options: ErrorOptions = {}): LogError {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            category: options.category || categorizeError(error),
            impact: options.impact || assessImpact(error),
            isRecoverable: options.isRecoverable ?? isRecoverableError(error),
            code: options.code,
            cause: error.cause instanceof Error ? buildLogError(error.cause) : undefined,
        };
    }

    // Handle non-Error objects
    return {
        name: 'UnknownError',
        message: String(error),
        category: options.category || 'UnknownError',
        impact: options.impact || 'medium',
        isRecoverable: options.isRecoverable ?? false,
        code: options.code,
    };
}

/**
 * Attempt to categorize an error based on its properties
 */
function categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (
        name.includes('fetch') ||
        name.includes('network') ||
        message.includes('network') ||
        message.includes('connection refused') ||
        message.includes('econnrefused') ||
        message.includes('timeout')
    ) {
        return message.includes('timeout') ? 'TimeoutError' : 'NetworkError';
    }

    // Database errors
    if (
        name.includes('database') ||
        name.includes('postgres') ||
        name.includes('supabase') ||
        message.includes('database') ||
        message.includes('query') ||
        message.includes('relation')
    ) {
        return 'DatabaseError';
    }

    // Validation errors
    if (
        name.includes('validation') ||
        name.includes('zod') ||
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('required')
    ) {
        return 'ValidationError';
    }

    // Authentication errors
    if (
        name.includes('auth') ||
        message.includes('unauthorized') ||
        message.includes('unauthenticated') ||
        message.includes('not authenticated') ||
        message.includes('invalid token')
    ) {
        return 'AuthenticationError';
    }

    // Authorization errors
    if (
        message.includes('forbidden') ||
        message.includes('not authorized') ||
        message.includes('permission denied') ||
        message.includes('access denied')
    ) {
        return 'AuthorizationError';
    }

    // Rate limit errors
    if (
        message.includes('rate limit') ||
        message.includes('too many requests') ||
        message.includes('throttl')
    ) {
        return 'RateLimitError';
    }

    return 'UnknownError';
}

/**
 * Assess the impact of an error
 */
function assessImpact(error: Error): LogError['impact'] {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Critical: payment, security, data loss
    if (
        message.includes('payment') ||
        message.includes('security') ||
        message.includes('data loss') ||
        message.includes('corruption') ||
        name.includes('critical')
    ) {
        return 'critical';
    }

    // High: authentication, database, production
    if (
        message.includes('database') ||
        message.includes('authentication') ||
        message.includes('connection failed')
    ) {
        return 'high';
    }

    // Low: validation, user input
    if (
        message.includes('validation') ||
        message.includes('invalid input') ||
        message.includes('not found')
    ) {
        return 'low';
    }

    return 'medium';
}

/**
 * Determine if an error is recoverable
 */
function isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network and timeout errors are often recoverable with retry
    if (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('rate limit')
    ) {
        return true;
    }

    // Validation errors are recoverable with correct input
    if (message.includes('validation')) {
        return true;
    }

    return false;
}

/**
 * Anonymize IP address by masking last octet
 */
function anonymizeIpAddress(ip: string): string {
    if (!ip) return ip;

    // IPv4
    if (ip.includes('.')) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            parts[3] = 'xxx';
            return parts.join('.');
        }
    }

    // IPv6
    if (ip.includes(':')) {
        const parts = ip.split(':');
        if (parts.length > 0) {
            parts[parts.length - 1] = 'xxxx';
            return parts.join(':');
        }
    }

    return ip;
}

/**
 * Factory function for creating a new log entry builder
 */
export function logEntry(): LogEntryBuilder {
    return new LogEntryBuilder();
}

/**
 * Quick builders for common log types
 */
export const quickLog = {
    info: (message: string, context?: Partial<LogContext>) =>
        logEntry().level('info').message(message).context(context || {}).build(),

    warn: (message: string, context?: Partial<LogContext>) =>
        logEntry().level('warn').message(message).context(context || {}).build(),

    error: (message: string, error: Error | unknown, context?: Partial<LogContext>) =>
        logEntry().level('error').message(message).error(error).context(context || {}).build(),

    debug: (message: string, data?: Record<string, unknown>) =>
        logEntry().level('debug').message(message).data(data || {}).build(),

    audit: (action: string, resource: string, context?: Partial<LogContext>) =>
        logEntry()
            .level('info')
            .message(`Audit: ${action} on ${resource}`)
            .tag('audit', 'true')
            .context(context || {})
            .build(),
};
