/** @format */

import { format, formatDistanceToNow } from "date-fns";
import { ChartDataPoint, MetricValue, TimelineEvent } from "./preview-data-types";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function determineHealthStatus(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "fair";
  return "poor";
}

export function generateSparklineData(length: number = 10, min: number = 0, max: number = 100): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

export function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (["completed", "paid", "delivered", "active", "excellent", "good"].includes(s)) return "bg-green-500";
  if (["pending", "processing", "shipped", "fair", "warning"].includes(s)) return "bg-amber-500";
  if (["failed", "cancelled", "overdue", "poor", "critical", "error"].includes(s)) return "bg-red-500";
  return "bg-slate-500";
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function formatTimelineDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "MMM d, h:mm a");
  } catch (e) {
    return dateStr;
  }
}

export function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return dateStr;
  }
}

export const CHART_COLORS = {
  blue: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
  green: ["#16a34a", "#22c55e", "#4ade80", "#86efac"],
  amber: ["#d97706", "#f59e0b", "#fbbf24", "#fcd34d"],
  red: ["#dc2626", "#ef4444", "#f87171", "#fca5a5"],
  purple: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"],
  slate: ["#475569", "#64748b", "#94a3b8", "#cbd5e1"],
};

export function generateColorScale(baseColor: keyof typeof CHART_COLORS, steps: number): string[] {
  const colors = CHART_COLORS[baseColor];
  // Simple logic to repeat/cycle colors if steps > available colors
  return Array.from({ length: steps }, (_, i) => colors[i % colors.length]);
}
