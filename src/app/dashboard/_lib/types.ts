/** @format */

export type AlertPriority = "critical" | "high" | "medium" | "low";

export type AlertType = "Overdue Payment" | "Low Stock" | "Inactive Client" | "Tomorrow Delivery";

import type { Order, Product, Company } from "@/lib/types";

export type OverdueOrder = Pick<Order, "id" | "companyName"> & {
  overdueDays?: number;
};
export type LowStockProduct = Pick<Product, "id" | "name" | "stock">;
export type TomorrowDeliveryOrder = Pick<Order, "id" | "deliveryDate">;
export type InactiveCompany = Pick<Company, "id" | "name"> & {
  lastOrderDate?: string;
};
export type AlertData = OverdueOrder | LowStockProduct | TomorrowDeliveryOrder | InactiveCompany;

export interface AlertItem {
  type: AlertType;
  priority: AlertPriority;
  data: AlertData;
  link: string;
  timestamp: Date;
  id: string;
}

// Activity feed types
export type ActivityType = "New Order" | "New Feedback" | "New Client";
export type ActivityData =
  | Pick<Order, "id" | "companyId" | "companyName" | "orderDate">
  | Pick<Company, "id" | "name" | "createdAt">
  | Pick<import("@/lib/types").Feedback, "id" | "clientId" | "message" | "feedbackDate">;
export interface Activity {
  type: ActivityType;
  data: ActivityData;
  date: string;
}

export interface KpiTrend {
  value: number;
  change: number;
  changePercent: number;
}

export type DashboardSection = {
  key: string;
  title: string;
  description?: string;
};

export interface VisitWithCoords {
  id: string;
  clientName: string;
  address: string;
  coords: [number, number] | null;
  outcome?: string;
  notes?: string;
  type?: string;
  date?: string;
}
