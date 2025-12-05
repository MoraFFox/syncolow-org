/** @format */

import { NotificationActionType } from "./types";

export type DrillKind =
  | "revenue"
  | "product"
  | "company"
  | "order"
  | "maintenance"
  | "inventory"
  | "customer"
  | "barista"
  | "branch"
  | "manufacturer"
  | "category"
  | "feedback"
  | "notification"
  | "payment";

export type DrillMode = "page" | "dialog";

// Define specific payloads for each kind
export interface DrillPayloadMap {
  revenue: {
    value?: string;
    granularity?: "day" | "week" | "month" | "year";
    amount?: number;
  };
  product: {
    id: string;
    name?: string;
    stock?: number;
    price?: number;
  };
  company: {
    id: string;
    name?: string;
    status?: string;
    phoneNumber?: string;
  };
  order: {
    id: string;
    total?: number;
  };
  maintenance: {
    id: string;
    branchId?: string;
    branchName?: string;
    companyId?: string;
    companyName?: string;
    date?: string;
    technicianName?: string;
    status?: string;
    totalCost?: number;
    notes?: string;
    rating?: number;
  };
  inventory: {
    id?: string;
  };
  customer: {
    id?: string;
  };
  barista: {
    id: string;
    name?: string;
    branchId?: string;
    branchName?: string;
    rating?: number;
    phoneNumber?: string;
  };
  branch: {
    id: string;
    name?: string;
    companyId?: string;
    companyName?: string;
    location?: string;
    performanceScore?: number;
    machineOwned?: boolean;
    phoneNumber?: string;
  };
  manufacturer: {
    id: string;
    name?: string;
    icon?: string;
    productCount?: number;
    phoneNumber?: string;
  };
  category: {
    id: string;
    name?: string;
    productCount?: number;
    revenue?: number;
  };
  feedback: {
    id: string;
    clientId?: string;
    clientName?: string;
    rating?: number;
    sentiment?: "positive" | "negative" | "neutral";
    message?: string;
    feedbackDate?: string;
  };
  notification: {
    id: string;
    title?: string;
    message?: string;
    priority?: "critical" | "warning" | "info";
    icon?: string;
    source?: string;
    createdAt?: string;
    read?: boolean;
    snoozedUntil?: string;
    actionType?: NotificationActionType;
    entityId?: string;
    link?: string;
    metadata?: {
      entityType?: string;
      entityId?: string;
      amount?: number;
      daysUntil?: number;
      clientName?: string;
      orderCount?: number;
    };
  };
  payment: {
    id: string; // orderId
    orderId: string;
    companyId?: string;
    companyName?: string;
    amount?: number;
    paidDate?: string;
    paymentMethod?: "transfer" | "check";
    paymentReference?: string;
    paymentNotes?: string;
  };
}

// Generic payload type for backward compatibility or loose usage
export type BaseDrillPayload = Record<string, unknown>;

// Helper type to get payload for a specific kind
export type DrillPayload<K extends DrillKind = DrillKind> =
  K extends keyof DrillPayloadMap ? DrillPayloadMap[K] : BaseDrillPayload;

export interface DrillPreviewState {
  isOpen: boolean;
  kind: DrillKind | null;
  payload: DrillPayload | null;
  coords?: { x: number; y: number };
}

export interface DrillContextType {
  kind: DrillKind | null;
  payload: DrillPayload | null;
  isOpen: boolean;
}

// Data attribute constants for global drilldown system
export const DATA_DRILL_KIND = "data-drill-kind";
export const DATA_DRILL_PAYLOAD = "data-drill-payload";
export const DATA_DRILL_MODE = "data-drill-mode";
export const DATA_DRILL_DISABLED = "data-drill-disabled";
