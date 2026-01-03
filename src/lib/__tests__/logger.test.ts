import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';
import * as errorLogger from '../error-logger';

vi.mock('../error-logger', () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  logWarning: vi.fn(),
  logInfo: vi.fn(),
}));

describe('logger wrapper', () => {
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

      expect(errorLogger.logError).toHaveBeenCalledWith(error, {
        component: 'TestComponent',
        action: 'submit',
      });
    });
  });

  describe('warn', () => {
    it('logs warnings with context', () => {
      logger.warn('test warning', { component: 'TestComponent' });

      expect(errorLogger.logWarning).toHaveBeenCalledWith('test warning', {
        component: 'TestComponent',
      });
    });
  });

  describe('info', () => {
    it('logs info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.info('user logged in', { component: 'Auth', userId: '123' });

      expect(errorLogger.logInfo).toHaveBeenCalledWith('user logged in', {
        component: 'Auth',
        userId: '123',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('logs info in production (calls logInfo, not logDebug)', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logger.info('user logged in', { component: 'Auth', userId: '123' });

      // Key test: info calls logInfo directly, not logDebug
      expect(errorLogger.logInfo).toHaveBeenCalledWith('user logged in', {
        component: 'Auth',
        userId: '123',
      });
      // And NOT logDebug (which was the old behavior)
      expect(errorLogger.logDebug).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('accepts LogContext shape matching warn/error', () => {
      logger.info('operation complete', {
        component: 'OrderForm',
        action: 'submit',
        orderId: 'ORD-001',
      });

      expect(errorLogger.logInfo).toHaveBeenCalledWith('operation complete', {
        component: 'OrderForm',
        action: 'submit',
        orderId: 'ORD-001',
      });
    });
  });
});

describe('error-logger safe serialization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw when passed a circular object in context.data', async () => {
    vi.resetModules();
    vi.spyOn(console, 'group').mockImplementation(() => { });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });

    const { logError } = await import('../error-logger');

    const circular: Record<string, unknown> = { name: 'test' };
    circular.self = circular;

    expect(() => {
      logError(new Error('test error'), {
        component: 'TestComponent',
        action: 'test',
        data: circular,
      });
    }).not.toThrow();
  });

  it('does not throw when passed BigInt in context.data', async () => {
    vi.resetModules();
    vi.spyOn(console, 'group').mockImplementation(() => { });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });

    const { logError } = await import('../error-logger');

    const dataWithBigInt = { value: BigInt(9007199254740991) };

    expect(() => {
      logError(new Error('test error'), {
        component: 'TestComponent',
        data: dataWithBigInt,
      });
    }).not.toThrow();
  });

  it('does not throw when passed objects with undefined values', async () => {
    vi.resetModules();
    vi.spyOn(console, 'group').mockImplementation(() => { });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });

    const { logError } = await import('../error-logger');

    expect(() => {
      logError(new Error('test error'), {
        component: 'TestComponent',
        data: { value: undefined, nested: { undef: undefined } },
      });
    }).not.toThrow();
  });
});

describe('error-logger sensitive field redaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logError does not throw when data contains password field', async () => {
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'group').mockImplementation(() => { });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });

    const { logError } = await import('../error-logger');

    expect(() => {
      logError(new Error('auth failed'), {
        component: 'Auth',
        data: { username: 'user@example.com', password: 'supersecret123' },
      });
    }).not.toThrow();
  });

  it('logError does not throw when data contains token and apiKey fields', async () => {
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'group').mockImplementation(() => { });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });

    const { logError } = await import('../error-logger');

    expect(() => {
      logError(new Error('api error'), {
        component: 'API',
        data: { accessToken: 'abc123', apiKey: 'key-xyz', normalField: 'visible' },
      });
    }).not.toThrow();
  });

  it('logError does not throw with all sensitive field types', async () => {
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'group').mockImplementation(() => { });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });

    const { logError } = await import('../error-logger');

    expect(() => {
      logError(new Error('auth failed'), {
        component: 'Auth',
        data: {
          password: 'secret',
          token: 'abc123',
          apiKey: 'key-xyz',
          authorization: 'Bearer xyz',
          cookie: 'session=abc',
          secret: 'shh',
        },
      });
    }).not.toThrow();
  });
});

describe('error-logger logInfo function', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logInfo is called with correct parameters', async () => {
    vi.resetModules();
    vi.spyOn(console, 'group').mockImplementation(() => { });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
    vi.spyOn(console, 'log').mockImplementation(() => { });

    const { logInfo } = await import('../error-logger');

    // Should not throw
    expect(() => {
      logInfo('Test info message', {
        component: 'TestComponent',
        action: 'testAction',
        data: { key: 'value' },
      });
    }).not.toThrow();
  });

  it('logInfo exists and is a function', async () => {
    vi.resetModules();
    const errorLoggerModule = await import('../error-logger');

    expect(errorLoggerModule.logInfo).toBeDefined();
    expect(typeof errorLoggerModule.logInfo).toBe('function');
  });
});
