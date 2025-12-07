import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';
import * as errorLogger from '../error-logger';

vi.mock('../error-logger', () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  logWarning: vi.fn(),
}));

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('debug', () => {
    it('logs in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      logger.debug('test message', { data: 'test' });
      
      expect(errorLogger.logDebug).toHaveBeenCalledWith('test message', { data: 'test' });
      
      process.env.NODE_ENV = originalEnv;
    });

    it('does not log in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      logger.debug('test message');
      
      expect(errorLogger.logDebug).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('error', () => {
    it('logs errors with context', () => {
      const error = new Error('test error');
      logger.error(error, { component: 'TestComponent', action: 'submit' });
      
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        { component: 'TestComponent', action: 'submit' }
      );
    });
  });

  describe('warn', () => {
    it('logs warnings with context', () => {
      logger.warn('test warning', { component: 'TestComponent' });
      
      expect(errorLogger.logWarning).toHaveBeenCalledWith(
        'test warning',
        { component: 'TestComponent' }
      );
    });
  });
});
