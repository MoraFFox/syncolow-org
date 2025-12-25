-- Migration to support multiple codes per sales account

-- 1. Add new column 'codes' as a text array
ALTER TABLE sales_accounts 
ADD COLUMN codes TEXT[] DEFAULT '{}';

-- 2. Migrate existing data: move 'code' value into 'codes' array
UPDATE sales_accounts 
SET codes = ARRAY[code] 
WHERE code IS NOT NULL;

-- 3. Drop the old 'code' column
-- Note: You might want to remove the specific UNIQUE constraint on (user_id, code) first if strict mode prevents dropping.
-- But usually dropping the column drops the constraint.
ALTER TABLE sales_accounts 
DROP COLUMN code;

-- 4. Add GIN index for faster array searching (optional but good for 'contains' queries)
-- CREATE INDEX idx_sales_accounts_codes ON sales_accounts USING GIN (codes);
