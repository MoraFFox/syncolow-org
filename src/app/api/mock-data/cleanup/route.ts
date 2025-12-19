/**
 * Mock Data Cleanup API Route
 *
 * DELETE /api/mock-data/cleanup
 * Removes all mock data from the mock_data schema.
 * Requires a confirmation token for safety.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SafetyGuard } from '@/lib/mock-data-generator/safety-guard';
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirmToken = searchParams.get('confirm');

    // Require confirmation token
    if (confirmToken !== 'DELETE_ALL_MOCK_DATA') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          message: 'Add ?confirm=DELETE_ALL_MOCK_DATA to confirm cleanup',
        },
        { status: 400 }
      );
    }

    // Run safety checks
    const safetyGuard = new SafetyGuard();
    const safetyResult = safetyGuard.runAllChecks();

    if (!safetyResult.passed) {
      return NextResponse.json(
        {
          error: 'Safety checks failed',
          failures: safetyResult.failures,
        },
        { status: 403 }
      );
    }

    logger.info('[API] Starting mock data cleanup');

    // Get safe Supabase client for mock_data schema
    const supabase = safetyGuard.createSafeSupabaseClient();

    // Tables to truncate in reverse dependency order
    const tables = [
      'audit_logs',
      'refunds',
      'returns',
      'discounts',
      'payments',
      'delivery_attempts',
      'shipments',
      'inventory_movements',
      'maintenance', // Renamed from maintenanceVisits to match DB table
      'order_items',
      'orders',
      'products',
      'baristas', // Added table
      'branches', // merged into companies but kept for checking if table exists
      'companies',
      'users',
    ];

    const results: Record<string, string> = {};

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) {
          results[table] = `Error: ${error.message}`;
          logger.warn(`[API] Failed to cleanup ${table}`, { error });
        } else {
          results[table] = 'Cleaned';
        }
      } catch (error) {
        results[table] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    logger.info('[API] Mock data cleanup complete', { results });

    return NextResponse.json({
      success: true,
      message: 'Mock data cleanup complete',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[API] Cleanup endpoint error', { error });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
