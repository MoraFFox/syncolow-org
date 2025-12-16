-- Migration: Create system_settings table
-- Purpose: Persist global application settings (like report configurations)

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Users
DROP POLICY IF EXISTS "Authenticated users can view system settings" ON system_settings;
CREATE POLICY "Authenticated users can view system settings" ON system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert system settings" ON system_settings;
CREATE POLICY "Authenticated users can insert system settings" ON system_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update system settings" ON system_settings;
CREATE POLICY "Authenticated users can update system settings" ON system_settings
  FOR UPDATE USING (auth.role() = 'authenticated');
