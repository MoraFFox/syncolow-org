/**
 * Mock Data Export API Route
 *
 * POST /api/mock-data/export
 * Export generated mock data to various formats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { ExportConfigSchema } from '@/lib/mock-data-generator/config/schemas';
import { SafetyGuard } from '@/lib/mock-data-generator/safety-guard';
import { logger } from '@/lib/logger';

export const POST = withTraceContext(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Validate export config
    const parsed = ExportConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { format, entities, includeMetadata, dateRange } = parsed.data;

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

    logger.info('[API] Starting mock data export', { data: { format, entities } });

    // Get safe Supabase client
    const supabase = safetyGuard.createSafeSupabaseClient();

    // Determine which entities to export
    const entitiesToExport = entities ?? [
      'users',
      'companies',
      'branches',
      'products',
      'orders',
      'order_items',
    ];

    const exportData: Record<string, unknown[]> = {};

    for (const entity of entitiesToExport) {
      try {
        let query = supabase.from(entity).select('*');

        // Apply date range filter if provided
        if (dateRange && ['orders', 'maintenance_visits', 'audit_logs'].includes(entity)) {
          const dateColumn = entity === 'orders' ? 'order_date' : entity === 'audit_logs' ? 'timestamp' : 'date';
          query = query
            .gte(dateColumn, dateRange.start)
            .lte(dateColumn, dateRange.end);
        }

        const { data, error } = await query.limit(10000);

        if (error) {
          logger.warn(`[API] Failed to export ${entity}`, { data: { error } });
          exportData[entity] = [];
        } else {
          exportData[entity] = data ?? [];
        }
      } catch (error) {
        logger.warn(`[API] Error exporting ${entity}`, { data: { error } });
        exportData[entity] = [];
      }
    }

    // Format response based on format type
    switch (format) {
      case 'json':
        const jsonContent = includeMetadata
          ? {
            metadata: {
              exportedAt: new Date().toISOString(),
              format: 'json',
              entityCount: Object.fromEntries(
                Object.entries(exportData).map(([k, v]) => [k, v.length])
              ),
              dateRange,
            },
            data: exportData,
          }
          : exportData;

        return new NextResponse(JSON.stringify(jsonContent, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="mock-data-export-${Date.now()}.json"`,
          },
        });

      case 'csv':
        // For CSV, return a summary and individual entity data
        const csvSummary = Object.entries(exportData)
          .map(([entity, data]) => `${entity}: ${data.length} records`)
          .join('\n');

        return NextResponse.json({
          message: 'CSV export requires streaming. Use individual entity endpoints.',
          summary: csvSummary,
          entityCounts: Object.fromEntries(
            Object.entries(exportData).map(([k, v]) => [k, v.length])
          ),
        });

      case 'sql':
        // Generate SQL INSERT statements
        const sqlStatements: string[] = [];

        for (const [entity, records] of Object.entries(exportData)) {
          if (records.length === 0) continue;

          const columns = Object.keys(records[0] as object);
          const tableName = `mock_data.${entity}`;

          for (const record of records) {
            const values = columns.map((col) => {
              const val = (record as Record<string, unknown>)[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return String(val);
            });

            sqlStatements.push(
              `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`
            );
          }
        }

        return new NextResponse(sqlStatements.join('\n'), {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="mock-data-export-${Date.now()}.sql"`,
          },
        });

      default:
        return NextResponse.json(
          { error: 'Unsupported format', supportedFormats: ['json', 'csv', 'sql'] },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('[API] Export endpoint error', { data: { error } });

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});
