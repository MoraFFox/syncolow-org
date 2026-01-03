/**
 * Console Transport
 *
 * Enhanced console output with color coding, structured formatting,
 * and pretty printing for development environments.
 */

/* eslint-disable no-console */
import type { LogEntry, TransportConfig, LogLevel } from '@/types/log-entry';
import { BaseTransport, transportRegistry } from './base-transport';

/**
 * Console transport configuration options
 */
export interface ConsoleTransportOptions {
    /** Enable colorized output */
    colorize?: boolean;

    /** Enable pretty print in development */
    prettyPrint?: boolean;

    /** Include timestamp in output */
    showTimestamp?: boolean;

    /** Include correlation ID in output */
    showCorrelationId?: boolean;

    /** Include stack traces */
    showStackTrace?: boolean;

    /** Max depth for nested objects */
    maxDepth?: number;
}

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',

    // Background colors
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
};

/**
 * Emoji and color mapping for log levels
 */
const LEVEL_FORMAT: Record<LogLevel, { emoji: string; color: string; bgColor?: string }> = {
    trace: { emoji: '🔍', color: COLORS.gray },
    debug: { emoji: '🔵', color: COLORS.blue },
    info: { emoji: 'ℹ️', color: COLORS.cyan },
    warn: { emoji: '⚠️', color: COLORS.yellow, bgColor: COLORS.bgYellow },
    error: { emoji: '❌', color: COLORS.red },
    fatal: { emoji: '💀', color: COLORS.red, bgColor: COLORS.bgRed },
};

/**
 * Console transport implementation
 */
export class ConsoleTransport extends BaseTransport {
    private readonly options: Required<ConsoleTransportOptions>;

    constructor(config: TransportConfig) {
        super('console', config);

        const opts = config.options as ConsoleTransportOptions | undefined;
        const isDev = process.env.NODE_ENV === 'development';

        this.options = {
            colorize: opts?.colorize ?? isDev,
            prettyPrint: opts?.prettyPrint ?? isDev,
            showTimestamp: opts?.showTimestamp ?? true,
            showCorrelationId: opts?.showCorrelationId ?? true,
            showStackTrace: opts?.showStackTrace ?? isDev,
            maxDepth: opts?.maxDepth ?? 5,
        };
    }

    protected async doLog(entry: LogEntry): Promise<void> {
        if (this.options.prettyPrint) {
            this.logPretty(entry);
        } else {
            this.logJson(entry);
        }
    }

    /**
     * Pretty print log entry for development
     */
    private logPretty(entry: LogEntry): void {
        const format = LEVEL_FORMAT[entry.level];
        const color = this.options.colorize ? format.color : '';
        const reset = this.options.colorize ? COLORS.reset : '';
        const bright = this.options.colorize ? COLORS.bright : '';
        const dim = this.options.colorize ? COLORS.dim : '';

        // Build header
        const parts: string[] = [];

        // Timestamp
        if (this.options.showTimestamp) {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            parts.push(`${dim}[${time}]${reset}`);
        }

        // Level with emoji and color
        parts.push(`${color}${format.emoji} ${entry.level.toUpperCase()}${reset}`);

        // Correlation ID
        if (this.options.showCorrelationId && entry.correlationId) {
            parts.push(`${dim}[${entry.correlationId.slice(0, 8)}]${reset}`);
        }

        // Component and action
        if (entry.context?.component) {
            parts.push(`${bright}[${entry.context.component}]${reset}`);
        }
        if (entry.context?.action) {
            parts.push(`${dim}(${entry.context.action})${reset}`);
        }

        // Message
        const header = parts.join(' ');
        const message = `${color}${entry.message}${reset}`;

        // Use console group for structured output
        const consoleFn = this.getConsoleFn(entry.level);

        if (entry.context?.data || entry.error || entry.metrics) {
            console.group(`${header} ${message}`);

            // Context data
            if (entry.context?.data) {
                console.log('📦 Data:', this.formatObject(entry.context.data));
            }

            // Error details
            if (entry.error) {
                console.error('❗ Error:', entry.error.name, '-', entry.error.message);
                if (this.options.showStackTrace && entry.error.stack) {
                    console.error('   Stack:', entry.error.stack);
                }
                if (entry.error.category) {
                    console.error('   Category:', entry.error.category);
                }
            }

            // Metrics
            if (entry.metrics) {
                console.log('📊 Metrics:', this.formatObject(entry.metrics));
            }

            // User context
            if (entry.context?.userId) {
                console.log(`👤 User: ${entry.context.userId}`);
            }

            // HTTP context
            if (entry.context?.method && entry.context?.route) {
                console.log(`🌐 ${entry.context.method} ${entry.context.route}`);
                if (entry.context.statusCode) {
                    console.log(`   Status: ${entry.context.statusCode}`);
                }
                if (entry.context.duration) {
                    console.log(`   Duration: ${entry.context.duration}ms`);
                }
            }

            console.groupEnd();
        } else {
            consoleFn(`${header} ${message}`);
        }
    }

    /**
     * JSON output for production/structured logging
     */
    private logJson(entry: LogEntry): void {
        const consoleFn = this.getConsoleFn(entry.level);
        consoleFn(JSON.stringify(entry));
    }

    /**
     * Get appropriate console function for log level
     */
    private getConsoleFn(level: LogLevel): typeof console.log {
        switch (level) {
            case 'trace':
            case 'debug':
                return console.debug;
            case 'info':
                return console.info;
            case 'warn':
                return console.warn;
            case 'error':
            case 'fatal':
                return console.error;
            default:
                return console.log;
        }
    }

    /**
     * Format object for pretty printing
     */
    private formatObject(obj: unknown, depth = 0): string {
        if (depth > this.options.maxDepth) {
            return '[max depth reached]';
        }

        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        if (typeof obj !== 'object') return String(obj);

        try {
            return JSON.stringify(obj, null, 2);
        } catch {
            return '[unserializable]';
        }
    }
}

/**
 * Register console transport in the registry
 */
transportRegistry.register('console', (config) => new ConsoleTransport(config));

/**
 * Factory function for creating console transport
 */
export function createConsoleTransport(options?: Partial<TransportConfig>): ConsoleTransport {
    return new ConsoleTransport({
        name: 'console',
        enabled: true,
        minLevel: 'debug',
        ...options,
    });
}
