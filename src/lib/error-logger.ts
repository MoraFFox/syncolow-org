/**
 * Global Error Logger Utility
 * 
 * Provides comprehensive error logging with context for debugging
 */

interface ErrorLogContext {
  component?: string;
  action?: string;
  data?: any;
  userId?: string;
}

/**
 * Log an error with full details to the console
 */
export function logError(error: unknown, context: ErrorLogContext = {}) {
  const timestamp = new Date().toISOString();
  
  console.group(`🔴 ERROR [${timestamp}]`);
  
  // Context information
  if (context.component) console.log('📍 Component:', context.component);
  if (context.action) console.log('⚡ Action:', context.action);
  if (context.userId) console.log('👤 User ID:', context.userId);
  
  // Error details
  if (error instanceof Error) {
    console.error('❌ Error Name:', error.name);
    console.error('💬 Error Message:', error.message);
    if (error.stack) {
      console.error('📚 Stack Trace:', error.stack);
    }
  } else {
    console.error('❌ Error:', error);
  }
  
  // Additional context data
  if (context.data) {
    console.log('📦 Context Data:', JSON.stringify(context.data, null, 2));
  }
  
  console.groupEnd();
  
  // Return formatted error for display
  return {
    message: error instanceof Error ? error.message : String(error),
    timestamp,
    context
  };
}

/**
 * Log a Supabase error with PostgreSQL details
 */
export function logSupabaseError(error: any, context: ErrorLogContext = {}) {
  const timestamp = new Date().toISOString();
  
  console.group(`🔴 SUPABASE ERROR [${timestamp}]`);
  
  if (context.component) console.log('📍 Component:', context.component);
  if (context.action) console.log('⚡ Action:', context.action);
  
  // Supabase-specific error details
  if (error?.message) console.error('💬 Message:', error.message);
  if (error?.code) console.error('🔢 Error Code:', error.code);
  if (error?.details) console.error('📋 Details:', error.details);
  if (error?.hint) console.error('💡 Hint:', error.hint);
  
  // PostgreSQL error info
  if (error?.code?.startsWith('P')) {
    console.error('🐘 PostgreSQL Error Code:', error.code);
  }
  
  // Full error object
  console.error('🔍 Full Error Object:', error);
  
  if (context.data) {
    console.log('📦 Request Data:', JSON.stringify(context.data, null, 2));
  }
  
  console.groupEnd();
}

/**
 * Log a warning
 */
export function logWarning(message: string, context: ErrorLogContext = {}) {
  const timestamp = new Date().toISOString();
  
  console.group(`⚠️ WARNING [${timestamp}]`);
  console.warn('💬 Message:', message);
  
  if (context.component) console.log('📍 Component:', context.component);
  if (context.action) console.log('⚡ Action:', context.action);
  if (context.data) console.log('📦 Data:', context.data);
  
  console.groupEnd();
}

/**
 * Log debugging information
 */
export function logDebug(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔵 DEBUG: ${message}`, data || '');
  }
}

/**
 * Log successful operations (optional, for debugging)
 */
export function logSuccess(message: string, context: ErrorLogContext = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ SUCCESS: ${message}`, context.data || '');
  }
}
