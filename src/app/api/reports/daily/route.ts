/**
 * @fileoverview API Route for Daily Reports Generation
 * @description Handles manual and scheduled generation of daily order reports
 * for Delivery and Warehouse teams.
 *
 * POST /api/reports/daily - Generate and optionally send daily reports
 * GET /api/reports/daily - Get today's report status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateDailyReports,
  processAndSendDailyReports,
  type ReportRecipients,
} from '@/lib/daily-report-service';
import { logger } from '@/lib/logger';

/**
 * Request body for POST /api/reports/daily
 */
interface GenerateReportRequest {
  /** Whether to send emails after generation */
  sendEmail?: boolean;
  /** Report date (ISO string, defaults to today) */
  reportDate?: string;
  /** Email recipients configuration */
  recipients?: ReportRecipients;
  /** Secret key for scheduled job authentication */
  cronSecret?: string;
}

/**
 * Validates the cron secret for scheduled jobs
 */
function validateCronSecret(secret: string | undefined): boolean {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return true; // No secret configured = allow all
  return secret === expectedSecret;
}

/**
 * POST /api/reports/daily
 *
 * Generates daily reports and optionally sends them via email.
 * Can be called manually from the UI or by a scheduled job.
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateReportRequest = await request.json();
    const { sendEmail = false, reportDate, recipients, cronSecret } = body;

    // Check for scheduled job authentication
    const authHeader = request.headers.get('Authorization');
    const isFromScheduler =
      authHeader?.startsWith('Bearer ') || cronSecret !== undefined;

    if (isFromScheduler && !validateCronSecret(cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const date = reportDate ? new Date(reportDate) : new Date();

    logger.debug('Daily reports generation started', {
      component: 'api/reports/daily',
      action: 'POST',
      sendEmail,
      reportDate: date.toISOString(),
      isFromScheduler,
    });

    if (sendEmail) {
      // Generate and send reports
      const result = await processAndSendDailyReports(recipients);

      return NextResponse.json({
        success: result.generation.success && result.email.success,
        generation: {
          success: result.generation.success,
          deliveryOrderCount: result.generation.deliveryReport?.orderCount || 0,
          warehouseOrderCount:
            result.generation.warehouseReport?.orderCount || 0,
          error: result.generation.error,
        },
        email: {
          success: result.email.success,
          deliverySent: result.email.deliverySent,
          warehouseSent: result.email.warehouseSent,
          errors: result.email.errors,
        },
        error: result.email.errors.length > 0 ? result.email.errors.join(', ') : undefined,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Generate reports only (for preview/download)
      const reports = await generateDailyReports(date);

      // Return report data with base64 for download
      return NextResponse.json({
        success: reports.success,
        deliveryReport: reports.deliveryReport
          ? {
              filename: reports.deliveryReport.filename,
              orderCount: reports.deliveryReport.orderCount,
              base64: reports.deliveryReport.base64,
            }
          : null,
        warehouseReport: reports.warehouseReport
          ? {
              filename: reports.warehouseReport.filename,
              orderCount: reports.warehouseReport.orderCount,
              base64: reports.warehouseReport.base64,
            }
          : null,
        error: reports.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error(error, {
      component: 'api/reports/daily',
      action: 'POST',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/daily
 *
 * Returns information about the daily reports endpoint.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/reports/daily',
    methods: ['POST', 'GET'],
    description: 'Generate and send daily order reports for Delivery and Warehouse teams',
    usage: {
      generateOnly: {
        method: 'POST',
        body: { sendEmail: false },
        description: 'Generate reports and return as base64 PDF',
      },
      generateAndSend: {
        method: 'POST',
        body: {
          sendEmail: true,
          recipients: {
            deliveryEmails: ['delivery@example.com'],
            warehouseEmails: ['warehouse@example.com'],
            adminEmail: 'admin@example.com',
          },
        },
        description: 'Generate reports and send via email',
      },
      scheduledJob: {
        method: 'POST',
        headers: { Authorization: 'Bearer CRON_SECRET' },
        body: { sendEmail: true, cronSecret: 'CRON_SECRET' },
        description: 'For scheduled job execution',
      },
    },
    environment: {
      CRON_SECRET: process.env.CRON_SECRET ? 'configured' : 'not configured',
      NEXT_PUBLIC_ADMIN_EMAIL: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'not set',
    },
  });
}
