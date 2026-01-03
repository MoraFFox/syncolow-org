
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
 * Higher-order function to wrap API route handlers or Server Actions
 * with distributed tracing context.
 * 
 * It automatically extracts trace headers provided by Middleware (or upstream services)
 * and runs the handler within an AsyncLocalStorage context.
 * 
 * @example
 * // In api/route.ts
 * export const POST = withTraceContext(async (req) => {
 *   logger.info('Handling request');
 *   return NextResponse.json({ ... });
 * });
 */
export function withTraceContext<T, Args extends unknown[]>(
    handler: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
    return async (...args: Args) => {
        const rawHeaders = await headers();

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
            userId: parsed.userId, // Optionally passed from middleware
            sessionId: parsed.sessionId,
            request: {
                method: 'UNKNOWN', // Hard to get method from generic headers() w/o req object, usually ok
                path: 'UNKNOWN',
            }
        });

        // Run handler within context
        return runWithContextAsync(context, async () => {
            try {
                return await handler(...args);
            } catch (error) {
                throw error;
            }
        });
    };
}
