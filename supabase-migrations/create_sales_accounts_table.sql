-- Migration: Create sales_accounts table
-- Purpose: Store user-defined Sales Accounts for order categorization

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sales_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- Create indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_sales_accounts_user_id ON sales_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_accounts_code ON sales_accounts(user_id, code);

-- Enable Row Level Security
ALTER TABLE sales_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own accounts
DROP POLICY IF EXISTS "Users can view own accounts" ON sales_accounts;
CREATE POLICY "Users can view own accounts" ON sales_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own accounts
DROP POLICY IF EXISTS "Users can insert own accounts" ON sales_accounts;
CREATE POLICY "Users can insert own accounts" ON sales_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own accounts
DROP POLICY IF EXISTS "Users can update own accounts" ON sales_accounts;
CREATE POLICY "Users can update own accounts" ON sales_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own accounts
DROP POLICY IF EXISTS "Users can delete own accounts" ON sales_accounts;
CREATE POLICY "Users can delete own accounts" ON sales_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Function to ensure only one default account per user
CREATE OR REPLACE FUNCTION ensure_single_default_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE sales_accounts 
    SET is_default = FALSE, updated_at = NOW()
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default
DROP TRIGGER IF EXISTS trigger_single_default_account ON sales_accounts;
CREATE TRIGGER trigger_single_default_account
  AFTER INSERT OR UPDATE OF is_default ON sales_accounts
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_account();

-- Comments
COMMENT ON TABLE sales_accounts IS 'User-defined sales accounts for categorizing orders';
COMMENT ON COLUMN sales_accounts.code IS 'The "Cust Account" code from import files';
COMMENT ON COLUMN sales_accounts.name IS 'Display name (e.g., Retail, Hotels)';
COMMENT ON COLUMN sales_accounts.color IS 'Hex color code for UI badges';
COMMENT ON COLUMN sales_accounts.is_default IS 'If true, used when no account code is specified in imports';
