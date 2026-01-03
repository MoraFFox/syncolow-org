/**
 * Core Logger
 * 
 * The main entry point for the enterprise logging system.
 * Orchestrates:
 * 1. Log Entry Construction (Builder)
 * 2. Context Integration (Correlation/Trace)
 * 3. Sampling (Rate Limiting)
 * 4. Buffering (Batching)
 * 5. Transport Dispatch
 */

// import { headers } from 'next/headers'; // Removed to prevent client-side build errors
import { LogEntryBuilder } from './log-entry-builder';
import { getLoggerConfig } from './logger-config';
import { LoggerBuffer } from './logger-buffer';
import { LoggerSampler } from './logger-sampler';
import { transportRegistry } from './logger-transports/base-transport';
// Import transports to ensure they register
import './logger-transports/console-transport';
import './logger-transports/file-transport';
import './logger-transports/http-transport';
// import './logger-transports/cloudwatch-transport'; // Dynamic or conditional import recommended 
import {
  getTraceContext,
  getCorrelationId,
  // parseTraceHeaders, // Unused without headers()
  TraceContext
} from './correlation-context';
// import { errorHelpers } from './error-logger'; // Unused in this file
import type { LogLevel, LogContext } from '@/types/log-entry';

// Singleton instances
let loggerBuffer: LoggerBuffer | null = null;
let loggerSampler: LoggerSampler | null = null;
let isInitialized = false;

/**
 * Initialize the logging subsystem
 */
function initLogger() {
  if (isInitialized) return;

  // Register transports from config
  // Note: Transports are self-registering via imports, 
  // but we need to configure usage from config.transports

  const config = getLoggerConfig();

  // 1. Define flush handler first
  const onFlush = async (entries: import('@/types/log-entry').LogEntry[]) => {
    const activeTransports = config.transports
      .filter(t => t.enabled)
      .map(tCfg => transportRegistry.create(tCfg))
      .filter(t => t !== undefined);

    await Promise.all(activeTransports.map(t => t!.logBatch(entries)));
  };

  // 2. Instantiate buffer with handler and config
  loggerBuffer = new LoggerBuffer(onFlush, config.buffer);
  loggerSampler = new LoggerSampler(config.sampling);

  // Hook buffer to transports - handler is already set in constructor

  // Handle shutdown
  if (typeof process !== 'undefined') {
    process.on('SIGTERM', async () => {
      await loggerBuffer?.flush();
    });
  }

  isInitialized = true;
}

/**
 * Get current request context, trying AsyncLocalStorage first
 */
function getCurrentContext(): Partial<TraceContext> {
  // 1. Try AsyncLocalStorage (best for deep call stacks)
  const context = getTraceContext();
  if (context) return context;

  // 2. Fallback: Check if we can infer anything else or generate ID
  // Note: next/headers() is async in newer Next.js versions and cannot be used synchronously here.
  // We rely on the app to wrap requests in correlation-context ALS.

  return {
    correlationId: getCorrelationId() // Might still define correlation ID
  };
}

/**
 * Main Logger Implementation
 */
class Logger {
  constructor() {
    initLogger();
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    // 1. Check Sampling
    if (loggerSampler && !loggerSampler.shouldSample(level, context)) {
      return;
    }

    // 2. Get Trace Context
    const traceContext = getCurrentContext();

    // 3. Build Entry
    const builder = new LogEntryBuilder()
      .level(level)
      .message(message)
      .context(context || {});
    // .timestamp is set automatically in constructor

    if (error) {
      builder.error(error);
    }

    if (traceContext.correlationId) builder.correlationId(traceContext.correlationId);

    // Use trace() helper for traceId and spanId
    if (traceContext.traceId) {
      builder.trace(traceContext.traceId, traceContext.spanId);
    }

    if (traceContext.userId) builder.user(traceContext.userId);

    const entry = builder.build();

    // 4. Buffer / Dispatch
    if (loggerBuffer) {
      loggerBuffer.add(entry);
    } else {
      // Fallback if buffer init failed
      console.error(JSON.stringify(entry));
    }
  }

  public debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  public info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  public error(message: string | Error | unknown, context?: LogContext, error?: unknown) {
    if (message instanceof Error) {
      this.log('error', message.message, context, message);
    } else if (typeof message === 'string') {
      this.log('error', message, context, error);
    } else {
      this.log('error', 'Unknown Error', context, message);
    }
  }

  public fatal(message: string, context?: LogContext, error?: unknown) {
    this.log('fatal', message, context, error);
  }

  public trace(message: string, context?: LogContext) {
    this.log('trace', message, context);
  }

  /**
   * Force flush all buffers
   */
  public async flush() {
    if (loggerBuffer) {
      await loggerBuffer.flush();
    }
  }
}

export const logger = new Logger();
