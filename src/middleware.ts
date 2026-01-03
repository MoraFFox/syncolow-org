/**
 * Next.js Middleware
 *
 * Handles request-level processing including:
 * - Correlation ID injection for distributed tracing
 * - Request timing for performance monitoring
 * - Security headers and authentication checks
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    createContextFromRequest,
} from '@/lib/correlation-context';

/**
 * Request paths that should be excluded from middleware processing
 */
const EXCLUDED_PATHS = [
    '/_next',
    '/api/_next',
    '/favicon.ico',
    '/manifest.json',
    '/sw.js',
    '/workbox-',
];

/**
 * Check if a path should be excluded from middleware
 */
function shouldExclude(pathname: string): boolean {
    return EXCLUDED_PATHS.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Skip middleware for static assets and internal Next.js paths
    if (shouldExclude(pathname)) {
        return NextResponse.next();
    }

    const startTime = Date.now();

    // Create trace context using shared logic
    // This extracts valid headers or generates new IDs
    const context = createContextFromRequest(
        {
            method: request.method,
            url: request.url,
            headers: request.headers,
        },
        {
            extractIp: () => (request as any).ip || request.headers.get('x-forwarded-for') || undefined,
        }
    );

    // Clone request headers and inject trace context
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-correlation-id', context.correlationId);
    requestHeaders.set('x-trace-id', context.traceId);
    requestHeaders.set('x-span-id', context.spanId);
    requestHeaders.set('x-request-start', startTime.toString());

    // W3C Trace Context
    requestHeaders.set('traceparent', `00-${context.traceId}-${context.spanId}-01`);

    if (context.parentSpanId) {
        requestHeaders.set('x-parent-span-id', context.parentSpanId);
    }

    // Create response with modified request headers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Add correlation headers to response
    response.headers.set('x-correlation-id', context.correlationId);
    response.headers.set('x-trace-id', context.traceId);
    response.headers.set('traceparent', `00-${context.traceId}-${context.spanId}-01`);

    // Calculate duration
    const duration = Date.now() - startTime;
    response.headers.set('x-response-time', `${duration}ms`);

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Log slow requests (can be connected to logger later)
    if (duration > 1000) {
        response.headers.set('x-slow-request', 'true');
    }

    return response;
}

/**
 * Configure which routes the middleware applies to
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
