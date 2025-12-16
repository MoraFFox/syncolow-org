
-- Migration: Add orders_view_mode to user_settings table
-- Purpose: Persist the list/grid preference for Orders page

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS orders_view_mode TEXT DEFAULT 'list';

COMMENT ON COLUMN user_settings.orders_view_mode IS 'Preferred layout for orders page (list vs grid)';
