-- Migration: Add suspension fields to companies table
-- Purpose: Support automated order suspension for overdue payments

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Add index for quick lookups of suspended companies
CREATE INDEX IF NOT EXISTS idx_companies_is_suspended 
ON companies(is_suspended) 
WHERE is_suspended = TRUE;

-- Comment on columns
COMMENT ON COLUMN companies.is_suspended IS 'Whether new orders are suspended for this company';
COMMENT ON COLUMN companies.suspension_reason IS 'Reason for order suspension (e.g., payment overdue)';
