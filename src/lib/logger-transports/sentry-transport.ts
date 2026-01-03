/**
 * Sentry Transport
 *
 * Integration with Sentry for error tracking and performance monitoring.
 * Sends errors with full context, breadcrumbs, and custom tags.
 */

import type { LogEntry, TransportConfig } from '@/types/log-entry';
import { BaseTransport, transportRegistry } from './base-transport';

/**
 * Sentry transport configuration options
 */
export interface SentryTransportOptions {
    [key: string]: unknown;
    /** Sentry DSN */
    dsn?: string;

    /** Custom Sentry instance (if already initialized) */
    sentryInstance?: SentryLike;

    /** Environment name */
    environment?: string;

    /** Release version */
    release?: string;

    /** Sample rate for errors (0-1) */
    sampleRate?: number;

    /** Sample rate for traces (0-1) */
    tracesSampleRate?: number;

    /** Custom tags to add to all events */
    tags?: Record<string, string>;

    /** Whether to send breadcrumbs */
    sendBreadcrumbs?: boolean;

    /** Max breadcrumbs to include */
    maxBreadcrumbs?: number;
}

/**
 * Minimal Sentry-like interface for dependency injection
 */
export interface SentryLike {
    captureException: (error: unknown, context?: unknown) => string;
    captureMessage: (message: string, level?: string) => string;
    addBreadcrumb: (breadcrumb: unknown) => void;
    setUser: (user: { id?: string; email?: string;[key: string]: unknown } | null) => void;
    setTag: (key: string, value: string) => void;
    setContext: (name: string, context: Record<string, unknown>) => void;
    withScope: (callback: (scope: any) => void) => void;
}

/**
 * Sentry transport implementation
 */
export class SentryTransport extends BaseTransport {
    private readonly options: {
        dsn?: string;
        sentryInstance?: SentryLike;
        environment?: string;
        release?: string;
        sampleRate: number;
        tracesSampleRate: number;
        tags: Record<string, string>;
        sendBreadcrumbs: boolean;
        maxBreadcrumbs: number;
        [key: string]: unknown;
    };
    private sentry: SentryLike | null = null;
    private isInitialized = false;

    constructor(config: TransportConfig) {
        super('sentry', config);

        const opts = config.options as SentryTransportOptions | undefined;
        this.options = {
            dsn: opts?.dsn || process.env.SENTRY_DSN,
            sentryInstance: opts?.sentryInstance,
            environment: opts?.environment || process.env.NODE_ENV,
            release: opts?.release || process.env.VERCEL_GIT_COMMIT_SHA,
            sampleRate: opts?.sampleRate ?? 1.0,
            tracesSampleRate: opts?.tracesSampleRate ?? 0.1,
            tags: opts?.tags || {},
            sendBreadcrumbs: opts?.sendBreadcrumbs ?? true,
            maxBreadcrumbs: opts?.maxBreadcrumbs ?? 10,
        };
    }

    /**
     * Initialize Sentry SDK if not provided
     */
    private async initialize(): Promise<boolean> {
        if (this.isInitialized) return this.sentry !== null;

        this.isInitialized = true;

        // Use provided Sentry instance
        if (this.options.sentryInstance) {
            this.sentry = this.options.sentryInstance;
            return true;
        }

        // Try to dynamically import Sentry
        if (this.options.dsn) {
            try {
                // Dynamic import to avoid requiring Sentry if not used
                // @ts-ignore - Sentry might not be installed in all environments
                const Sentry = await import('@sentry/nextjs') as any;

                if (!Sentry.isInitialized?.()) {
                    Sentry.init({
                        dsn: this.options.dsn,
                        environment: this.options.environment,
                        release: this.options.release,
                        sampleRate: this.options.sampleRate,
                        tracesSampleRate: this.options.tracesSampleRate,
                    });
                }

                this.sentry = Sentry as unknown as SentryLike;
                return true;
            } catch {
                console.warn('SentryTransport: @sentry/nextjs not available');
                return false;
            }
        }

        return false;
    }

    protected async doLog(entry: LogEntry): Promise<void> {
        const initialized = await this.initialize();
        if (!initialized || !this.sentry) return;

        // Only send error and fatal level logs to Sentry
        if (entry.level !== 'error' && entry.level !== 'fatal') {
            // Add as breadcrumb for context
            if (this.options.sendBreadcrumbs) {
                this.addBreadcrumb(entry);
            }
            return;
        }

        // Send error to Sentry with full context
        this.sentry.withScope((scope: Record<string, unknown>) => {
            // Set user context
            if (entry.context?.userId) {
                this.sentry!.setUser({ id: entry.context.userId });
            }

            // Set correlation ID as tag
            if (entry.correlationId) {
                this.sentry!.setTag('correlationId', entry.correlationId);
            }

            // Set trace IDs
            if (entry.traceId) {
                this.sentry!.setTag('traceId', entry.traceId);
            }
            if (entry.spanId) {
                this.sentry!.setTag('spanId', entry.spanId);
            }

            // Set component and action
            if (entry.context?.component) {
                this.sentry!.setTag('component', entry.context.component);
            }
            if (entry.context?.action) {
                this.sentry!.setTag('action', entry.context.action);
            }

            // Set custom tags
            Object.entries(this.options.tags || {}).forEach(([key, value]) => {
                this.sentry!.setTag(key, value);
            });

            // Set error category if available
            if (entry.error?.category) {
                this.sentry!.setTag('errorCategory', entry.error.category);
            }

            // Set HTTP context
            if (entry.context?.method || entry.context?.route) {
                this.sentry!.setContext('request', {
                    method: entry.context.method,
                    url: entry.context.route,
                    statusCode: entry.context.statusCode,
                });
            }

            // Set additional context
            if (entry.context?.data) {
                this.sentry!.setContext('data', entry.context.data);
            }

            // Add breadcrumbs from entry
            if (entry.context?.breadcrumbs) {
                entry.context.breadcrumbs.slice(-this.options.maxBreadcrumbs!).forEach((bc) => {
                    this.sentry!.addBreadcrumb({
                        category: bc.category,
                        message: bc.message,
                        level: this.mapLevel(bc.level || 'info'),
                        data: bc.data,
                        timestamp: new Date(bc.timestamp).getTime() / 1000,
                    });
                });
            }

            // Capture the error or message
            if (entry.error) {
                const error = new Error(entry.error.message);
                error.name = entry.error.name;
                if (entry.error.stack) {
                    error.stack = entry.error.stack;
                }
                this.sentry!.captureException(error, {
                    fingerprint: this.generateFingerprint(entry),
                });
            } else {
                this.sentry!.captureMessage(entry.message, this.mapLevel(entry.level));
            }
        });
    }

    /**
     * Add a log entry as a Sentry breadcrumb
     */
    private addBreadcrumb(entry: LogEntry): void {
        if (!this.sentry) return;

        this.sentry.addBreadcrumb({
            category: `logger.${entry.context?.component || 'app'}`,
            message: entry.message,
            level: this.mapLevel(entry.level),
            data: {
                action: entry.context?.action,
                ...entry.context?.data,
            },
            timestamp: new Date(entry.timestamp).getTime() / 1000,
        });
    }

    /**
     * Map log level to Sentry severity
     */
    private mapLevel(level: string): string {
        switch (level) {
            case 'trace':
            case 'debug':
                return 'debug';
            case 'info':
                return 'info';
            case 'warn':
                return 'warning';
            case 'error':
                return 'error';
            case 'fatal':
                return 'fatal';
            default:
                return 'info';
        }
    }

    /**
     * Generate fingerprint for error grouping
     */
    private generateFingerprint(entry: LogEntry): string[] {
        const fingerprint: string[] = ['{{ default }}'];

        // Group by component and action
        if (entry.context?.component) {
            fingerprint.push(entry.context.component);
        }
        if (entry.context?.action) {
            fingerprint.push(entry.context.action);
        }

        // Group by error category
        if (entry.error?.category) {
            fingerprint.push(entry.error.category);
        }

        return fingerprint;
    }
}

/**
 * Register Sentry transport in the registry
 */
transportRegistry.register('sentry', (config) => new SentryTransport(config));

/**
 * Factory function for creating Sentry transport
 */
export function createSentryTransport(options?: SentryTransportOptions): SentryTransport {
    return new SentryTransport({
        name: 'sentry',
        enabled: true,
        minLevel: 'warn',
        options,
    });
}
