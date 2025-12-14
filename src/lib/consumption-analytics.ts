/**
 * @fileoverview Consumption Analytics Service
 * @description Calculates product consumption trends and statistics for clients
 * based on historical order data. Used for warehouse reports and demand forecasting.
 */

import { supabase } from '@/lib/supabase';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { Order, OrderItem } from './types';

/**
 * Monthly consumption data for a product
 */
export interface MonthlyConsumption {
  /** Month in YYYY-MM format */
  month: string;
  /** Month display name (e.g., "December 2024") */
  monthDisplay: string;
  /** Total quantity consumed */
  quantity: number;
  /** Percentage change vs previous month (-100 to +∞) */
  percentageChange: number;
}

/**
 * Product consumption analytics for a client
 */
export interface ProductConsumption {
  productId: string;
  productName: string;
  /** Average monthly quantity over the analysis period */
  averageMonthlyQuantity: number;
  /** Total quantity over the analysis period */
  totalQuantity: number;
  /** Monthly breakdown with trends */
  monthlyData: MonthlyConsumption[];
  /** Overall trend direction */
  trend: 'increasing' | 'decreasing' | 'stable';
  /** Percentage change from first to last month */
  overallChangePercent: number;
}

/**
 * Client consumption summary
 */
export interface ClientConsumptionSummary {
  companyId: string;
  companyName: string;
  /** Products consumed with analytics */
  products: ProductConsumption[];
  /** Total order count in analysis period */
  orderCount: number;
  /** Date range of analysis */
  analysisRange: {
    from: string;
    to: string;
  };
}

/**
 * Calculates the trend direction based on monthly data
 */
export function calculateTrend(
  monthlyQuantities: number[]
): 'increasing' | 'decreasing' | 'stable' {
  if (monthlyQuantities.length < 2) return 'stable';

  // Compare first half average to second half average
  const midpoint = Math.floor(monthlyQuantities.length / 2);
  const firstHalf = monthlyQuantities.slice(0, midpoint);
  const secondHalf = monthlyQuantities.slice(midpoint);

  const firstHalfAvg =
    firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
  const secondHalfAvg =
    secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;

  const changePercent =
    firstHalfAvg === 0 ? 0 : ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  // Use 10% threshold for trend determination
  if (changePercent > 10) return 'increasing';
  if (changePercent < -10) return 'decreasing';
  return 'stable';
}

/**
 * Calculates percentage change between two values
 */
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Fetches and calculates product consumption analytics for a client
 *
 * @param companyId - The company/client ID to analyze
 * @param months - Number of months to analyze (default: 4)
 * @returns Array of product consumption analytics
 *
 * @example
 * ```typescript
 * const consumption = await getClientConsumption('company-123', 4);
 * console.log(consumption[0].trend); // 'increasing'
 * console.log(consumption[0].averageMonthlyQuantity); // 42.5
 * ```
 */
export async function getClientConsumption(
  companyId: string,
  months: number = 4
): Promise<ProductConsumption[]> {
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, months - 1));
  const endDate = endOfMonth(now);

  // Fetch orders for this client in the date range
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, orderDate, items, status')
    .eq('companyId', companyId)
    .gte('orderDate', startDate.toISOString())
    .lte('orderDate', endDate.toISOString())
    .neq('status', 'Cancelled');

  if (error) {
    console.error('Error fetching orders for consumption:', error);
    return [];
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  // Aggregate by product and month
  const productMap = new Map<
    string,
    {
      productName: string;
      monthlyQuantities: Map<string, number>;
    }
  >();

  for (const order of orders as Order[]) {
    const orderMonth = format(new Date(order.orderDate), 'yyyy-MM');

    for (const item of order.items) {
      const existing = productMap.get(item.productId) || {
        productName: item.productName,
        monthlyQuantities: new Map<string, number>(),
      };

      const currentQty = existing.monthlyQuantities.get(orderMonth) || 0;
      existing.monthlyQuantities.set(orderMonth, currentQty + item.quantity);
      productMap.set(item.productId, existing);
    }
  }

  // Generate month labels for the analysis period
  const monthLabels: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    monthLabels.push(format(monthDate, 'yyyy-MM'));
  }

  // Build consumption analytics for each product
  const results: ProductConsumption[] = [];

  for (const [productId, data] of productMap) {
    const monthlyData: MonthlyConsumption[] = [];
    let previousQuantity = 0;

    for (const monthKey of monthLabels) {
      const quantity = data.monthlyQuantities.get(monthKey) || 0;
      const monthDate = new Date(monthKey + '-01');

      monthlyData.push({
        month: monthKey,
        monthDisplay: format(monthDate, 'MMMM yyyy'),
        quantity,
        percentageChange: calculatePercentageChange(quantity, previousQuantity),
      });

      previousQuantity = quantity;
    }

    const quantities = monthlyData.map((m) => m.quantity);
    const totalQuantity = quantities.reduce((a, b) => a + b, 0);
    const averageMonthlyQuantity = totalQuantity / months;

    // Calculate overall change
    const firstMonth = quantities[0] || 0;
    const lastMonth = quantities[quantities.length - 1] || 0;
    const overallChangePercent = calculatePercentageChange(lastMonth, firstMonth);

    results.push({
      productId,
      productName: data.productName,
      averageMonthlyQuantity: Math.round(averageMonthlyQuantity * 10) / 10,
      totalQuantity,
      monthlyData,
      trend: calculateTrend(quantities),
      overallChangePercent,
    });
  }

  // Sort by total quantity (most consumed first)
  return results.sort((a, b) => b.totalQuantity - a.totalQuantity);
}

/**
 * Fetches consumption analytics for multiple clients
 *
 * @param companyIds - Array of company IDs
 * @param months - Number of months to analyze
 * @returns Map of company ID to consumption data
 */
export async function getBulkClientConsumption(
  companyIds: string[],
  months: number = 4
): Promise<Map<string, ProductConsumption[]>> {
  const results = new Map<string, ProductConsumption[]>();

  // Process in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < companyIds.length; i += batchSize) {
    const batch = companyIds.slice(i, i + batchSize);
    const promises = batch.map(async (id) => {
      const consumption = await getClientConsumption(id, months);
      return { id, consumption };
    });

    const batchResults = await Promise.all(promises);
    for (const { id, consumption } of batchResults) {
      results.set(id, consumption);
    }
  }

  return results;
}

/**
 * Gets a simple trend indicator for display
 */
export function getTrendIndicator(trend: 'increasing' | 'decreasing' | 'stable'): {
  symbol: string;
  color: string;
  label: string;
} {
  switch (trend) {
    case 'increasing':
      return { symbol: '↑', color: 'green', label: 'Increasing' };
    case 'decreasing':
      return { symbol: '↓', color: 'red', label: 'Decreasing' };
    case 'stable':
      return { symbol: '→', color: 'gray', label: 'Stable' };
  }
}

/**
 * Formats percentage change with sign and color indication
 */
export function formatPercentageChange(change: number): {
  text: string;
  isPositive: boolean;
  isNegative: boolean;
} {
  const sign = change > 0 ? '+' : '';
  return {
    text: `${sign}${change}%`,
    isPositive: change > 0,
    isNegative: change < 0,
  };
}
