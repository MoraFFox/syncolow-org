/**
 * Development Logger Tools
 *
 * Browser-only utilities to help developers debug logging issues.
 * These tools are only active in development mode.
 */

import { clientLogger } from './client-logger';
import { getLoggerConfig } from './logger-config';

interface DevLoggerTools {
    /** Enable debug mode */
    enableDebug: () => void;

    /** Disable debug mode */
    disableDebug: () => void;

    /** Show current logger config */
    showConfig: () => void;

    /** Send a test log */
    testLog: (level?: 'info' | 'warn' | 'error' | 'fatal') => void;

    /** Flush logs immediately */
    flush: () => Promise<void>;
}

declare global {
    interface Window {
        __LOGGER_TOOLS__: DevLoggerTools;
    }
}

/**
 * Initialize dev tools
 */
export function initDevLogger() {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
        return;
    }

    window.__LOGGER_TOOLS__ = {
        enableDebug: () => {
            console.log('🔧 Debug mode enabled');
            clientLogger.debug('Debug mode manually enabled');
        },

        disableDebug: () => {
            console.log('🔧 Debug mode disabled');
        },

        showConfig: () => {
            console.table(getLoggerConfig());
        },

        testLog: (level = 'info') => {
            const msg = `Test log entry at ${new Date().toLocaleTimeString()}`;
            const context = { demo: true, component: 'DevTools' };

            switch (level) {
                case 'info': clientLogger.info(msg, context); break;
                case 'warn': clientLogger.warn(msg, context); break;
                case 'error': clientLogger.error(new Error(msg), context); break;
                case 'fatal': clientLogger.fatal(new Error('CRITICAL FAILURE TEST'), context); break;
            }
            console.log(`Sent ${level} log to backend.`);
        },

        flush: async () => {
            await clientLogger.flush();
            console.log('Logs flushed to backend.');
        }
    };

    console.log(
        '%c 🪵 Logger Tools Available %c window.__LOGGER_TOOLS__',
        'background: #222; color: #bada55; font-size: 12px; padding: 4px; border-radius: 4px;',
        'color: #888; font-size: 11px;'
    );
}

// Auto-init on import in dev
initDevLogger();
