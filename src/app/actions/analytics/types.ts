import { z } from 'zod';

export const AnalyticsQuerySchema = z.object({
    entityType: z.enum(['global', 'client', 'product', 'category', 'area']),
    entityId: z.string().optional(),
    dateRange: z.object({
        from: z.date(),
        to: z.date(),
    }),
    granularity: z.enum(['day', 'week', 'month']),
    metrics: z.array(z.enum([
        'revenue', 'orders', 'units', 'returns',
        'aov', 'profit', 'cogs', 'revenueGrowthRate', 'activeClients'
    ])).default(['revenue', 'orders']),
    // V2: Comparison Mode
    comparisonMode: z.enum(['previous', 'custom', 'none']).default('previous'),
    comparisonRange: z.object({
        from: z.date(),
        to: z.date(),
    }).optional(),
});

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

export interface AnalyticsMetric {
    value: number;
    previousValue?: number; // Absolute value of the previous period
    change: number; // percentage vs previous period
    trend: 'up' | 'down' | 'neutral';
}

// V2: Revenue Driver Decomposition
export interface RevenueDrivers {
    ordersImpact: number;      // % contribution to revenue change from order count
    aovImpact: number;         // % contribution to revenue change from AOV
    clientsImpact: number;     // % contribution from client base changes
    totalChange: number;       // Total revenue change %
}

// V2: Driver Time Series for Performance Panel
export interface DriverTimeSeriesPoint {
    date: string;
    label: string;
    value: number;
    previousValue: number;
}

export interface DriverTimeSeries {
    orders: DriverTimeSeriesPoint[];
    aov: DriverTimeSeriesPoint[];
    activeClients: DriverTimeSeriesPoint[];
}

export interface TimeSeriesPoint {
    date: string; // ISO string
    label: string; // Display label (e.g. "Mon", "Jan 1")
    revenue: number;
    previousRevenue?: number; // For comparison charts
    orders: number;
    previousOrders?: number;
    aov: number;
    previousAov?: number;
    activeClients?: number;
    previousActiveClients?: number;
    [key: string]: string | number | undefined; // Dynamic metrics
}

// V2: Concentration Metrics
export interface ConcentrationMetrics {
    top3ProductsRevenue: number;
    top3ProductsPercentage: number;
    concentrationRisk: 'low' | 'medium' | 'high';
    herfindahlIndex: number; // 0-1 scale, higher = more concentrated
}

// V2: Enhanced Product with cumulative for Pareto
export interface TopProduct {
    name: string;
    productId: string;
    revenue: number;
    quantity: number;
    percentageOfTotal: number;
    cumulativePercentage: number; // For Pareto chart line
    topClients?: {
        id: string; // CompanyId
        name: string; // Company Name
        quantity: number;
        percentage: number; // Share of this product's consumption
        totalSpent: number;
        lastActive: string;
        avgMonthlyConsumption?: number; // New: Avg units per month
        projectedGrowth?: number; // New: Percentage forecast for next month (-100 to 100+)
    }[];
}

// V2: Enhanced Category with trends
export interface TopCategory {
    name: string;
    revenue: number;
    previousRevenue?: number;
    percentageOfTotal: number;
    trend: 'up' | 'down' | 'neutral';
    growthPercent?: number;
    change: number;
}

// V2: Enhanced Area with status
export interface AreaPerformance {
    name: string;
    revenue: number;
    previousRevenue?: number;
    growthPercent?: number;
    clientCount?: number;
    orderCount?: number;
    percentageOfTotal: number;
    status?: 'growing' | 'stable' | 'declining';
    change: number;
    trend: 'up' | 'down' | 'neutral';
}

// V2: Analytics Alert
export interface AnalyticsAlert {
    id: string;
    type: 'anomaly' | 'trend' | 'milestone' | 'risk';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    metric: string;
    value: number;
    threshold?: number;
    detectedAt: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
}

// V2: Debt / Receivables
export interface DebtAging {
    total: number;
    current: number;    // 0-30 days
    overdue30: number;  // 31-60 days
    overdue60: number;  // 61-90 days
    overdue90: number;  // 90+ days
    dso: number;        // Days Sales Outstanding
    riskScore: number;  // 0-100
}

// V2: Client Retention (Orbit)
export interface ClientRiskPoint {
    id: string;
    name: string;
    value: number; // Annual Revenue
    daysSinceLastOrder: number;
    churnProbability: number; // 0-1
    status: 'safe' | 'drifting' | 'at-risk' | 'churned';
}

export interface ClientRetention {
    totalActive: number;
    atRiskCount: number;
    driftingCount: number;
    safeCount: number;
    clients: ClientRiskPoint[]; // Top 20 for visualization
}

// V2: Inventory Spoilage (Ticker)
export interface InventoryRiskItem {
    id: string;
    sku: string;
    name: string;
    expiryDate: string; // ISO
    daysRemaining: number;
    value: number;
    riskLevel: 'critical' | 'warning' | 'safe';
}

export interface OperationalMetrics {
    frictionRate: AnalyticsMetric; // (Returns + Refusals) / Total Orders
    otifRate: AnalyticsMetric; // On-Time In-Full %
    lateDeliveries: AnalyticsMetric;
    stockoutMisses: AnalyticsMetric; // Lost revenue
    history?: { date: string; late: number; otif: number }[]; // Daily breakdown
}

// V3 Deep Learning (Ultramode)
export interface ForecastDataPoint {
    date: string;
    confirmed: number;
    projected: number;
    riskAdjusted: number;
}

export interface AssociationNode {
    id: string;
    name: string;
    category: string;
    value: number;
}

export interface AssociationLink {
    source: string;
    target: string;
    value: number;
}

export interface CustomerSegment {
    id: 'champions' | 'loyal' | 'potential' | 'at_risk' | 'lost';
    label: string;
    count: number;
    totalValue: number;
    percentage: number;
}

// V2: Forecast with Confidence
export interface ForecastMetric {
    value: number;
    confidenceLow: number;    // 80% CI lower bound
    confidenceHigh: number;   // 80% CI upper bound
    assumptions: string[];
}

export interface AffinityItem {
    id: string;
    name: string;
    correlationScore: number;
}

export interface AnalyticsResponse {
    summary: {
        // Core / Mandatory (Global)
        revenue: AnalyticsMetric;
        orders: AnalyticsMetric;
        aov: AnalyticsMetric;
        activeClients?: AnalyticsMetric; // Global / Area

        // V2: Revenue Drivers
        revenueDrivers?: RevenueDrivers;

        // Product / Category Specific
        stockLevel?: AnalyticsMetric;
        stockTurnover?: AnalyticsMetric;
        unitsSold?: AnalyticsMetric;
        activeProducts?: AnalyticsMetric;
        topProductShare?: AnalyticsMetric;
        avgMargin?: AnalyticsMetric;
        returnRate?: AnalyticsMetric;
        seasonalityIndex?: AnalyticsMetric;
        uniqueProductsPurchased?: AnalyticsMetric;

        // Client / Area Specific
        lastOrderDate?: string;
        daysSinceLastOrder?: number;
        revenuePerClient?: AnalyticsMetric;
        clientCount?: AnalyticsMetric;
        newClients?: AnalyticsMetric;
        revenueGrowthRate?: AnalyticsMetric;

        // Strategic / Optional
        returns?: AnalyticsMetric;
        margin?: AnalyticsMetric;
        fulfillmentTime?: AnalyticsMetric;
        paymentDelay?: AnalyticsMetric;
        repeatPurchaseRate?: AnalyticsMetric;
        discountDependency?: AnalyticsMetric;
        clv?: AnalyticsMetric;

        // Logistics (Area)
        deliveryTime?: AnalyticsMetric;
        deliverySuccessRate?: AnalyticsMetric;
        routeEfficiency?: AnalyticsMetric;

        // Forecast / Finance
        churnRate?: AnalyticsMetric;
        cac?: AnalyticsMetric;
        slaCompliance?: AnalyticsMetric;
        forecastedRevenue?: AnalyticsMetric;

        // V2: New Command Deck Metrics
        debtAging?: DebtAging;
        clientRetention?: ClientRetention;
        inventoryRisk?: InventoryRiskItem[];

        // V2.1: Operational Metrics (Domain Gap)
        operational?: OperationalMetrics;

        // V3: Ultramode Intelligence
        forecast?: ForecastDataPoint[];
        // associations?: { nodes: AssociationNode[]; links: AssociationLink[] }; // Removed per requests
        customerSegments?: CustomerSegment[];

        // New Request
        productConsumption?: {
            productId: string;
            id: string; // Alias for UI Compatibility
            name: string;
            category: string; // Restored for UI Compatibility
            quantity: number;
            totalUnits: number; // Alias for UI Compatibility
            revenue: number;
            percentageOfTotal: number;
            consumptionRate: number; // units/day
            trend: 'up' | 'down' | 'stable' | 'neutral'; // Restored
            topClients?: {
                id: string; // CompanyId
                name: string; // Company Name
                quantity: number;
                percentage: number; // Share of this product's consumption
                totalSpent: number; // NEW
                lastActive: string; // NEW
            }[];
        }[];

        // NEW: Bundle Affinity
        productAffinity?: AffinityItem[];
    };

    timeSeries: TimeSeriesPoint[];

    // V2: Driver Time Series for Performance Panel
    driverTimeSeries?: DriverTimeSeries;

    // V2: Concentration Metrics
    concentrationMetrics?: ConcentrationMetrics;

    // V2: Enhanced Top Lists
    topProducts?: TopProduct[];
    topCategories?: TopCategory[];
    topAreas?: AreaPerformance[];

    // V2: Alerts
    alerts?: AnalyticsAlert[];

    // V2: Forecast with Confidence
    forecastWithConfidence?: ForecastMetric;

    serverDiagnostics: {
        queryDuration: number;
        cached: boolean;
    };
}
