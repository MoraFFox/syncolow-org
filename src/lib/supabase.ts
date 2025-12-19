import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Check if mock data mode is enabled
 * When true, the app reads from the mock_data schema instead of public
 */
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' && process.env.NODE_ENV !== 'production';

/**
 * Get the target database schema
 */
const targetSchema = useMockData ? 'mock_data' : 'public';

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('Missing Supabase environment variables', { component: 'supabase' });
  }
}

// Log which schema is being used (helpful for debugging)
if (useMockData) {
  logger.info('🎭 Mock Data Mode ENABLED - Reading from mock_data schema', { 
    component: 'supabase',
    schema: targetSchema 
  });
}

// Client for browser (with RLS)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: targetSchema,
      },
    })
  : null as any;

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: targetSchema,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase;

/**
 * Check if mock data mode is currently active
 */
export function isMockDataMode(): boolean {
  return useMockData;
}

/**
 * Get the current database schema being used
 */
export function getCurrentSchema(): string {
  return targetSchema;
}

