/**
 * Mock Data Status API Route
 *
 * GET /api/mock-data/status?jobId=xxx
 * Returns the status and progress of a generation job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { getSafeMockDataClient } from '@/lib/mock-data-generator/safety-guard';
import { logger } from '@/lib/logger';

export const GET = withTraceContext(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    const supabase = getSafeMockDataClient();

    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found', jobId, details: error },
        { status: 404 }
      );
    }

    // Map DB fields to response format
    // DB columns: status, progress, result, error, created_at, updated_at
    // Response expects: status, startedAt, progress: { ... }

    return NextResponse.json({
      jobId,
      status: job.status, // pending, running, completed, failed
      startedAt: job.created_at,
      progress: {
        status: job.status === 'running' ? 'generating' : job.status,
        progressPercent: job.progress, // 0-100
        // We might imply other progress details from result if available or just return basic info
        details: job.result,
        error: job.error,
        updatedAt: job.updated_at,
      },
    });
  } catch (error) {
    logger.error('[API] Status endpoint error', { data: { error } });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});
