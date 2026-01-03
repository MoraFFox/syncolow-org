
import { headers } from 'next/headers';
import {
    TraceContext,
    createTraceContext,
    parseTraceHeaders,
    runWithContextAsync,
    generateCorrelationId,
    generateTraceId,
    generateSpanId
} from './correlation-context';

/**
 * Higher-order function to wrap Server Actions with distributed tracing context.
 * 
 * It automatically extracts trace headers (if available in the invocation context)
 * and runs the action within an AsyncLocalStorage context.
 * 
 * @example
 * // In actions.ts
 * export const myAction = withServerActionTrace(async (data) => {
 *   logger.info('Processing action');
 *   return { success: true };
 * });
 */
export function withServerActionTrace<T, Args extends unknown[]>(
    action: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
    return async (...args: Args) => {
        // In Server Actions, headers() is available
        let rawHeaders;
        try {
            rawHeaders = await headers();
        } catch {
            // Fallback if headers cannot be read
            rawHeaders = new Headers();
        }

        // Parse W3C trace headers or custom correlation headers
        const parsed = parseTraceHeaders(rawHeaders);

        // Ensure we have at least these IDs, generating if missing/invalid
        const correlationId = parsed.correlationId || generateCorrelationId();
        const traceId = parsed.traceId || generateTraceId();
        const spanId = generateSpanId(); // Always new span for this unit of work
        const parentSpanId = parsed.parentSpanId;

        // Construct full context
        const context: TraceContext = createTraceContext({
            correlationId,
            traceId,
            spanId,
            parentSpanId,
            userId: parsed.userId,
            sessionId: parsed.sessionId,
            request: {
                method: 'SERVER_ACTION',
                path: 'UNKNOWN', // Actions don't effectively have a path context the same way
            }
        });

        // Run action within context
        return runWithContextAsync(context, async () => {
            try {
                return await action(...args);
            } catch (error) {
                throw error;
            }
        });
    };
}
