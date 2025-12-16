
-- Migration: Add view settings to user_settings table
-- Purpose: Store view mode and pagination preferences per user

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS view_mode TEXT DEFAULT 'Comfortable',
ADD COLUMN IF NOT EXISTS pagination_limit INTEGER DEFAULT 20;

COMMENT ON COLUMN user_settings.view_mode IS 'Preferred view density/mode';
COMMENT ON COLUMN user_settings.pagination_limit IS 'Items per page preference';
