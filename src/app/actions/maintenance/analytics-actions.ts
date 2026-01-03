/**
 * Maintenance Analytics Server Actions
 * 
 * Server-side analytics calculations for the maintenance module.
 * Performs aggregations and statistics directly on the database.
 */

"use server";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { ActionResponse } from "./maintenance-schemas";

// =============================================================================
// Types
// =============================================================================

/**
 * Key Performance Indicators for maintenance
 */
export interface MaintenanceKPIs {
    totalVisits: number;
    completedVisits: number;
    pendingVisits: number;
    cancelledVisits: number;
    avgResolutionDays: number;
    totalCost: number;
    avgCostPerVisit: number;
    problemsSolvedRate: number;
    followUpRate: number;
}

/**
 * Delay analytics
 */
export interface DelayAnalytics {
    totalDelayedVisits: number;
    significantDelays: number;
    averageDelayDays: number;
    onTimePercentage: number;
    delayReasons: Array<{ reason: string; count: number }>;
    technicianDelays: Array<{ technician: string; delayCount: number; avgDelay: number }>;
}

/**
 * Technician performance metrics
 */
export interface TechnicianPerformance {
    name: string;
    totalVisits: number;
    completedVisits: number;
    pendingVisits: number;
    avgResolutionDays: number;
    onTimePercentage: number;
    avgDelayDays: number;
    totalCostGenerated: number;
    problemsSolvedRate: number;
}

/**
 * Cost breakdown report
 */
export interface CostBreakdown {
    totalMaintenanceCost: number;
    totalLaborCost: number;
    totalPartsCost: number;
    totalServiceCost: number;
    companyPaidCost: number;
    clientPaidCost: number;
    byVisitType: Array<{ type: string; cost: number; count: number }>;
    byMonth: Array<{ month: string; cost: number; count: number }>;
}

/**
 * Resolution metrics
 */
export interface ResolutionMetrics {
    totalWithProblems: number;
    solved: number;
    partial: number;
    notSolved: number;
    waitingParts: number;
    avgResolutionTime: number;
    resolutionRateByType: Array<{ type: string; rate: number; count: number }>;
}

/**
 * Date filter for analytics
 */
export interface DateRangeFilter {
    dateFrom?: string;
    dateTo?: string;
    companyId?: string;
    branchId?: string;
    technicianName?: string;
}

// =============================================================================
// Types for database records
// =============================================================================

interface MaintenanceRecord {
    id: string;
    status?: string;
    date?: string;
    visitType?: string;
    delayDays?: number;
    delayReason?: string;
    isSignificantDelay?: boolean;
    technicianName?: string;
    problemOccurred?: boolean;
    resolutionStatus?: string;
    resolutionTimeDays?: number;
    totalCost?: number;
    laborCost?: number;
    rootVisitId?: string | null;
    spareParts?: Array<{ price?: number; quantity: number; paidBy?: string }>;
    services?: Array<{ cost?: number; quantity: number; paidBy?: string }>;
}

// =============================================================================
// KPI Analytics
// =============================================================================

/**
 * Get maintenance Key Performance Indicators
 */
export async function getMaintenanceKPIs(
    filter?: DateRangeFilter
): Promise<ActionResponse<MaintenanceKPIs>> {
    try {
        let query = supabase.from("maintenance").select("*");

        // Apply filters
        if (filter?.dateFrom) {
            query = query.gte("date", filter.dateFrom);
        }
        if (filter?.dateTo) {
            query = query.lte("date", filter.dateTo);
        }
        if (filter?.companyId) {
            query = query.eq("companyId", filter.companyId);
        }
        if (filter?.branchId) {
            query = query.eq("branchId", filter.branchId);
        }
        if (filter?.technicianName) {
            query = query.eq("technicianName", filter.technicianName);
        }

        const { data, error } = await query;

        if (error) {
            logger.error(error, {
                component: "analytics-actions",
                action: "getMaintenanceKPIs",
            });
            return { success: false, error: "Failed to fetch maintenance KPIs" };
        }

        const visits = (data || []) as MaintenanceRecord[];
        const totalVisits = visits.length;

        // Filter to root visits only for stats (exclude follow-ups from count)
        const rootVisits = visits.filter((v) => !v.rootVisitId);

        const completedVisits = rootVisits.filter(
            (v) => v.status === "Completed"
        ).length;
        const pendingVisits = rootVisits.filter(
            (v) => v.status === "Scheduled" || v.status === "In Progress"
        ).length;
        const cancelledVisits = rootVisits.filter(
            (v) => v.status === "Cancelled"
        ).length;

        // Calculate average resolution time
        const visitsWithResolutionTime = visits.filter(
            (v) => v.resolutionTimeDays != null && v.resolutionTimeDays > 0
        );
        const avgResolutionDays =
            visitsWithResolutionTime.length > 0
                ? visitsWithResolutionTime.reduce(
                    (sum, v) => sum + (v.resolutionTimeDays || 0),
                    0
                ) / visitsWithResolutionTime.length
                : 0;

        // Calculate total cost
        const totalCost = visits.reduce((sum, v) => sum + (v.totalCost || v.laborCost || 0), 0);
        const avgCostPerVisit = totalVisits > 0 ? totalCost / totalVisits : 0;

        // Calculate problems solved rate
        const visitsWithProblems = visits.filter((v) => v.problemOccurred === true);
        const problemsSolved = visitsWithProblems.filter(
            (v) => v.resolutionStatus === "solved"
        ).length;
        const problemsSolvedRate =
            visitsWithProblems.length > 0
                ? (problemsSolved / visitsWithProblems.length) * 100
                : 100;

        // Calculate follow-up rate
        const followUps = visits.filter((v) => v.rootVisitId != null);
        const followUpRate =
            rootVisits.length > 0 ? (followUps.length / rootVisits.length) * 100 : 0;

        return {
            success: true,
            data: {
                totalVisits,
                completedVisits,
                pendingVisits,
                cancelledVisits,
                avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
                totalCost: Math.round(totalCost * 100) / 100,
                avgCostPerVisit: Math.round(avgCostPerVisit * 100) / 100,
                problemsSolvedRate: Math.round(problemsSolvedRate),
                followUpRate: Math.round(followUpRate),
            },
        };
    } catch (error) {
        logger.error(error, {
            component: "analytics-actions",
            action: "getMaintenanceKPIs",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// Delay Analytics
// =============================================================================

/**
 * Get delay analytics
 */
export async function getDelayAnalytics(
    filter?: DateRangeFilter
): Promise<ActionResponse<DelayAnalytics>> {
    try {
        let query = supabase
            .from("maintenance")
            .select("*")
            .eq("status", "Completed");

        // Apply filters
        if (filter?.dateFrom) {
            query = query.gte("date", filter.dateFrom);
        }
        if (filter?.dateTo) {
            query = query.lte("date", filter.dateTo);
        }
        if (filter?.companyId) {
            query = query.eq("companyId", filter.companyId);
        }
        if (filter?.branchId) {
            query = query.eq("branchId", filter.branchId);
        }

        const { data, error } = await query;

        if (error) {
            logger.error(error, {
                component: "analytics-actions",
                action: "getDelayAnalytics",
            });
            return { success: false, error: "Failed to fetch delay analytics" };
        }

        const visits = (data || []) as MaintenanceRecord[];
        const completedVisits = visits.length;

        // Delayed visits
        const delayedVisits = visits.filter(
            (v) => (v.delayDays || 0) > 0
        );
        const totalDelayedVisits = delayedVisits.length;

        // Significant delays (> 3 days)
        const significantDelays = visits.filter(
            (v) => v.isSignificantDelay || (v.delayDays || 0) > 3
        ).length;

        // Average delay
        const totalDelayDays = delayedVisits.reduce(
            (sum, v) => sum + (v.delayDays || 0),
            0
        );
        const averageDelayDays =
            delayedVisits.length > 0 ? totalDelayDays / delayedVisits.length : 0;

        // On-time percentage
        const onTimePercentage =
            completedVisits > 0
                ? ((completedVisits - totalDelayedVisits) / completedVisits) * 100
                : 100;

        // Delay reasons breakdown
        const delayReasonMap = new Map<string, number>();
        delayedVisits.forEach((v) => {
            if (v.delayReason) {
                delayReasonMap.set(
                    v.delayReason,
                    (delayReasonMap.get(v.delayReason) || 0) + 1
                );
            }
        });
        const delayReasons = Array.from(delayReasonMap.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);

        // Technician delay breakdown
        const technicianDelayMap = new Map<
            string,
            { count: number; totalDelay: number }
        >();
        delayedVisits.forEach((v) => {
            if (v.technicianName) {
                const existing = technicianDelayMap.get(v.technicianName) || {
                    count: 0,
                    totalDelay: 0,
                };
                existing.count++;
                existing.totalDelay += v.delayDays || 0;
                technicianDelayMap.set(v.technicianName, existing);
            }
        });
        const technicianDelays = Array.from(technicianDelayMap.entries())
            .map(([technician, data]) => ({
                technician,
                delayCount: data.count,
                avgDelay: Math.round((data.totalDelay / data.count) * 10) / 10,
            }))
            .sort((a, b) => b.delayCount - a.delayCount);

        return {
            success: true,
            data: {
                totalDelayedVisits,
                significantDelays,
                averageDelayDays: Math.round(averageDelayDays * 10) / 10,
                onTimePercentage: Math.round(onTimePercentage),
                delayReasons,
                technicianDelays,
            },
        };
    } catch (error) {
        logger.error(error, {
            component: "analytics-actions",
            action: "getDelayAnalytics",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// Technician Performance
// =============================================================================

/**
 * Get technician performance metrics
 */
export async function getTechnicianPerformance(
    filter?: DateRangeFilter
): Promise<ActionResponse<TechnicianPerformance[]>> {
    try {
        let query = supabase.from("maintenance").select("*");

        // Apply filters
        if (filter?.dateFrom) {
            query = query.gte("date", filter.dateFrom);
        }
        if (filter?.dateTo) {
            query = query.lte("date", filter.dateTo);
        }
        if (filter?.companyId) {
            query = query.eq("companyId", filter.companyId);
        }

        const { data, error } = await query;

        if (error) {
            logger.error(error, {
                component: "analytics-actions",
                action: "getTechnicianPerformance",
            });
            return { success: false, error: "Failed to fetch technician performance" };
        }

        const visits = (data || []) as MaintenanceRecord[];

        // Group by technician
        const technicianMap = new Map<
            string,
            {
                total: number;
                completed: number;
                pending: number;
                resolutionDays: number[];
                delayDays: number[];
                onTime: number;
                totalCost: number;
                problemsSolved: number;
                problemsTotal: number;
            }
        >();

        visits.forEach((v) => {
            if (!v.technicianName) return;

            const existing = technicianMap.get(v.technicianName) || {
                total: 0,
                completed: 0,
                pending: 0,
                resolutionDays: [],
                delayDays: [],
                onTime: 0,
                totalCost: 0,
                problemsSolved: 0,
                problemsTotal: 0,
            };

            existing.total++;
            existing.totalCost += v.totalCost || v.laborCost || 0;

            if (v.status === "Completed") {
                existing.completed++;
                if ((v.delayDays || 0) === 0) {
                    existing.onTime++;
                }
                if (v.resolutionTimeDays != null && v.resolutionTimeDays > 0) {
                    existing.resolutionDays.push(v.resolutionTimeDays);
                }
                if (v.delayDays != null && v.delayDays > 0) {
                    existing.delayDays.push(v.delayDays);
                }
            }

            if (v.status === "Scheduled" || v.status === "In Progress") {
                existing.pending++;
            }

            if (v.problemOccurred) {
                existing.problemsTotal++;
                if (v.resolutionStatus === "solved") {
                    existing.problemsSolved++;
                }
            }

            technicianMap.set(v.technicianName, existing);
        });

        // Build performance array
        const performance: TechnicianPerformance[] = Array.from(
            technicianMap.entries()
        ).map(([name, data]) => ({
            name,
            totalVisits: data.total,
            completedVisits: data.completed,
            pendingVisits: data.pending,
            avgResolutionDays:
                data.resolutionDays.length > 0
                    ? Math.round(
                        (data.resolutionDays.reduce((a, b) => a + b, 0) /
                            data.resolutionDays.length) *
                        10
                    ) / 10
                    : 0,
            onTimePercentage:
                data.completed > 0
                    ? Math.round((data.onTime / data.completed) * 100)
                    : 100,
            avgDelayDays:
                data.delayDays.length > 0
                    ? Math.round(
                        (data.delayDays.reduce((a, b) => a + b, 0) /
                            data.delayDays.length) *
                        10
                    ) / 10
                    : 0,
            totalCostGenerated: Math.round(data.totalCost * 100) / 100,
            problemsSolvedRate:
                data.problemsTotal > 0
                    ? Math.round((data.problemsSolved / data.problemsTotal) * 100)
                    : 100,
        }));

        // Sort by total visits (most active first)
        performance.sort((a, b) => b.totalVisits - a.totalVisits);

        return { success: true, data: performance };
    } catch (error) {
        logger.error(error, {
            component: "analytics-actions",
            action: "getTechnicianPerformance",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// Cost Analytics
// =============================================================================

/**
 * Get cost breakdown report
 */
export async function getMaintenanceCostBreakdown(
    filter?: DateRangeFilter
): Promise<ActionResponse<CostBreakdown>> {
    try {
        let query = supabase.from("maintenance").select("*");

        // Apply filters
        if (filter?.dateFrom) {
            query = query.gte("date", filter.dateFrom);
        }
        if (filter?.dateTo) {
            query = query.lte("date", filter.dateTo);
        }
        if (filter?.companyId) {
            query = query.eq("companyId", filter.companyId);
        }
        if (filter?.branchId) {
            query = query.eq("branchId", filter.branchId);
        }

        const { data, error } = await query;

        if (error) {
            logger.error(error, {
                component: "analytics-actions",
                action: "getMaintenanceCostBreakdown",
            });
            return { success: false, error: "Failed to fetch cost breakdown" };
        }

        const visits = (data || []) as MaintenanceRecord[];

        let totalLaborCost = 0;
        let totalPartsCost = 0;
        let totalServiceCost = 0;
        let companyPaidCost = 0;
        let clientPaidCost = 0;

        const byVisitTypeMap = new Map<string, { cost: number; count: number }>();
        const byMonthMap = new Map<string, { cost: number; count: number }>();

        visits.forEach((v) => {
            const laborCost = v.laborCost || 0;
            totalLaborCost += laborCost;
            companyPaidCost += laborCost; // Labor is always company paid

            // Parts cost
            (v.spareParts || []).forEach((part) => {
                const partCost = (part.price || 0) * (part.quantity || 1);
                totalPartsCost += partCost;
                if (part.paidBy === "Company") {
                    companyPaidCost += partCost;
                } else {
                    clientPaidCost += partCost;
                }
            });

            // Services cost
            (v.services || []).forEach((service) => {
                const serviceCost = (service.cost || 0) * (service.quantity || 1);
                totalServiceCost += serviceCost;
                if (service.paidBy === "Company") {
                    companyPaidCost += serviceCost;
                } else {
                    clientPaidCost += serviceCost;
                }
            });

            const visitCost = v.totalCost || laborCost;

            // By visit type
            if (v.visitType) {
                const existing = byVisitTypeMap.get(v.visitType) || { cost: 0, count: 0 };
                existing.cost += visitCost;
                existing.count++;
                byVisitTypeMap.set(v.visitType, existing);
            }

            // By month
            if (v.date) {
                const month = v.date.substring(0, 7); // YYYY-MM
                const existing = byMonthMap.get(month) || { cost: 0, count: 0 };
                existing.cost += visitCost;
                existing.count++;
                byMonthMap.set(month, existing);
            }
        });

        const totalMaintenanceCost = totalLaborCost + totalPartsCost + totalServiceCost;

        const byVisitType = Array.from(byVisitTypeMap.entries())
            .map(([type, data]) => ({
                type,
                cost: Math.round(data.cost * 100) / 100,
                count: data.count,
            }))
            .sort((a, b) => b.cost - a.cost);

        const byMonth = Array.from(byMonthMap.entries())
            .map(([month, data]) => ({
                month,
                cost: Math.round(data.cost * 100) / 100,
                count: data.count,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        return {
            success: true,
            data: {
                totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
                totalLaborCost: Math.round(totalLaborCost * 100) / 100,
                totalPartsCost: Math.round(totalPartsCost * 100) / 100,
                totalServiceCost: Math.round(totalServiceCost * 100) / 100,
                companyPaidCost: Math.round(companyPaidCost * 100) / 100,
                clientPaidCost: Math.round(clientPaidCost * 100) / 100,
                byVisitType,
                byMonth,
            },
        };
    } catch (error) {
        logger.error(error, {
            component: "analytics-actions",
            action: "getMaintenanceCostBreakdown",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// Resolution Metrics
// =============================================================================

/**
 * Get resolution metrics
 */
export async function getResolutionMetrics(
    filter?: DateRangeFilter
): Promise<ActionResponse<ResolutionMetrics>> {
    try {
        let query = supabase
            .from("maintenance")
            .select("*")
            .eq("problemOccurred", true);

        // Apply filters
        if (filter?.dateFrom) {
            query = query.gte("date", filter.dateFrom);
        }
        if (filter?.dateTo) {
            query = query.lte("date", filter.dateTo);
        }
        if (filter?.companyId) {
            query = query.eq("companyId", filter.companyId);
        }
        if (filter?.branchId) {
            query = query.eq("branchId", filter.branchId);
        }

        const { data, error } = await query;

        if (error) {
            logger.error(error, {
                component: "analytics-actions",
                action: "getResolutionMetrics",
            });
            return { success: false, error: "Failed to fetch resolution metrics" };
        }

        const visits = (data || []) as MaintenanceRecord[];
        const totalWithProblems = visits.length;

        const solved = visits.filter((v) => v.resolutionStatus === "solved").length;
        const partial = visits.filter((v) => v.resolutionStatus === "partial").length;
        const notSolved = visits.filter((v) => v.resolutionStatus === "not_solved").length;
        const waitingParts = visits.filter((v) => v.resolutionStatus === "waiting_parts").length;

        // Average resolution time
        const resolvedWithTime = visits.filter(
            (v) =>
                v.resolutionStatus === "solved" &&
                v.resolutionTimeDays != null &&
                v.resolutionTimeDays > 0
        );
        const avgResolutionTime =
            resolvedWithTime.length > 0
                ? resolvedWithTime.reduce((sum, v) => sum + (v.resolutionTimeDays || 0), 0) /
                resolvedWithTime.length
                : 0;

        // Resolution rate by visit type
        const byTypeMap = new Map<
            string,
            { total: number; solved: number }
        >();
        visits.forEach((v) => {
            if (!v.visitType) return;
            const existing = byTypeMap.get(v.visitType) || { total: 0, solved: 0 };
            existing.total++;
            if (v.resolutionStatus === "solved") {
                existing.solved++;
            }
            byTypeMap.set(v.visitType, existing);
        });

        const resolutionRateByType = Array.from(byTypeMap.entries())
            .map(([type, data]) => ({
                type,
                rate: data.total > 0 ? Math.round((data.solved / data.total) * 100) : 0,
                count: data.total,
            }))
            .sort((a, b) => b.rate - a.rate);

        return {
            success: true,
            data: {
                totalWithProblems,
                solved,
                partial,
                notSolved,
                waitingParts,
                avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
                resolutionRateByType,
            },
        };
    } catch (error) {
        logger.error(error, {
            component: "analytics-actions",
            action: "getResolutionMetrics",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// Dashboard Summary
// =============================================================================

/**
 * Get a comprehensive maintenance dashboard summary
 * Combines KPIs, delays, and cost data in a single call
 */
export async function getMaintenanceDashboardSummary(
    filter?: DateRangeFilter
): Promise<
    ActionResponse<{
        kpis: MaintenanceKPIs;
        delays: DelayAnalytics;
        costs: CostBreakdown;
        resolution: ResolutionMetrics;
    }>
> {
    try {
        // Fetch all analytics in parallel
        const [kpisResult, delaysResult, costsResult, resolutionResult] =
            await Promise.all([
                getMaintenanceKPIs(filter),
                getDelayAnalytics(filter),
                getMaintenanceCostBreakdown(filter),
                getResolutionMetrics(filter),
            ]);

        // Check for errors
        if (!kpisResult.success || !kpisResult.data) {
            return { success: false, error: kpisResult.error };
        }
        if (!delaysResult.success || !delaysResult.data) {
            return { success: false, error: delaysResult.error };
        }
        if (!costsResult.success || !costsResult.data) {
            return { success: false, error: costsResult.error };
        }
        if (!resolutionResult.success || !resolutionResult.data) {
            return { success: false, error: resolutionResult.error };
        }

        return {
            success: true,
            data: {
                kpis: kpisResult.data,
                delays: delaysResult.data,
                costs: costsResult.data,
                resolution: resolutionResult.data,
            },
        };
    } catch (error) {
        logger.error(error, {
            component: "analytics-actions",
            action: "getMaintenanceDashboardSummary",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}
