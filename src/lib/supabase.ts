import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  logger.error(error, { component: 'supabase', action: 'initialize' });
  
  // Always throw when required environment variables are missing to prevent
  // runtime errors with undefined values. Test environments should provide
  // these variables or mock this module at the test setup level.
  throw error;
}

// Client for browser (with RLS)
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl!, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase;
