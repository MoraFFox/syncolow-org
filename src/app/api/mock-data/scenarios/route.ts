/**
 * Mock Data Scenarios API Route
 *
 * GET /api/mock-data/scenarios
 * Lists all available scenario profiles.
 */

import { NextResponse } from 'next/server';
import { getScenarioManager } from '@/lib/mock-data-generator/scenarios/scenario-manager';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const scenarioManager = getScenarioManager();
    const scenarios = scenarioManager.listScenariosWithDescriptions();

    return NextResponse.json({
      scenarios,
      count: scenarios.length,
      defaultScenario: 'normal-ops',
    });
  } catch (error) {
    logger.error('[API] Scenarios endpoint error', { error });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
