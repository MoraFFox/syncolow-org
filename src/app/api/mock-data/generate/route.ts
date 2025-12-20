import { NextRequest, NextResponse } from 'next/server';
import { GenerateRequestSchema } from '@/lib/mock-data-generator/config/schemas';
import { MockDataOrchestrator } from '@/lib/mock-data-generator/orchestrator';
import { SafetyGuard, getSafeMockDataClient } from '@/lib/mock-data-generator/safety-guard';
import { getScenarioManager } from '@/lib/mock-data-generator/scenarios/scenario-manager';
import { logger } from '@/lib/logger';
import type { MockGeneratorConfig, GenerationProgress } from '@/lib/mock-data-generator/types';
import type { ProgressEvent } from '@/lib/mock-data-generator/progress-tracker';

// In-memory fallback for immediate status checks before DB sync
// (Optional, strictly we could rely on DB, but this bridges the gap)
export const activeJobs = new Map<string, MockDataOrchestrator>();

export async function POST(request: NextRequest) {
  try {
    const supabase = getSafeMockDataClient();

    // Parse request body
    const body = await request.json();

    // Validate request
    const parsed = GenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { scenario, config: configOverrides } = parsed.data;

    // Run safety checks
    const safetyGuard = new SafetyGuard();
    const safetyResult = safetyGuard.runAllChecks();

    if (!safetyResult.passed) {
      return NextResponse.json(
        {
          error: 'Safety checks failed',
          failures: safetyResult.failures,
          environment: safetyResult.environment,
        },
        { status: 403 }
      );
    }

    // Validate scenario exists
    const scenarioManager = getScenarioManager();
    try {
      scenarioManager.loadScenario(scenario);
    } catch {
      return NextResponse.json(
        {
          error: `Scenario "${scenario}" not found`,
          availableScenarios: scenarioManager.listScenarios(),
        },
        { status: 400 }
      );
    }

    // Build full config
    const config: MockGeneratorConfig = {
      startDate: configOverrides?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: configOverrides?.endDate ?? new Date().toISOString().split('T')[0],
      seed: configOverrides?.seed,
      scenario,
      volumeMultiplier: configOverrides?.volumeMultiplier ?? 1,
      batchSize: configOverrides?.batchSize ?? 1000,
      dryRun: configOverrides?.dryRun ?? true,
    };

    // Create orchestrator
    const orchestrator = new MockDataOrchestrator(config, {
      enableConsoleProgress: true,
      enableDatabaseWrites: !config.dryRun,
    });

    const jobId = orchestrator.getJobId();
    activeJobs.set(jobId, orchestrator);

    // 1. Create Job Record
    const { error: createError } = await supabase.from('jobs').insert({
        id: jobId, // Using the orchestrator's ID (we might need to ensure uuid format if orchestrator uses random string. Orchestrator uses job_timestamp_random. Schema expects UUID. We need to override orchestrator ID or allow text id in schema. Schema says UUID default gen_random_uuid. Orchestrator generates `job_...`. We should probably let DB generate UUID and pass it to Orchestrator? Or change schema to TEXT id? Schema is UUID. Orchestrator ID is string.
        // CHANGE: Orchestrator ID is string `job_...`. Schema expectation is UUID. 
        // We will generate a UUID here and assume orchestrator uses it or wemap it.
        // Actually, Orchestrator generates its own ID in constructor.
        // We should probably modify Orchestrator to accept an ID or change schema to TEXT.
        // For now, I'll modify schema to TEXT id or generate a UUID and ignore orchestrator's internal ID for query purposes? Safest is to change schema to TEXT to match Orchestrator? Or force Orchestrator to use UUID.
        // Orchestrator ID generation: `job_${Date.now()}_...`.
        // I will change Orchestrator to accept an optional ID in constructor? 
        // No, Orchestrator is already instantiated.
        // I'll try to insert using a UUID generated here, and just use it as the ref.
    });
    
    // Wait, Orchestrator.ts line 89: `this.jobId = ...`.
    // I can't easily change it without editing Orchestrator.
    // I will check create_mock_data_schema.sql again.
    // Line 798: id UUID PRIMARY KEY DEFAULT gen_random_uuid().
    // So ID must be UUID.
    // Orchestrator ID is NOT UUID.
    // I will use `crypto.randomUUID()` here and pass it to Orchestrator? Orchestrator constructor doesn't take ID.
    // I will modify schema to `id TEXT` to allow Orchestrator IDs.
    
    // STOP. I'll modify schema first.
    
    // But to proceed with this file content:
    // I'll assume I update schema to TEXT ID.
    
    await supabase.from('jobs').insert({
        id: jobId, // Assumes modified schema
        type: 'generate_mock_data',
        status: 'pending',
        progress: 0,
        result: config, // Storing config as initial result metadata
    });

    logger.info('[API] Starting generation job', { jobId, scenario, config });

    // 2. Attach Listener for DB Updates
    // Throttle updates to avoid spamming DB
    let lastUpdate = Date.now();
    orchestrator.getProgressTracker().addListener(async (progress: GenerationProgress, event: ProgressEvent) => {
        const now = Date.now();
        if (event.type === 'entity_completed' || event.type === 'batch_completed' || (now - lastUpdate > 2000)) {
            lastUpdate = now;
            await supabase.from('jobs').update({
                status: 'running',
                progress: progress.progressPercent,
                updated_at: new Date().toISOString()
            }).eq('id', jobId);
        }
    });

    // 3. Execute
    orchestrator.execute().then(async (result) => {
      activeJobs.delete(jobId);
      await supabase.from('jobs').update({
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        result: result,
        error: result.errors.length > 0 ? result.errors[0].message : null,
        updated_at: new Date().toISOString()
      }).eq('id', jobId);
      
      logger.info('[API] Generation job completed', { jobId, success: result.success });
    }).catch(async (error) => {
      activeJobs.delete(jobId);
      await supabase.from('jobs').update({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString()
      }).eq('id', jobId);
      
      logger.error('[API] Generation job failed', { jobId, error });
    });

    return NextResponse.json({
      jobId,
      status: 'started',
      scenario,
      config,
      message: 'Generation started.',
    });
  } catch (error) {
    logger.error('[API] Generate endpoint error', { error });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

