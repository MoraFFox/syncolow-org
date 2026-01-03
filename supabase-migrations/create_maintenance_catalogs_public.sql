-- =============================================================================
-- Maintenance Catalog Tables Migration (PUBLIC SCHEMA)
-- =============================================================================

-- =============================================================================
-- Service Catalog Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_service_catalog_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    default_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, name)
);

-- Create view with camelCase columns for client consumption
CREATE OR REPLACE VIEW public."maintenanceServiceCatalog" AS
SELECT
    id,
    category,
    name,
    default_cost AS "defaultCost",
    description,
    is_active AS "isActive",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
FROM public.maintenance_service_catalog_data;

-- =============================================================================
-- Spare Parts Catalog Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_parts_catalog_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    default_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    sku TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, name)
);

-- Create view with camelCase columns
CREATE OR REPLACE VIEW public."maintenancePartsCatalog" AS
SELECT
    id,
    category,
    name,
    default_price AS "defaultPrice",
    description,
    sku,
    is_active AS "isActive",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
FROM public.maintenance_parts_catalog_data;

-- =============================================================================
-- Problems Catalog Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_problems_catalog_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    problem TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    suggested_resolution TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, problem)
);

-- Create view with camelCase columns
CREATE OR REPLACE VIEW public."maintenanceProblemsCatalog" AS
SELECT
    id,
    category,
    problem,
    severity,
    suggested_resolution AS "suggestedResolution",
    is_active AS "isActive",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
FROM public.maintenance_problems_catalog_data;

-- =============================================================================
-- Indexes for better query performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_service_catalog_category 
    ON public.maintenance_service_catalog_data(category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_active 
    ON public.maintenance_service_catalog_data(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_parts_catalog_category 
    ON public.maintenance_parts_catalog_data(category);
CREATE INDEX IF NOT EXISTS idx_parts_catalog_active 
    ON public.maintenance_parts_catalog_data(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_problems_catalog_category 
    ON public.maintenance_problems_catalog_data(category);
CREATE INDEX IF NOT EXISTS idx_problems_catalog_active 
    ON public.maintenance_problems_catalog_data(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- Seed initial data
-- =============================================================================

INSERT INTO public.maintenance_service_catalog_data (category, name, default_cost) VALUES
    ('Installation', 'Machine Installation', 500),
    ('Installation', 'Plumbing Connection', 150),
    ('Installation', 'Electrical Setup', 100),
    ('Repair', 'General Repair', 200),
    ('Repair', 'Pump Replacement', 350),
    ('Repair', 'Heating Element Repair', 250),
    ('Repair', 'Grinder Repair', 300),
    ('Cleaning', 'Deep Cleaning', 100),
    ('Cleaning', 'Descaling', 75),
    ('Cleaning', 'Filter Replacement', 50),
    ('Calibration', 'Pressure Calibration', 80),
    ('Calibration', 'Temperature Calibration', 80),
    ('Calibration', 'Grind Size Adjustment', 60),
    ('Inspection', 'Full Inspection', 120),
    ('Inspection', 'Safety Check', 80),
    ('Inspection', 'Performance Test', 100)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO public.maintenance_parts_catalog_data (category, name, default_price) VALUES
    ('Pumps', 'Water Pump', 250),
    ('Pumps', 'Milk Pump', 180),
    ('Pumps', 'Vacuum Pump', 220),
    ('Grinders', 'Burr Set', 150),
    ('Grinders', 'Grinder Motor', 300),
    ('Grinders', 'Adjustment Ring', 45),
    ('Heating', 'Heating Element', 180),
    ('Heating', 'Thermostat', 95),
    ('Heating', 'Temperature Probe', 65),
    ('Filters', 'Water Filter', 35),
    ('Filters', 'Group Head Gasket', 15),
    ('Filters', 'Portafilter Basket', 25),
    ('Valves', 'Solenoid Valve', 120),
    ('Valves', 'Steam Valve', 85),
    ('Valves', 'Pressure Relief Valve', 70),
    ('Electronics', 'Control Board', 450),
    ('Electronics', 'Display Module', 200),
    ('Electronics', 'Power Supply', 150)
ON CONFLICT (category, name) DO NOTHING;

INSERT INTO public.maintenance_problems_catalog_data (category, problem, severity) VALUES
    ('Water System', 'No water flow', 'high'),
    ('Water System', 'Low water pressure', 'medium'),
    ('Water System', 'Water leaking', 'high'),
    ('Water System', 'Strange taste in water', 'medium'),
    ('Heating', 'Not heating', 'critical'),
    ('Heating', 'Overheating', 'critical'),
    ('Heating', 'Temperature fluctuation', 'medium'),
    ('Heating', 'Slow heating', 'low'),
    ('Grinder', 'Grinder not working', 'high'),
    ('Grinder', 'Inconsistent grind', 'medium'),
    ('Grinder', 'Strange noise from grinder', 'medium'),
    ('Grinder', 'Coffee grounds everywhere', 'low'),
    ('Steam', 'No steam', 'high'),
    ('Steam', 'Weak steam pressure', 'medium'),
    ('Steam', 'Steam wand clogged', 'low'),
    ('Electrical', 'Machine not powering on', 'critical'),
    ('Electrical', 'Display not working', 'medium'),
    ('Electrical', 'Buttons unresponsive', 'medium'),
    ('Performance', 'Poor coffee quality', 'medium'),
    ('Performance', 'Machine running slow', 'low'),
    ('Performance', 'Unusual noise during operation', 'medium')
ON CONFLICT (category, problem) DO NOTHING;

-- =============================================================================
-- Enable RLS
-- =============================================================================
ALTER TABLE public.maintenance_service_catalog_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_parts_catalog_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_problems_catalog_data ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON public.maintenance_service_catalog_data
    FOR ALL USING (true);
    
CREATE POLICY "Allow all for authenticated users" ON public.maintenance_parts_catalog_data
    FOR ALL USING (true);
    
CREATE POLICY "Allow all for authenticated users" ON public.maintenance_problems_catalog_data
    FOR ALL USING (true);
