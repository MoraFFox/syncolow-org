-- Migration: Create automation_tokens table for server-side token storage
-- Purpose: Allow automation to access Google Tasks tokens without browser cookies

CREATE TABLE IF NOT EXISTS automation_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_tasks', 'google_calendar', etc.
  tokens JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_automation_tokens_provider 
ON automation_tokens(provider);

CREATE INDEX IF NOT EXISTS idx_automation_tokens_user_provider 
ON automation_tokens(user_id, provider);

-- Enable Row Level Security
ALTER TABLE automation_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON automation_tokens;
CREATE POLICY "Users can view own tokens" ON automation_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tokens" ON automation_tokens;
CREATE POLICY "Users can insert own tokens" ON automation_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tokens" ON automation_tokens;
CREATE POLICY "Users can update own tokens" ON automation_tokens
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tokens" ON automation_tokens;
CREATE POLICY "Users can delete own tokens" ON automation_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Comment on table
COMMENT ON TABLE automation_tokens IS 'OAuth tokens for automation integrations (Google Tasks, Calendar, etc.)';
COMMENT ON COLUMN automation_tokens.provider IS 'Service provider identifier (e.g., google_tasks, google_calendar)';
COMMENT ON COLUMN automation_tokens.tokens IS 'OAuth tokens including access_token, refresh_token, expiry_date';
