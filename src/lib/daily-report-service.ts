/**
 * @fileoverview Daily Report Service
 * @description Orchestrates the generation and sending of daily order reports
 * for Delivery and Warehouse teams. Can be called from API routes or Edge Functions.
 */

import { supabaseAdmin as supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { Order, Company } from './types';
import {
  generateDeliveryReportBase64,
  type DeliveryOrderEntry,
} from './pdf-delivery-report';
import {
  generateWarehouseReportBase64,
  type WarehouseOrderEntry,
} from './pdf-warehouse-report';
import { getClientConsumption } from './consumption-analytics';
import { logger } from './logger';

// Application timezone (Cairo, UTC+2)
const APP_TIMEZONE = 'Africa/Cairo';

/**
 * Report recipient configuration
 */
export interface ReportRecipients {
  /** Email addresses for delivery team report */
  deliveryEmails: string[];
  /** Email addresses for warehouse team report */
  warehouseEmails: string[];
  /** Admin email (receives both reports) */
  adminEmail?: string;
}

/**
 * Report generation result
 */
export interface ReportGenerationResult {
  success: boolean;
  deliveryReport?: {
    base64: string;
    filename: string;
    orderCount: number;
  };
  warehouseReport?: {
    base64: string;
    filename: string;
    orderCount: number;
  };
  error?: string;
}

/**
 * Email sending result
 */
export interface ReportEmailResult {
  success: boolean;
  deliverySent: boolean;
  warehouseSent: boolean;
  errors: string[];
}

/**
 * Default recipient configuration (should be overridden by environment/database config)
 */
const DEFAULT_RECIPIENTS: ReportRecipients = {
  deliveryEmails: [],
  warehouseEmails: [],
  adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || undefined,
};

/**
 * Fetches today's orders for reporting
 *
 * @param reportDate - The date to fetch orders for (defaults to today in Cairo timezone)
 * @returns Array of orders with deliveryDate matching the report date (Cairo time)
 */
export async function fetchOrdersForDate(reportDate: Date = new Date()): Promise<Order[]> {
  // Convert reportDate to Cairo timezone to determine the local day
  const zonedDate = toZonedTime(reportDate, APP_TIMEZONE);
  
  // Format as YYYY-MM-DD in Cairo timezone
  const dateString = format(zonedDate, 'yyyy-MM-dd');
  
  // Create start of day (midnight) and end of day in Cairo timezone as ISO strings
  // Then convert to UTC using fromZonedTime
  const startOfDayCairoStr = `${dateString}T00:00:00`;
  const endOfDayCairoStr = `${dateString}T23:59:59.999`;
  
  // Parse as if in Cairo timezone and get UTC equivalent
  const dayStartUTC = fromZonedTime(startOfDayCairoStr, APP_TIMEZONE);
  const dayEndUTC = fromZonedTime(endOfDayCairoStr, APP_TIMEZONE);

  logger.debug('Fetching orders for date range (Cairo timezone)', {
    component: 'daily-report-service',
    action: 'fetchOrdersForDate',
    reportDate: reportDate.toISOString(),
    dateString,
    dayStartUTC: dayStartUTC.toISOString(),
    dayEndUTC: dayEndUTC.toISOString(),
  });


  // DEBUG: Temporary console.error for visibility
  console.error('[REPORT DEBUG] Date calculation:', {
    reportDate: reportDate.toISOString(),
    dateString,
    dayStartUTC: dayStartUTC.toISOString(),
    dayEndUTC: dayEndUTC.toISOString(),
  });

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .gte('deliveryDate', dayStartUTC.toISOString())
    .lte('deliveryDate', dayEndUTC.toISOString())
    .order('area', { ascending: true })
    .order('companyName', { ascending: true });

  if (error) {
    console.error('[REPORT DEBUG] Supabase error:', error);
    logger.error(error, {
      component: 'daily-report-service',
      action: 'fetchOrdersForDate',
    });
    return [];
  }

  console.error('[REPORT DEBUG] Query result:', {
    orderCount: orders?.length || 0,
    firstOrder: orders?.[0] ? { id: orders[0].id, deliveryDate: orders[0].deliveryDate } : null,
  });

  logger.debug('Orders fetched for report', {
    component: 'daily-report-service',
    action: 'fetchOrdersForDate',
    orderCount: orders?.length || 0,
  });

  return (orders || []) as Order[];
}

/**
 * Fetches companies data for the given order company IDs
 */
export async function fetchCompaniesForOrders(
  orders: Order[]
): Promise<Map<string, Company>> {
  const companyIds = new Set<string>();

  for (const order of orders) {
    if (order.companyId) companyIds.add(order.companyId);
    if (order.branchId) companyIds.add(order.branchId);
  }

  if (companyIds.size === 0) {
    return new Map();
  }

  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .in('id', Array.from(companyIds));

  if (error) {
    logger.error(error, {
      component: 'daily-report-service',
      action: 'fetchCompaniesForOrders',
    });
    return new Map();
  }

  const companyMap = new Map<string, Company>();
  for (const company of (companies || []) as Company[]) {
    companyMap.set(company.id, company);
  }

  return companyMap;
}

/**
 * Generates the Delivery Team report
 */
export async function generateDeliveryReport(
  reportDate: Date = new Date()
): Promise<ReportGenerationResult['deliveryReport'] | null> {
  try {
    const orders = await fetchOrdersForDate(reportDate);
    const companies = await fetchCompaniesForOrders(orders);

    const entries: DeliveryOrderEntry[] = orders.map((order) => ({
      order,
      company: companies.get(order.companyId),
      branch: order.branchId ? companies.get(order.branchId) : undefined,
    }));

    const base64 = generateDeliveryReportBase64(entries, { reportDate });
    const filename = `Delivery-Report-${format(reportDate, 'yyyy-MM-dd')}.pdf`;

    logger.debug('Delivery report generated', {
      component: 'daily-report-service',
      action: 'generateDeliveryReport',
      orderCount: orders.length,
    });

    return {
      base64,
      filename,
      orderCount: orders.length,
    };
  } catch (error) {
    logger.error(error, {
      component: 'daily-report-service',
      action: 'generateDeliveryReport',
    });
    return null;
  }
}

/**
 * Generates the Warehouse Team report with consumption analytics
 */
export async function generateWarehouseReport(
  reportDate: Date = new Date()
): Promise<ReportGenerationResult['warehouseReport'] | null> {
  try {
    const orders = await fetchOrdersForDate(reportDate);
    const companies = await fetchCompaniesForOrders(orders);

    // Get unique company IDs for consumption analysis
    const companyIds = [...new Set(orders.map((o) => o.companyId))];

    // Fetch consumption data for all companies in parallel
    const consumptionMap = new Map<string, Awaited<ReturnType<typeof getClientConsumption>>>();

    // Process in batches of 5 to avoid rate limiting
    for (let i = 0; i < companyIds.length; i += 5) {
      const batch = companyIds.slice(i, i + 5);
      const results = await Promise.all(
        batch.map(async (id) => ({
          id,
          consumption: await getClientConsumption(id, 4),
        }))
      );
      for (const { id, consumption } of results) {
        consumptionMap.set(id, consumption);
      }
    }

    const entries: WarehouseOrderEntry[] = orders.map((order) => ({
      order,
      company: companies.get(order.companyId),
      branch: order.branchId ? companies.get(order.branchId) : undefined,
      consumption: consumptionMap.get(order.companyId) || [],
    }));

    const base64 = generateWarehouseReportBase64(entries, { reportDate });
    const filename = `Warehouse-Report-${format(reportDate, 'yyyy-MM-dd')}.pdf`;

    logger.debug('Warehouse report generated', {
      component: 'daily-report-service',
      action: 'generateWarehouseReport',
      orderCount: orders.length,
    });

    return {
      base64,
      filename,
      orderCount: orders.length,
    };
  } catch (error) {
    logger.error(error, {
      component: 'daily-report-service',
      action: 'generateWarehouseReport',
    });
    return null;
  }
}

/**
 * Generates both reports
 */
export async function generateDailyReports(
  reportDate: Date = new Date()
): Promise<ReportGenerationResult> {
  try {
    const [deliveryReport, warehouseReport] = await Promise.all([
      generateDeliveryReport(reportDate),
      generateWarehouseReport(reportDate),
    ]);

    return {
      success: deliveryReport !== null || warehouseReport !== null,
      deliveryReport: deliveryReport || undefined,
      warehouseReport: warehouseReport || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(error, {
      component: 'daily-report-service',
      action: 'generateDailyReports',
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sends reports via email using Supabase Edge Function
 */
export async function sendReportEmails(
  reports: ReportGenerationResult,
  recipients: ReportRecipients = DEFAULT_RECIPIENTS
): Promise<ReportEmailResult> {
  const errors: string[] = [];
  let deliverySent = false;
  let warehouseSent = false;

  const allDeliveryRecipients = [
    ...recipients.deliveryEmails,
    ...(recipients.adminEmail ? [recipients.adminEmail] : []),
  ];

  const allWarehouseRecipients = [
    ...recipients.warehouseEmails,
    ...(recipients.adminEmail ? [recipients.adminEmail] : []),
  ];

  // Send delivery report
  if (reports.deliveryReport && allDeliveryRecipients.length > 0) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: allDeliveryRecipients,
          subject: `Daily Delivery Report - ${format(new Date(), 'MMM dd, yyyy')}`,
          html: `
            <h2>Daily Delivery Report</h2>
            <p>Please find attached the delivery report for today with ${reports.deliveryReport.orderCount} orders.</p>
            <p>Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
          `,
          attachments: [
            {
              filename: reports.deliveryReport.filename,
              content: reports.deliveryReport.base64,
              encoding: 'base64',
              contentType: 'application/pdf',
            },
          ],
        },
      });

      if (error) {
        errors.push(`Delivery email error: ${error.message}`);
      } else if (data && !data.success) {
        errors.push(`Delivery email failed: ${data.error}`);
      } else {
        deliverySent = true;
      }
    } catch (e) {
      errors.push(`Delivery email exception: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  }

  // Send warehouse report
  if (reports.warehouseReport && allWarehouseRecipients.length > 0) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: allWarehouseRecipients,
          subject: `Daily Warehouse Report - ${format(new Date(), 'MMM dd, yyyy')}`,
          html: `
            <h2>Daily Warehouse Report</h2>
            <p>Please find attached the warehouse operations report for today with ${reports.warehouseReport.orderCount} orders.</p>
            <p>This report includes delivery status, client activity, and product consumption analytics.</p>
            <p>Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
          `,
          attachments: [
            {
              filename: reports.warehouseReport.filename,
              content: reports.warehouseReport.base64,
              encoding: 'base64',
              contentType: 'application/pdf',
            },
          ],
        },
      });

      if (error) {
        errors.push(`Warehouse email error: ${error.message}`);
      } else if (data && !data.success) {
        errors.push(`Warehouse email failed: ${data.error}`);
      } else {
        warehouseSent = true;
      }
    } catch (e) {
      errors.push(`Warehouse email exception: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  }

  return {
    success: errors.length === 0,
    deliverySent,
    warehouseSent,
    errors,
  };
}

/**
 * Main entry point: Generate and send daily reports
 */
export async function processAndSendDailyReports(
  recipients?: ReportRecipients
): Promise<{
  generation: ReportGenerationResult;
  email: ReportEmailResult;
}> {
  const generation = await generateDailyReports();

  if (!generation.success) {
    return {
      generation,
      email: {
        success: false,
        deliverySent: false,
        warehouseSent: false,
        errors: ['Report generation failed'],
      },
    };
  }

  const email = await sendReportEmails(generation, recipients);

  logger.debug('Daily reports processed', {
    component: 'daily-report-service',
    action: 'processAndSendDailyReports',
    generationSuccess: generation.success,
    emailSuccess: email.success,
    deliverySent: email.deliverySent,
    warehouseSent: email.warehouseSent,
  });

  return { generation, email };
}
