/** @format */

import { AlertTriangle, Package, UserX, Calendar } from "lucide-react";
import type { AlertItem, AlertPriority, AlertType, AlertData } from "./types";

export function calculateAlertPriority(type: AlertType, data: AlertData): AlertPriority {
  if (type === "Overdue Payment") {
    const o = data as Extract<AlertData, { overdueDays?: number }>;
    const days = typeof o?.overdueDays === "number" ? o.overdueDays : 0;
    if (days > 30) return "critical";
    return days > 0 ? "high" : "high";
  }
  if (type === "Low Stock") {
    const p = data as Extract<AlertData, { stock: number }>;
    const stock = typeof p?.stock === "number" ? p.stock : 0;
    if (stock < 5) return "high";
    if (stock < 10) return "medium";
    return "low";
  }
  if (type === "Tomorrow Delivery") return "medium";
  return "low";
}

export function sortAlertsByPriority<T extends { priority: AlertPriority }>(
  alerts: T[]
): T[] {
  const order: Record<AlertPriority, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  return alerts.slice().sort((a, b) => order[a.priority] - order[b.priority]);
}

export function getAlertIcon(type: AlertType) {
  switch (type) {
    case "Overdue Payment":
      return AlertTriangle;
    case "Low Stock":
      return Package;
    case "Inactive Client":
      return UserX;
    case "Tomorrow Delivery":
      return Calendar;
    default:
      return AlertTriangle;
  }
}

export function formatAlertMessage(alert: { type: AlertType; data: AlertData }) {
  if (alert.type === "Low Stock") return `Stock level is low (${(alert.data as Extract<AlertData, { stock: number }>).stock}).`;
  if (alert.type === "Tomorrow Delivery") return "Scheduled for tomorrow.";
  if (alert.type === "Inactive Client") return "Has been inactive for a while.";
  if (alert.type === "Overdue Payment") return `Payment for ${(alert.data as Extract<AlertData, { companyName: string }>).companyName} is overdue.`;
  return "";
}

export function toAlertItems(
  raw: Array<{ type: AlertType; data: AlertData; link: string }>
): AlertItem[] {
  return raw.map((r) => ({
    type: r.type,
    data: r.data,
    link: r.link,
    id: r.data?.id || crypto.randomUUID(),
    timestamp: new Date(),
    priority: calculateAlertPriority(r.type, r.data),
  }));
}
