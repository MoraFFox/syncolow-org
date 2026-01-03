-- ============================================================================
-- Maintenance Follow-Up System Enhancement Migration
-- 
-- Adds missing columns for robust follow-up chain tracking:
-- - rootVisitId: Links follow-ups to the original visit
-- - totalVisits: Cached count of visits in the chain
-- - chainDepth: Depth of current visit in the chain (0 = root)
-- - priority: Escalation priority level
-- - slaDeadline: Service level agreement deadline
-- - lastEscalatedAt: Timestamp of last escalation
--
-- Also creates:
-- - Maintenance audit table for 1-year retention
-- - Aggregate calculation function for atomic updates
-- - Indexes for performance
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO MAINTENANCE TABLE
-- ============================================================================

-- Follow-up chain columns
ALTER TABLE maintenance 
ADD COLUMN IF NOT EXISTS "rootVisitId" UUID REFERENCES maintenance(id) ON DELETE SET NULL;

ALTER TABLE maintenance 
ADD COLUMN IF NOT EXISTS "totalVisits" INTEGER DEFAULT 1;

ALTER TABLE maintenance 
ADD COLUMN IF NOT EXISTS "chainDepth" INTEGER DEFAULT 0;

-- Priority and SLA columns
ALTER TABLE maintenance 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Add check constraint for priority (separate statement for compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_priority_check'
  ) THEN
    ALTER TABLE maintenance 
    ADD CONSTRAINT maintenance_priority_check 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

ALTER TABLE maintenance 
ADD COLUMN IF NOT EXISTS "slaDeadline" TIMESTAMP WITH TIME ZONE;

ALTER TABLE maintenance 
ADD COLUMN IF NOT EXISTS "lastEscalatedAt" TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_maintenance_root_visit 
ON maintenance("rootVisitId");

CREATE INDEX IF NOT EXISTS idx_maintenance_status 
ON maintenance(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled_date 
ON maintenance("scheduledDate");

CREATE INDEX IF NOT EXISTS idx_maintenance_company_branch 
ON maintenance("companyId", "branchId");

CREATE INDEX IF NOT EXISTS idx_maintenance_chain_depth 
ON maintenance("chainDepth") WHERE "chainDepth" > 0;

-- ============================================================================
-- 3. CREATE MAINTENANCE AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES maintenance(id) ON DELETE CASCADE,
  root_visit_id UUID REFERENCES maintenance(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created', 
    'updated', 
    'status_changed', 
    'follow_up_created', 
    'completed', 
    'cancelled', 
    'escalated',
    'problem_added',
    'parts_added',
    'technician_assigned'
  )),
  actor_id UUID,
  actor_name TEXT,
  previous_status TEXT,
  new_status TEXT,
  previous_state JSONB,
  new_state JSONB,
  changes JSONB, -- Delta only for efficient storage
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_visit_id 
ON maintenance_audit(visit_id);

CREATE INDEX IF NOT EXISTS idx_audit_root_visit_id 
ON maintenance_audit(root_visit_id);

CREATE INDEX IF NOT EXISTS idx_audit_created_at 
ON maintenance_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action 
ON maintenance_audit(action);

-- ============================================================================
-- 4. CREATE AGGREGATE CALCULATION FUNCTION (ATOMIC OPERATION)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_maintenance_aggregates(p_root_visit_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_visits INTEGER;
  v_total_cost DECIMAL;
  v_labor_total DECIMAL;
  v_parts_total DECIMAL;
  v_resolution_time INTEGER;
  v_root_date TIMESTAMP WITH TIME ZONE;
  v_final_resolution_date TIMESTAMP WITH TIME ZONE;
  v_average_delay DECIMAL;
  v_result JSONB;
BEGIN
  -- Get root visit date
  SELECT date INTO v_root_date
  FROM maintenance
  WHERE id = p_root_visit_id;

  -- Calculate aggregates from all visits in the chain
  SELECT 
    COUNT(*),
    COALESCE(SUM(COALESCE("laborCost", 0)), 0),
    COALESCE(SUM(
      COALESCE((
        SELECT SUM(
          COALESCE((p->>'price')::DECIMAL, 0) * COALESCE((p->>'quantity')::INTEGER, 1)
        )
        FROM jsonb_array_elements(COALESCE("spareParts", '[]'::jsonb)) p
      ), 0)
    ), 0),
    COALESCE(AVG(COALESCE("delayDays", 0)), 0)
  INTO v_total_visits, v_labor_total, v_parts_total, v_average_delay
  FROM maintenance
  WHERE id = p_root_visit_id OR "rootVisitId" = p_root_visit_id;

  v_total_cost := v_labor_total + v_parts_total;

  -- Find the final resolution date (most recent completed visit)
  SELECT "resolutionDate" INTO v_final_resolution_date
  FROM maintenance
  WHERE (id = p_root_visit_id OR "rootVisitId" = p_root_visit_id)
    AND status = 'Completed'
    AND "resolutionDate" IS NOT NULL
  ORDER BY "resolutionDate" DESC
  LIMIT 1;

  -- Calculate resolution time in days
  IF v_root_date IS NOT NULL AND v_final_resolution_date IS NOT NULL THEN
    v_resolution_time := EXTRACT(DAY FROM v_final_resolution_date - v_root_date);
  ELSE
    v_resolution_time := NULL;
  END IF;

  -- Update the root visit with calculated aggregates
  UPDATE maintenance
  SET 
    "totalVisits" = v_total_visits,
    "totalCost" = v_total_cost,
    "resolutionTimeDays" = v_resolution_time,
    "averageDelayDays" = v_average_delay
  WHERE id = p_root_visit_id;

  -- Build result object
  v_result := jsonb_build_object(
    'totalVisits', v_total_visits,
    'totalCost', v_total_cost,
    'laborTotal', v_labor_total,
    'partsTotal', v_parts_total,
    'resolutionTimeDays', v_resolution_time,
    'averageDelayDays', v_average_delay
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE CHAIN DEPTH VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_maintenance_chain_info(p_root_visit_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_chain_count INTEGER;
  v_max_depth INTEGER;
  v_unresolved_problems TEXT[];
  v_last_technician TEXT;
  v_result JSONB;
BEGIN
  -- Count visits in chain and get max depth
  SELECT 
    COUNT(*),
    COALESCE(MAX("chainDepth"), 0)
  INTO v_chain_count, v_max_depth
  FROM maintenance
  WHERE id = p_root_visit_id OR "rootVisitId" = p_root_visit_id;

  -- Get unresolved problems from the most recent non-completed visit
  SELECT "problemReason" INTO v_unresolved_problems
  FROM maintenance
  WHERE (id = p_root_visit_id OR "rootVisitId" = p_root_visit_id)
    AND status != 'Completed'
    AND status != 'Cancelled'
  ORDER BY date DESC
  LIMIT 1;

  -- Get last assigned technician
  SELECT "technicianName" INTO v_last_technician
  FROM maintenance
  WHERE (id = p_root_visit_id OR "rootVisitId" = p_root_visit_id)
  ORDER BY date DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'chainCount', v_chain_count,
    'maxDepth', v_max_depth,
    'unresolvedProblems', COALESCE(to_jsonb(v_unresolved_problems), '[]'::jsonb),
    'lastTechnician', v_last_technician
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CREATE AUDIT CLEANUP FUNCTION (1 YEAR RETENTION)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_maintenance_audit()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM maintenance_audit
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. UPDATE MOCK_DATA SCHEMA (if exists)
-- ============================================================================

-- Add columns to mock_data schema if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'mock_data') THEN
    -- Add to underlying data table
    ALTER TABLE mock_data.maintenance_data 
    ADD COLUMN IF NOT EXISTS root_visit_id UUID;
    
    ALTER TABLE mock_data.maintenance_data 
    ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 1;
    
    ALTER TABLE mock_data.maintenance_data 
    ADD COLUMN IF NOT EXISTS chain_depth INTEGER DEFAULT 0;
    
    ALTER TABLE mock_data.maintenance_data 
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
    
    ALTER TABLE mock_data.maintenance_data 
    ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE;
    
    ALTER TABLE mock_data.maintenance_data 
    ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMP WITH TIME ZONE;

    -- Recreate the view with new columns
    DROP VIEW IF EXISTS mock_data.maintenance;
    
    CREATE VIEW mock_data.maintenance AS
    SELECT
      id,
      branch_id AS "branchId",
      company_id AS "companyId",
      branch_name AS "branchName",
      company_name AS "companyName",
      date,
      scheduled_date AS "scheduledDate",
      resolution_date AS "resolutionDate",
      actual_arrival_date AS "actualArrivalDate",
      technician_name AS "technicianName",
      visit_type AS "visitType",
      status,
      maintenance_notes AS "maintenanceNotes",
      barista_id AS "baristaId",
      barista_name AS "baristaName",
      barista_recommendations AS "baristaRecommendations",
      problem_occurred AS "problemOccurred",
      problem_reason AS "problemReason",
      resolution_status AS "resolutionStatus",
      non_resolution_reason AS "nonResolutionReason",
      spare_parts AS "spareParts",
      services,
      costs,
      total_cost AS "totalCost",
      labor_cost AS "laborCost",
      delay_days AS "delayDays",
      delay_reason AS "delayReason",
      is_significant_delay AS "isSignificantDelay",
      average_delay_days AS "averageDelayDays",
      resolution_time_days AS "resolutionTimeDays",
      root_visit_id AS "rootVisitId",
      total_visits AS "totalVisits",
      chain_depth AS "chainDepth",
      priority,
      sla_deadline AS "slaDeadline",
      last_escalated_at AS "lastEscalatedAt",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM mock_data.maintenance_data;
  END IF;
END $$;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_audit TO service_role;
GRANT EXECUTE ON FUNCTION calculate_maintenance_aggregates TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_maintenance_aggregates TO service_role;
GRANT EXECUTE ON FUNCTION get_maintenance_chain_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_maintenance_chain_info TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_maintenance_audit TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
