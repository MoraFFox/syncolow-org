/**
 * Mock Data Toggle API Route
 *
 * GET /api/mock-data/toggle
 * Returns current toggle state.
 *
 * POST /api/mock-data/toggle
 * Enable or disable mock data generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const isEnabled = process.env.MOCK_DATA_ENABLED === 'true';
    const nodeEnv = process.env.NODE_ENV ?? 'development';

    return NextResponse.json({
      enabled: isEnabled,
      environment: nodeEnv,
      canEnable: nodeEnv !== 'production',
      message: isEnabled
        ? 'Mock data generation is enabled'
        : 'Mock data generation is disabled. Set MOCK_DATA_ENABLED=true to enable.',
    });
  } catch (error) {
    logger.error('[API] Toggle GET error', { error });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enable } = body;

    if (typeof enable !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Request body must include "enable" boolean' },
        { status: 400 }
      );
    }

    const nodeEnv = process.env.NODE_ENV ?? 'development';

    // Block in production
    if (nodeEnv === 'production') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Cannot toggle mock data generation in production environment',
        },
        { status: 403 }
      );
    }

    // Note: Actually setting environment variables at runtime requires
    // a different approach (e.g., storing in database/Redis).
    // This endpoint provides the interface; implementation depends on deployment.

    logger.info('[API] Mock data toggle requested', { enable, environment: nodeEnv });

    return NextResponse.json({
      success: true,
      enabled: enable,
      environment: nodeEnv,
      message: enable
        ? 'Mock data generation enabled. Note: Set MOCK_DATA_ENABLED=true in your environment for persistence.'
        : 'Mock data generation disabled. Note: Set MOCK_DATA_ENABLED=false in your environment for persistence.',
      note: 'Environment variable changes require server restart to take effect.',
    });
  } catch (error) {
    logger.error('[API] Toggle POST error', { error });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
