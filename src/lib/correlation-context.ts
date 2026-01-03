/**
 * Correlation Context
 *
 * Implements distributed tracing context using AsyncLocalStorage for Node.js.
 * Provides request-scoped correlation IDs and trace context propagation.
 */

import { AsyncLocalStorage } from 'async_hooks';

/**
 * Trace context for distributed tracing
 */
export interface TraceContext {
    /** Unique correlation ID for the request */
    correlationId: string;

    /** OpenTelemetry-compatible trace ID (32-character hex) */
    traceId: string;

    /** OpenTelemetry-compatible span ID (16-character hex) */
    spanId: string;

    /** Parent span ID if applicable */
    parentSpanId?: string;

    /** User ID if authenticated */
    userId?: string;

    /** Session ID if available */
    sessionId?: string;

    /** Request start time for duration calculation */
    startTime: number;

    /** HTTP request metadata */
    request?: {
        method: string;
        path: string;
        userAgent?: string;
        ip?: string;
    };

    /** Custom properties */
    properties: Record<string, unknown>;
}

/**
 * AsyncLocalStorage instance for request-scoped context
 */
const asyncLocalStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Generate a UUID v4 for correlation IDs
 */
export function generateCorrelationId(): string {
    // Use crypto.randomUUID if available (Node.js 14.17+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Generate a 32-character hex trace ID
 */
export function generateTraceId(): string {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 16; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Generate a 16-character hex span ID
 */
export function generateSpanId(): string {
    const bytes = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 8; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Create a new trace context
 */
export function createTraceContext(options: Partial<TraceContext> = {}): TraceContext {
    return {
        correlationId: options.correlationId || generateCorrelationId(),
        traceId: options.traceId || generateTraceId(),
        spanId: options.spanId || generateSpanId(),
        parentSpanId: options.parentSpanId,
        userId: options.userId,
        sessionId: options.sessionId,
        startTime: options.startTime || Date.now(),
        request: options.request,
        properties: options.properties || {},
    };
}

/**
 * Run a function within a correlation context
 * All logs within this function will automatically include the correlation ID
 */
export function runWithContext<T>(
    context: TraceContext,
    fn: () => T
): T {
    return asyncLocalStorage.run(context, fn);
}

/**
 * Run an async function within a correlation context
 */
export async function runWithContextAsync<T>(
    context: TraceContext,
    fn: () => Promise<T>
): Promise<T> {
    return asyncLocalStorage.run(context, fn);
}

/**
 * Get the current trace context
 */
export function getTraceContext(): TraceContext | undefined {
    return asyncLocalStorage.getStore();
}

/**
 * Get the current correlation ID
 */
export function getCorrelationId(): string | undefined {
    return asyncLocalStorage.getStore()?.correlationId;
}

/**
 * Get the current trace ID
 */
export function getTraceId(): string | undefined {
    return asyncLocalStorage.getStore()?.traceId;
}

/**
 * Get the current span ID
 */
export function getSpanId(): string | undefined {
    return asyncLocalStorage.getStore()?.spanId;
}

/**
 * Get the current user ID from context
 */
export function getContextUserId(): string | undefined {
    return asyncLocalStorage.getStore()?.userId;
}

/**
 * Update the current context with additional properties
 */
export function updateContext(updates: Partial<TraceContext>): void {
    const current = asyncLocalStorage.getStore();
    if (current) {
        Object.assign(current, updates);
    }
}

/**
 * Set a custom property in the current context
 */
export function setContextProperty(key: string, value: unknown): void {
    const current = asyncLocalStorage.getStore();
    if (current) {
        current.properties[key] = value;
    }
}

/**
 * Get a custom property from the current context
 */
export function getContextProperty<T = unknown>(key: string): T | undefined {
    return asyncLocalStorage.getStore()?.properties[key] as T | undefined;
}

/**
 * Create a child span context
 */
export function createChildSpan(): TraceContext | undefined {
    const parent = asyncLocalStorage.getStore();
    if (!parent) return undefined;

    return {
        ...parent,
        parentSpanId: parent.spanId,
        spanId: generateSpanId(),
    };
}

/**
 * Calculate elapsed time from context start
 */
export function getElapsedTime(): number {
    const context = asyncLocalStorage.getStore();
    if (!context) return 0;
    return Date.now() - context.startTime;
}

/**
 * Parse trace context from HTTP headers (W3C Trace Context format)
 */
export function parseTraceHeaders(headers: Headers | Record<string, string | string[] | undefined>): Partial<TraceContext> {
    const getHeader = (name: string): string | undefined => {
        if (headers instanceof Headers) {
            return headers.get(name) || undefined;
        }
        const value = headers[name];
        return Array.isArray(value) ? value[0] : value;
    };

    const result: Partial<TraceContext> = {};

    // Parse X-Correlation-ID or X-Request-ID
    const correlationId = getHeader('x-correlation-id') || getHeader('x-request-id');
    if (correlationId) {
        result.correlationId = correlationId;
    }

    // Parse W3C traceparent header
    // Format: {version}-{trace-id}-{parent-id}-{trace-flags}
    const traceparent = getHeader('traceparent');
    if (traceparent) {
        const parts = traceparent.split('-');
        if (parts.length >= 3) {
            result.traceId = parts[1];
            result.parentSpanId = parts[2];
        }
    }

    // Parse user context headers
    const userId = getHeader('x-user-id');
    if (userId) {
        result.userId = userId;
    }

    const sessionId = getHeader('x-session-id');
    if (sessionId) {
        result.sessionId = sessionId;
    }

    return result;
}

/**
 * Build trace context headers for outgoing requests
 */
export function buildTraceHeaders(): Record<string, string> {
    const context = asyncLocalStorage.getStore();
    if (!context) return {};

    const headers: Record<string, string> = {
        'x-correlation-id': context.correlationId,
    };

    // W3C Trace Context format
    if (context.traceId && context.spanId) {
        headers['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
    }

    if (context.userId) {
        headers['x-user-id'] = context.userId;
    }

    if (context.sessionId) {
        headers['x-session-id'] = context.sessionId;
    }

    return headers;
}

/**
 * Wrap a fetch function to automatically propagate trace context
 */
export function wrapFetchWithContext(
    fetchFn: typeof fetch = fetch
): typeof fetch {
    return async (input, init) => {
        const traceHeaders = buildTraceHeaders();

        const headers = new Headers(init?.headers);
        Object.entries(traceHeaders).forEach(([key, value]) => {
            if (!headers.has(key)) {
                headers.set(key, value);
            }
        });

        return fetchFn(input, {
            ...init,
            headers,
        });
    };
}

/**
 * Express/Next.js middleware helper for setting up correlation context
 */
export function createContextFromRequest(
    request: {
        method?: string;
        url?: string;
        headers?: Headers | Record<string, string | string[] | undefined>;
    },
    options: {
        extractUserId?: (headers: Headers | Record<string, string | string[] | undefined>) => string | undefined;
        extractSessionId?: (headers: Headers | Record<string, string | string[] | undefined>) => string | undefined;
        extractIp?: () => string | undefined;
    } = {}
): TraceContext {
    // Parse existing trace context from headers
    const existingContext = request.headers
        ? parseTraceHeaders(request.headers)
        : {};

    // Extract user and session ID if functions provided
    const userId = options.extractUserId?.(request.headers || {}) || existingContext.userId;
    const sessionId = options.extractSessionId?.(request.headers || {}) || existingContext.sessionId;

    const getHeader = (name: string): string | undefined => {
        if (!request.headers) return undefined;
        if (request.headers instanceof Headers) {
            return request.headers.get(name) || undefined;
        }
        const value = request.headers[name];
        return Array.isArray(value) ? value[0] : value;
    };

    return createTraceContext({
        correlationId: existingContext.correlationId || generateCorrelationId(),
        traceId: existingContext.traceId || generateTraceId(),
        parentSpanId: existingContext.parentSpanId,
        spanId: generateSpanId(),
        userId,
        sessionId,
        request: {
            method: request.method || 'UNKNOWN',
            path: request.url || '/',
            userAgent: getHeader('user-agent'),
            ip: options.extractIp?.(),
        },
    });
}
