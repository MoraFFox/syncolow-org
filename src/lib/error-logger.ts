/* eslint-disable no-console */
/**
 * Global Error Logger Utility
 *
 * Provides comprehensive error logging with context for debugging.
 * - Development: Emoji console groups for readability
 * - Production: Structured JSON logs for machine parsing
 */


interface ErrorLogContext {
  component?: string;
  action?: string;
  data?: unknown;
  userId?: string;
}

/** Keys that should be redacted from logs to prevent PII leakage */
const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'apikey', 'authorization', 'cookie', 'session',
  'creditcard', 'cardnumber', 'cvv', 'cvc', 'expiry', 'ssn', 'socialsecurity',
  'email', 'phonenumber', 'phone', 'mobile', 'address', 'zipcode', 'postalcode',
  'dob', 'dateofbirth', 'birthdate', 'passport', 'license', 'nationalid',
  'bankaccount', 'routingnumber', 'iban', 'swift', 'pin',
];

/** Regex patterns for detecting PII in string values */
const PII_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: 'phone', pattern: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g },
  { name: 'creditCard', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
  { name: 'ssn', pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g },
];

/**
 * Safely serialize data to JSON, catching circular references and BigInt.
 * @param data - The data to serialize
 * @returns JSON string or fallback marker
 */
function safeSerialize(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return '[unserializable context]';
  }
}

/**
 * Redact sensitive fields from an object to prevent PII leakage.
 * @param data - The data to redact
 * @returns Redacted copy of the data
 */
// Redaction Logic
function redactSensitiveFields(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(redactSensitiveFields);

  const redacted = { ...data } as Record<string, unknown>;
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();

    // Check key match
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      redacted[key] = '[REDACTED]';
      continue;
    }

    // Check value match using regex
    const val = redacted[key];
    if (typeof val === 'string') {
      let newVal = val;
      PII_PATTERNS.forEach(p => {
        newVal = newVal.replace(p.pattern, `[REDACTED-${p.name.toUpperCase()}]`);
      });
      redacted[key] = newVal;
    } else {
      redacted[key] = redactSensitiveFields(val);
    }
  }
  return redacted;
}

export const logInfo = (message: string, context?: unknown) => {
  // Fallback logging - used only when main logger is disabled or failing
  console.log(`INFO: ${message}`, safeSerialize(redactSensitiveFields(context)));
};

export const logWarning = (message: string, context?: unknown) => {
  console.warn(`WARN: ${message}`, safeSerialize(redactSensitiveFields(context)));
};

export const logError = (error: unknown, context?: unknown) => {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${errMsg}`, safeSerialize(redactSensitiveFields(context)));
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
};

export const logDebug = (message: string, data?: unknown) => {
  console.debug(`DEBUG: ${message}`, safeSerialize(redactSensitiveFields(data)));
};

// Exporting helpers for the main logger to use if needed
export const errorHelpers = {
  redactSensitiveFields,
  safeSerialize
};


const isDev = () => process.env.NODE_ENV === 'development';

/**
 * Log a Supabase error with PostgreSQL details
 */
export function logSupabaseError(error: Record<string, unknown> | null, context: ErrorLogContext = {}) {
  const timestamp = new Date().toISOString();
  const redactedContext = redactSensitiveFields(context) as ErrorLogContext;

  if (isDev()) {
    console.group(`🔴 SUPABASE ERROR [${timestamp}]`);

    if (redactedContext.component) console.log('📍 Component:', redactedContext.component);
    if (redactedContext.action) console.log('⚡ Action:', redactedContext.action);

    // Supabase-specific error details
    if (error?.message) console.error('💬 Message:', error.message);
    if (error?.code) console.error('🔢 Error Code:', error.code);
    if (error?.details) console.error('📋 Details:', error.details);
    if (error?.hint) console.error('💡 Hint:', error.hint);

    // PostgreSQL error info
    if (typeof error?.code === 'string' && error.code.startsWith('P')) {
      console.error('🐘 PostgreSQL Error Code:', error.code);
    }

    // Full error object
    console.error('🔍 Full Error Object:', error);

    if (redactedContext.data) {
      console.log('📦 Request Data:', safeSerialize(redactedContext.data));
    }

    console.groupEnd();
  } else {
    // Production: structured JSON log
    console.error(
      safeSerialize({
        level: 'error',
        timestamp,
        message: error?.message ?? 'Supabase error',
        error: {
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        },
        component: redactedContext.component,
        action: redactedContext.action,
        data: redactedContext.data,
      })
    );
  }
}

/**
 * Log successful operations (development only)
 */
export function logSuccess(message: string, context: ErrorLogContext = {}) {
  if (isDev()) {
    const timestamp = new Date().toISOString();
    console.log(`✅ SUCCESS [${timestamp}]: ${message}`, context.data ?? '');
  }
}
