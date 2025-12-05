/** @format */

import { DrillKind } from "../drilldown-types";

// Common Types
export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  color?: string;
}

export interface MetricValue {
  label: string;
  value: string | number;
  trend?: number;
  trendDirection?: "up" | "down" | "neutral";
  subtext?: string;
}

export interface RelatedEntity {
  id: string;
  name: string;
  type: DrillKind;
  subtext?: string;
  status?: string;
  avatar?: string;
  value?: string | number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  status: "completed" | "current" | "pending" | "failed";
  description?: string;
  icon?: string;
}

export interface BasePreviewData {
  id: string;
  name: string;
  kind: DrillKind;
  lastUpdated?: string;
  metadata?: Record<string, unknown>;
}

// Entity Specific Types

export interface CompanyPreviewData extends BasePreviewData {
  paymentScore: number;
  paymentStatus: "excellent" | "good" | "fair" | "poor";
  daysToPayAvg: number;
  onTimePercentage: number;
  outstandingBalance: number;
  revenueTrend: number[];
  totalOrders: number;
  lastOrderDate: string;
  recentOrders: RelatedEntity[];
  riskIndicators?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface OrderPreviewData extends BasePreviewData {
  status: string;
  total: number;
  date: string;
  itemsCount: number;
  timeline: TimelineEvent[];
  company: {
    id: string;
    name: string;
    paymentScore: number;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  payment: {
    status: string;
    method?: string;
    dueDate?: string;
    paidDate?: string;
  };
  delivery: {
    status: string;
    trackingNumber?: string;
    estimatedDate?: string;
  };
  categoryBreakdown?: ChartDataPoint[];
}

export interface ProductPreviewData extends BasePreviewData {
  sku: string;
  price: number;
  stockLevel: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | "overstock";
  salesTrend: number[]; // Last 30 days
  priceHistory: number[];
  metrics: {
    turnoverRate: number;
    daysOfSupply: number;
    margin: number;
  };
  supplier: {
    id: string;
    name: string;
    leadTime: number;
  };
  relatedProducts: RelatedEntity[];
  demandForecast?: "high" | "medium" | "low";
}

export interface RevenuePreviewData extends BasePreviewData {
  totalRevenue: number;
  period: string;
  growth: {
    yoy: number;
    mom: number;
  };
  breakdown: ChartDataPoint[]; // By category
  topDrivers: {
    name: string;
    value: number;
    percentage: number;
  }[];
  forecast?: {
    nextPeriod: number;
    confidence: number;
  };
  profitability: {
    grossMargin: number;
    netMargin: number;
  };
  orderVelocity: number[];
}

export interface PaymentPreviewData extends BasePreviewData {
  amount: number;
  status: string;
  date: string;
  method: string;
  reference?: string;
  company: {
    id: string;
    name: string;
    paymentScore: number;
    history: number[]; // Payment pattern
  };
  relatedInvoice?: {
    id: string;
    balance: number;
    dueDate: string;
  };
  timeline: TimelineEvent[];
}

export interface ManufacturerPreviewData extends BasePreviewData {
  totalProducts: number;
  activeProducts: number;
  revenueTrend: number[];
  performance: {
    onTimeDelivery: number;
    qualityScore: number;
    leadTimeAvg: number;
  };
  categoryDistribution: ChartDataPoint[];
  topProducts: RelatedEntity[];
  fulfillment: {
    pending: number;
    shipped: number;
    delayed: number;
  };
}

export interface CategoryPreviewData extends BasePreviewData {
  productCount: number;
  totalRevenue: number;
  marketShare?: number;
  performanceTrend: number[];
  topProducts: RelatedEntity[];
  underperformingProducts: RelatedEntity[];
  inventoryDistribution: ChartDataPoint[]; // Stock levels
  growth: {
    yoy: number;
    trend: "up" | "down" | "flat";
  };
}

export interface InventoryPreviewData extends BasePreviewData {
  totalValue: number;
  totalItems: number;
  healthScore: number;
  stockDistribution: {
    low: number;
    optimal: number;
    overstock: number;
  };
  turnoverByCategory: {
    category: string;
    rate: number;
  }[];
  valuationBreakdown: ChartDataPoint[];
  deadStockValue: number;
  topReorderItems: RelatedEntity[];
}

export interface MaintenancePreviewData extends BasePreviewData {
  status: string;
  priority: string;
  date: string;
  cost: {
    total: number;
    parts: number;
    labor: number;
    travel: number;
  };
  timeline: TimelineEvent[];
  technician: {
    id: string;
    name: string;
    rating: number;
  };
  equipment: {
    id: string;
    name: string;
    healthStatus: string;
  };
  partsUsed: {
    name: string;
    quantity: number;
    cost: number;
  }[];
}

export interface BaristaPreviewData extends BasePreviewData {
  rating: number;
  branch: {
    id: string;
    name: string;
  };
  performanceTrend: number[]; // Rating over time
  metrics: {
    visitsPerDay: number;
    avgServiceTime: number;
    satisfactionScore: number;
  };
  skills: {
    name: string;
    level: number; // 1-5
  }[];
  schedule: {
    nextShift?: string;
    hoursThisWeek: number;
  };
  recentVisits: RelatedEntity[];
}

export interface BranchPreviewData extends BasePreviewData {
  location: string;
  manager?: string;
  healthScore: number;
  revenueTrend: number[];
  orderVolume: number[];
  metrics: {
    uptime: number;
    serviceQuality: number;
    customerSatisfaction: number;
  };
  staff: {
    count: number;
    avgRating: number;
  };
  alerts: {
    type: "warning" | "error" | "info";
    message: string;
    count: number;
  }[];
  comparisonRank: number; // Percentile
}

export interface CustomerPreviewData extends BasePreviewData {
  type: "individual" | "business";
  status: string;
  segment: string;
  metrics: {
    ltv: number;
    churnRisk: number; // 0-100
    retentionRate: number;
    orderFrequency: number; // days
  };
  growthTrend: number[]; // Acquisition or value
  segmentation: ChartDataPoint[];
  topCustomers?: RelatedEntity[]; // For aggregate view
  acquisitionChannels?: ChartDataPoint[];
  cohortAnalysis?: {
    period: string;
    retention: number;
  }[];
}

export interface FeedbackPreviewData extends BasePreviewData {
  rating: number;
  sentiment: "positive" | "negative" | "neutral";
  date: string;
  message?: string;
  feedbackDate?: string;
  client: {
    id: string;
    name: string;
    type: string;
  };
  relatedOrders: RelatedEntity[];
  sentimentTrend: number[]; // Client's sentiment over time
  responseTime?: number; // hours
  actionItems?: string[];
}

export interface NotificationPreviewData extends BasePreviewData {
  title?: string;
  message?: string;
  priority: "critical" | "warning" | "info";
  status: "read" | "unread" | "archived";
  created: string;
  source: string;
  relatedEntity?: RelatedEntity;
  timeline: TimelineEvent[];
  similarCount: number;
  actions: {
    label: string;
    action: string;
    primary?: boolean;
  }[];
}

// Union type for all preview data
export type AnyPreviewData = 
  | CompanyPreviewData
  | OrderPreviewData
  | ProductPreviewData
  | RevenuePreviewData
  | PaymentPreviewData
  | ManufacturerPreviewData
  | CategoryPreviewData
  | InventoryPreviewData
  | MaintenancePreviewData
  | BaristaPreviewData
  | BranchPreviewData
  | CustomerPreviewData
  | FeedbackPreviewData
  | NotificationPreviewData;
