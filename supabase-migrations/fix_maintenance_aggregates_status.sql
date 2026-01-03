-- ============================================================================
-- Fix Maintenance Aggregates Status Sync
-- 
-- Redefines calculate_maintenance_aggregates to automatically update the
-- root visit's status based on the status of all visits in the chain.
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
  v_active_count INTEGER;
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
    COALESCE(AVG(COALESCE("delayDays", 0)), 0),
    -- Count active visits (not Completed or Cancelled)
    COUNT(*) FILTER (WHERE status NOT IN ('Completed', 'Cancelled'))
  INTO v_total_visits, v_labor_total, v_parts_total, v_average_delay, v_active_count
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

  -- Update the root visit with calculated aggregates AND status
  UPDATE maintenance
  SET 
    "totalVisits" = v_total_visits,
    "totalCost" = v_total_cost,
    "resolutionTimeDays" = v_resolution_time,
    "averageDelayDays" = v_average_delay,
    -- Auto-close if no active visits remain
    status = CASE 
      WHEN v_active_count = 0 THEN 'Completed'
      -- If there are active visits and status was Completed, reopen it to In Progress
      -- (Assuming 'In Progress' is the safe default for active cases)
      WHEN v_active_count > 0 AND status = 'Completed' THEN 'In Progress'
      ELSE status -- Keep existing status (e.g., 'Scheduled', 'In Progress', 'Follow-up Required')
    END
  WHERE id = p_root_visit_id;

  -- Build result object
  v_result := jsonb_build_object(
    'totalVisits', v_total_visits,
    'totalCost', v_total_cost,
    'laborTotal', v_labor_total,
    'partsTotal', v_parts_total,
    'resolutionTimeDays', v_resolution_time,
    'averageDelayDays', v_average_delay,
    'activeCount', v_active_count
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
