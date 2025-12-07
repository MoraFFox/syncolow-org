-- Migration: Create user_settings table for notification preferences
-- Purpose: Persist user notification settings server-side for automation access

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT FALSE,
  email_address TEXT,
  digest_frequency TEXT DEFAULT 'disabled' CHECK (digest_frequency IN ('disabled', 'daily', 'weekly')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  notification_types JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/write their own settings
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Comment on table
COMMENT ON TABLE user_settings IS 'User notification preferences and settings';
COMMENT ON COLUMN user_settings.email_enabled IS 'Whether email notifications are enabled';
COMMENT ON COLUMN user_settings.digest_frequency IS 'Frequency of notification digest: disabled, daily, or weekly';
COMMENT ON COLUMN user_settings.quiet_hours_start IS 'Start time for quiet hours (no notifications)';
COMMENT ON COLUMN user_settings.quiet_hours_end IS 'End time for quiet hours';
COMMENT ON COLUMN user_settings.notification_types IS 'JSON object mapping notification type IDs to enabled status';
