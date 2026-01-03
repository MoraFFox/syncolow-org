/**
 * Correlation Context (Client-Side)
 *
 * Provides correlation and trace IDs to client-side components.
 * Ensures that all client-side logs and requests are tagged with
 * consistent tracing identifiers.
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Trace context interface
 */
export interface TraceContextValue {
    correlationId: string;
    traceId: string;
    spanId?: string;
    setSpanId: (id: string) => void;
}

const CorrelationContext = createContext<TraceContextValue | undefined>(undefined);

/**
 * Props for CorrelationProvider
 */
interface CorrelationProviderProps {
    children: React.ReactNode;
    initialCorrelationId?: string;
    initialTraceId?: string;
}

/**
 * Header names for trace propagation
 */
export const TRACE_HEADERS = {
    CORRELATION_ID: 'x-correlation-id',
    TRACE_ID: 'x-trace-id',
    SPAN_ID: 'x-span-id',
    TRACE_PARENT: 'traceparent',
} as const;

/**
 * Trace Context Provider
 */
export function CorrelationProvider({
    children,
    initialCorrelationId,
    initialTraceId,
}: CorrelationProviderProps) {
    const [correlationId, setCorrelationId] = useState<string>(
        initialCorrelationId || ''
    );
    const [traceId, setTraceId] = useState<string>(
        initialTraceId || ''
    );
    const [spanId, setSpanId] = useState<string>('');

    useEffect(() => {
        // Initialize IDs if not provided
        if (!correlationId) {
            setCorrelationId(uuidv4());
        }
        if (!traceId) {
            setTraceId(uuidv4());
        }

        // Check meta tags for server-injected IDs (for SSR hydration)
        const metaCorrelationId = document.querySelector('meta[name="correlation-id"]')?.getAttribute('content');
        const metaTraceId = document.querySelector('meta[name="trace-id"]')?.getAttribute('content');

        if (metaCorrelationId && metaCorrelationId !== correlationId) {
            setCorrelationId(metaCorrelationId);
        }
        if (metaTraceId && metaTraceId !== traceId) {
            setTraceId(metaTraceId);
        }
    }, [correlationId, traceId]);

    const value = {
        correlationId,
        traceId,
        spanId,
        setSpanId,
    };

    return (
        <CorrelationContext.Provider value={value}>
            {children}
        </CorrelationContext.Provider>
    );
}

/**
 * Hook to access trace context
 */
export function useCorrelation() {
    const context = useContext(CorrelationContext);
    if (context === undefined) {
        throw new Error('useCorrelation must be used within a CorrelationProvider');
    }
    return context;
}

/**
 * Helper to get headers for fetch requests
 */
export function useTraceHeaders() {
    const { correlationId, traceId, spanId } = useCorrelation();

    return {
        [TRACE_HEADERS.CORRELATION_ID]: correlationId,
        [TRACE_HEADERS.TRACE_ID]: traceId,
        [TRACE_HEADERS.SPAN_ID]: spanId || uuidv4(), // Generate new span for request
        [TRACE_HEADERS.TRACE_PARENT]: `00-${traceId}-${spanId || uuidv4()}-01`,
    };
}
