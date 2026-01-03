"use client";

import { useEffect, useState } from 'react';
import { registerServiceWorker } from '@/lib/service-worker-manager';
import { logger } from '@/lib/logger';
import { Badge } from '@/components/ui/badge';
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

type SWStatus = 'idle' | 'registering' | 'registered' | 'error' | 'unsupported';

/**
 * ServiceWorkerInitializer
 * 
 * Client component that registers the service worker at app startup.
 * This enables PWA assets, push notifications, and offline queue processing.
 * 
 * Features:
 * - Environment check: Only registers in production or when NEXT_PUBLIC_ENABLE_SW=true
 * - Dev mode indicator: Shows registration status in development
 * - Error boundary: Prevents SW registration failures from crashing the app
 */
export function ServiceWorkerInitializer() {
    const [status, setStatus] = useState<SWStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if we should register the service worker
        const shouldRegister = () => {
            if (typeof window === 'undefined') return false;
            if (!('serviceWorker' in navigator)) {
                setStatus('unsupported');
                return false;
            }

            // In production, always register
            const isProduction = process.env.NODE_ENV === 'production';
            // In development, only register if explicitly enabled
            const isDevEnabled = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

            return isProduction || isDevEnabled;
        };

        if (!shouldRegister()) return;

        const register = async () => {
            setStatus('registering');
            try {
                const registration = await registerServiceWorker();
                if (registration) {
                    setStatus('registered');
                    logger.debug('Service Worker registered successfully', {});
                } else {
                    setStatus('error');
                    setError('Registration returned null');
                }
            } catch (err) {
                setStatus('error');
                setError(err instanceof Error ? err.message : 'Unknown error');
                // Don't throw - SW failures shouldn't crash the app
                console.error('[SW] Service Worker registration failed:', err);
            }
        };

        register();
    }, []);

    // Show dev indicator only in development mode
    const showDevIndicator = process.env.NODE_ENV === 'development' && status !== 'idle';

    if (!showDevIndicator) return null;

    return (
        <div className="fixed bottom-2 left-2 z-50">
            <Badge
                variant={status === 'registered' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
                className="gap-1.5 text-xs"
            >
                {status === 'registering' && <Zap className="h-3 w-3 animate-pulse" />}
                {status === 'registered' && <CheckCircle2 className="h-3 w-3" />}
                {status === 'error' && <AlertCircle className="h-3 w-3" />}
                {status === 'unsupported' && <AlertCircle className="h-3 w-3" />}
                <span>SW: {status}</span>
                {error && <span title={error}>(!)</span>}
            </Badge>
        </div>
    );
}
