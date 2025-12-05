/** @format */

import { isToday } from "date-fns";
import type { Order, Product, MaintenanceVisit } from "@/lib/types";

export interface DashboardKpis {
  scheduledMaintenanceToday: number;
  deliveriesToday: number;
  overduePayments: number;
  lowStock: number;
}

export function computeKpis(
  orders: Order[] = [],
  products: Product[] = [],
  maintenanceVisits: MaintenanceVisit[] = []
): DashboardKpis {
  const scheduledMaintenanceToday = maintenanceVisits.filter(
    (v) =>
      v.status === "Scheduled" && v.date && isToday(new Date(v.date as string))
  ).length;

  const deliveriesToday = orders.filter(
    (o) =>
      o.deliveryDate &&
      o.status !== "Delivered" &&
      o.status !== "Cancelled" &&
      isToday(new Date(o.deliveryDate))
  ).length;

  const overduePayments = orders.filter(
    (o) => o.paymentStatus === "Overdue"
  ).length;

  const lowStock = products.filter(
    (p) => typeof p.stock === "number" && p.stock < 10
  ).length;

  return {
    scheduledMaintenanceToday,
    deliveriesToday,
    overduePayments,
    lowStock,
  };
}

export function computeTrend(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function buildSparkline(series: number[], maxPoints = 20): number[] {
  if (series.length <= maxPoints) return series;
  const factor = Math.ceil(series.length / maxPoints);
  const compact: number[] = [];
  for (let i = 0; i < series.length; i += factor) {
    const slice = series.slice(i, i + factor);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    compact.push(Number(avg.toFixed(2)));
  }
  return compact;
}
