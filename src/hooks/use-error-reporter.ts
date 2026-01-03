/**
 * Use Error Reporter Hook
 *
 * Provides a hook to report errors from React components
 * with automatic context enrichment.
 */

'use client';

import { useCallback } from 'react';
import { clientLogger } from '@/lib/client-logger';
import { useCorrelation } from '@/contexts/correlation-context';

export function useErrorReporter() {
    const { correlationId, traceId } = useCorrelation();

    const reportError = useCallback((
        error: Error | unknown,
        context: Record<string, unknown> = {},
        level: 'error' | 'fatal' | 'warn' = 'error'
    ) => {
        const errorObj = error instanceof Error ? error : new Error(String(error));

        // Enrich with active trace context
        const richContext = {
            ...context,
            correlationId,
            traceId,
            component: context.component || 'ReactComponent',
        };

        if (level === 'fatal') {
            clientLogger.fatal(errorObj, richContext);
        } else if (level === 'warn') {
            clientLogger.warn(errorObj.message, richContext); // Warn usually doesn't need full stack trace object
        } else {
            clientLogger.error(errorObj, richContext);
        }
    }, [correlationId, traceId]);

    return { reportError };
}
