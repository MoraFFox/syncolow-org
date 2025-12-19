/**
 * Mock Data Config API Route
 *
 * GET /api/mock-data/config
 * Returns current configuration and defaults.
 *
 * POST /api/mock-data/config
 * Validates a configuration without running generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeneratorConfigSchema } from '@/lib/mock-data-generator/config/schemas';
import { getScenarioManager } from '@/lib/mock-data-generator/scenarios/scenario-manager';
import { SafetyGuard } from '@/lib/mock-data-generator/safety-guard';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const scenarioManager = getScenarioManager();
    const safetyGuard = new SafetyGuard();

    const defaults = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      scenario: 'normal-ops',
      volumeMultiplier: 1,
      batchSize: 1000,
      dryRun: true,
    };

    const safetyConfig = safetyGuard.getConfig();

    return NextResponse.json({
      defaults,
      safetyConfig: {
        targetSchema: safetyConfig.targetSchema,
        maxRecordsPerEntity: safetyConfig.maxRecordsPerEntity,
        allowedEnvironments: safetyConfig.allowedEnvironments,
      },
      defaultEntityRates: scenarioManager.getDefaultEntityRates(),
      defaultDistributions: scenarioManager.getDefaultDistributions(),
    });
  } catch (error) {
    logger.error('[API] Config GET error', { error });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate configuration
    const parsed = GeneratorConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          valid: false,
          errors: parsed.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Validate scenario exists
    const scenarioManager = getScenarioManager();
    const scenario = parsed.data.scenario;

    try {
      scenarioManager.loadScenario(scenario);
    } catch {
      return NextResponse.json(
        {
          valid: false,
          errors: [{ path: 'scenario', message: `Scenario "${scenario}" not found` }],
          availableScenarios: scenarioManager.listScenarios(),
        },
        { status: 400 }
      );
    }

    // Run safety checks
    const safetyGuard = new SafetyGuard();
    const safetyResult = safetyGuard.runAllChecks();

    return NextResponse.json({
      valid: true,
      config: parsed.data,
      safetyChecks: {
        passed: safetyResult.passed,
        environment: safetyResult.environment,
        targetSchema: safetyResult.targetSchema,
        failures: safetyResult.failures,
      },
    });
  } catch (error) {
    logger.error('[API] Config POST error', { error });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
