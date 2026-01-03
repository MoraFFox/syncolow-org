/**
 * Client Logger
 *
 * Browser-safe logging utility that mirrors the server-side logger API.
 * buffers logs and sends them to the server in batches.
 */

import { v4 as uuidv4 } from 'uuid';
import type { LogEntry, LogLevel } from '@/types/log-entry';

// Default config
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000;
const API_ENDPOINT = '/api/logs/ingest'; // We'll need to create this

class ClientLogger {
    private buffer: LogEntry[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private isProcessing = false;
    private defaultConfig = {
        component: 'ClientApp',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    };

    constructor() {
        if (typeof window !== 'undefined') {
            this.startFlushTimer();

            // Flush on page unload
            window.addEventListener('beforeunload', () => {
                this.flush(true);
            });

            // Listen for unhandled errors
            window.addEventListener('error', (event) => {
                this.error(event.error || new Error(event.message), {
                    type: 'uncaught_exception',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                });
            });

            // Listen for unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                this.error(event.reason, {
                    type: 'unhandled_rejection',
                });
            });
        }
    }

    private startFlushTimer() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
    }

    /**
     * Main logging method
     */
    private log(level: LogLevel, message: string, context: Record<string, unknown> = {}, error?: Error) {
        // Console output for development
        if (process.env.NODE_ENV === 'development') {
            const consoleMethod = level === 'fatal' ? 'error' : level === 'trace' ? 'debug' : level;
            // eslint-disable-next-line no-console
            console[consoleMethod as 'log' | 'warn' | 'error' | 'debug'](`[${level.toUpperCase()}] ${message}`, context, error);
        }

        // Construct log entry
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: 'web-client',
            environment: this.defaultConfig.environment,
            version: this.defaultConfig.version,
            correlationId: this.getMetaContent('correlation-id'),
            traceId: this.getMetaContent('trace-id'),
            spanId: undefined, // Client is leaf
            context: {
                ...context,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                url: typeof window !== 'undefined' ? window.location.href : undefined,
            },
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        };

        this.buffer.push(entry);

        if (this.buffer.length >= BATCH_SIZE) {
            this.flush();
        }
    }

    /**
     * Helper logging methods
     */
    trace(message: string, context?: Record<string, unknown>) { this.log('trace', message, context); }
    debug(message: string, context?: Record<string, unknown>) { this.log('debug', message, context); }
    info(message: string, context?: Record<string, unknown>) { this.log('info', message, context); }
    warn(message: string, context?: Record<string, unknown>) { this.log('warn', message, context); }
    error(error: Error | string, context?: Record<string, unknown>) {
        if (error instanceof Error) {
            this.log('error', error.message, context, error);
        } else {
            this.log('error', error, context);
        }
    }
    fatal(error: Error | string, context?: Record<string, unknown>) {
        if (error instanceof Error) {
            this.log('fatal', error.message, context, error);
        } else {
            this.log('fatal', error, context);
        }
    }

    /**
     * Flush logs to server
     */
    async flush(sync = false) {
        if (this.buffer.length === 0 || this.isProcessing) return;

        this.isProcessing = true;
        const entries = [...this.buffer];
        this.buffer = [];

        try {
            if (sync && typeof navigator !== 'undefined' && navigator.sendBeacon) {
                // Use sendBeacon for unload flush
                const blob = new Blob([JSON.stringify({ entries })], { type: 'application/json' });
                navigator.sendBeacon(API_ENDPOINT, blob);
            } else {
                await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entries }),
                    keepalive: true,
                });
            }
        } catch (err) {
            // If failed, put back in buffer (unless sync flush)
            if (!sync) {
                console.error('Failed to send client logs', err);
                // Limit backup size
                if (this.buffer.length < 100) {
                    this.buffer = [...entries, ...this.buffer];
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private getMetaContent(name: string): string | undefined {
        if (typeof document === 'undefined') return undefined;
        return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || undefined;
    }
}

export const clientLogger = new ClientLogger();
