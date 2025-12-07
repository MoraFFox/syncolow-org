import { logDebug, logError, logWarning } from './error-logger';

/**
 * Context type for logger methods that allows component, action, and additional properties
 */
interface LogContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

/**
 * Centralized logging utility that wraps the error-logger service.
 * Automatically handles development vs production logging.
 * 
 * @example
 * ```typescript
 * logger.debug('User action', { userId: '123' });
 * logger.error(error, { component: 'OrderForm', action: 'submit' });
 * logger.warn('Deprecated API used', { component: 'ProductList' });
 * ```
 */
export const logger = {
  /**
   * Log debug information (development only)
   * @param message - Debug message
   * @param data - Additional context data
   */
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      logDebug(message, data);
    }
  },
  
  /**
   * Log error information (all environments)
   * @param error - Error object or message
   * @param context - Error context with component, action, and additional properties
   */
  error: (error: unknown, context?: LogContext) => {
    logError(error, context);
  },
  
  /**
   * Log warning information (all environments)
   * @param message - Warning message
   * @param context - Warning context with component and additional properties
   */
  warn: (message: string, context?: LogContext) => {
    logWarning(message, context);
  },
};

