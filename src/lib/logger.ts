import { logDebug, logError, logWarning } from './error-logger';

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
   * @param context - Error context with component and action
   */
  error: (error: unknown, context?: { component?: string; action?: string }) => {
    logError(error, context);
  },
  
  /**
   * Log warning information (all environments)
   * @param message - Warning message
   * @param context - Warning context with component
   */
  warn: (message: string, context?: { component?: string }) => {
    logWarning(message, context);
  },
};
