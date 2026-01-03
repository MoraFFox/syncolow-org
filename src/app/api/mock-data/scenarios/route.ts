/**
 * Mock Data Scenarios API Route
 *
 * GET /api/mock-data/scenarios
 * Lists all available scenario profiles.
 */

import { NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { getScenarioManager } from '@/lib/mock-data-generator/scenarios/scenario-manager';
import { logger } from '@/lib/logger';

export const GET = withTraceContext(async () => {
  try {
    const scenarioManager = getScenarioManager();
    const scenarios = scenarioManager.listScenariosWithDescriptions();

    return NextResponse.json({
      scenarios,
      count: scenarios.length,
      defaultScenario: 'normal-ops',
    });
  } catch (error) {
    logger.error('[API] Scenarios endpoint error', { data: { error } });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});
