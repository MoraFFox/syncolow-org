/**
 * Isomorphic Logger Facade
 * 
 * This file serves as the universal entry point for logging across the application.
 * It automatically delegates to:
 * - `client-logger.ts` when running in the browser
 * - `server-side-logger.ts` when running in Node.js/Next.js Server environment
 * 
 * This prevents server-only dependencies (fs, next/headers) from breaking client builds.
 */

import { LogContext } from '@/types/log-entry';
import { clientLogger } from './client-logger';
import { errorHelpers } from './error-logger';

// Type definition for the logger interface
interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string | Error | unknown, context?: LogContext, error?: unknown): void;
  fatal(message: string, context?: LogContext, error?: unknown): void;
  trace(message: string, context?: LogContext): void;
  flush(): Promise<void>;
}

const isServer = typeof window === 'undefined';

// Internal variable to hold the server logger instance lazily
let serverLoggerInstance: ILogger | null = null;

/**
 * Lazily load the server logger to ensure server-only modules 
 * are not evaluated in the browser bundle.
 */
function getServerLogger(): ILogger {
  if (serverLoggerInstance) return serverLoggerInstance;

  if (isServer) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { logger } = require('./server-side-logger');
      serverLoggerInstance = logger;
      return serverLoggerInstance!;
    } catch (error) {
      console.error('Failed to load server-side-logger', error);
      // Fallback to console if server logger fails to load
      return consoleLogger;
    }
  }

  // Should not happen if logic is correct, but safe fallback
  return consoleLogger;
}

// Simple console fallback just in case
const consoleLogger: ILogger = {
  debug: (msg, ctx) => console.debug(msg, ctx),
  info: (msg, ctx) => console.log(msg, ctx),
  warn: (msg, ctx) => console.warn(msg, ctx),
  error: (msg, ctx, err) => console.error(msg, ctx, err),
  fatal: (msg, ctx, err) => console.error('FATAL:', msg, ctx, err),
  trace: (msg, ctx) => console.trace(msg, ctx),
  flush: async () => { },
};

// The Facade Implementation
export const logger: ILogger = {
  debug(message: string, context?: LogContext) {
    if (isServer) getServerLogger().debug(message, context);
    else clientLogger.debug(message, context);
  },

  info(message: string, context?: LogContext) {
    if (isServer) getServerLogger().info(message, context);
    else clientLogger.info(message, context);
  },

  warn(message: string, context?: LogContext) {
    if (isServer) getServerLogger().warn(message, context);
    else clientLogger.warn(message, context);
  },

  error(message: string | Error | unknown, context?: LogContext, error?: unknown) {
    if (isServer) getServerLogger().error(message, context, error);
    else clientLogger.error(message instanceof Error ? message : String(message), context);
  },

  fatal(message: string, context?: LogContext, error?: unknown) {
    if (isServer) getServerLogger().fatal(message, context, error);
    else clientLogger.fatal(message, context);
  },

  trace(message: string, context?: LogContext) {
    if (isServer) getServerLogger().trace(message, context);
    else clientLogger.trace(message, context);
  },

  async flush() {
    if (isServer) await getServerLogger().flush();
    else await clientLogger.flush();
  }
};

// Re-export error helpers for compatibility
export { errorHelpers };
