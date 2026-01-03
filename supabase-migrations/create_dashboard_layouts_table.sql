-- Migration: Create dashboard_layouts table for Custom Dashboard Builder
-- Description: Stores user-customizable dashboard layouts with widget configurations

-- Create the dashboard_layouts table
CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT 'My Dashboard',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    layout JSONB NOT NULL DEFAULT '{"widgets": [], "columns": 12, "rowHeight": 100}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.dashboard_layouts IS 'User-customizable analytics dashboard layouts';

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON public.dashboard_layouts(user_id);

-- Create index for default layout lookup
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_default ON public.dashboard_layouts(user_id, is_default) WHERE is_default = TRUE;

-- Enable Row Level Security
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own layouts
CREATE POLICY "Users can view own layouts"
    ON public.dashboard_layouts
    FOR SELECT
    USING (user_id = auth.uid());

-- RLS Policy: Users can only insert their own layouts
CREATE POLICY "Users can create own layouts"
    ON public.dashboard_layouts
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can only update their own layouts
CREATE POLICY "Users can update own layouts"
    ON public.dashboard_layouts
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can only delete their own layouts
CREATE POLICY "Users can delete own layouts"
    ON public.dashboard_layouts
    FOR DELETE
    USING (user_id = auth.uid());

-- Create a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_dashboard_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dashboard_layouts_updated_at
    BEFORE UPDATE ON public.dashboard_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_layouts_updated_at();
