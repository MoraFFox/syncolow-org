/**
 * Maintenance Server Actions
 * 
 * Server-side actions for maintenance visit CRUD operations.
 * All operations include validation, error handling, and logging.
 */

"use server";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import type { MaintenanceVisit } from "@/lib/types";
import {
    createMaintenanceVisitSchema,
    updateMaintenanceVisitSchema,
    maintenanceFiltersSchema,
    bulkStatusUpdateSchema,
    bulkDeleteSchema,
    type CreateMaintenanceVisitInput,
    type UpdateMaintenanceVisitInput,
    type MaintenanceFilters,
    type BulkStatusUpdateInput,
    type ActionResponse,
    type PaginatedResponse,
    type MaintenanceStatus,
} from "./maintenance-schemas";
import { parseISO, differenceInDays, isValid, addHours } from "date-fns";
import {
    DEFAULT_CHAIN_CONFIG,
    calculateEscalatedPriority,
    calculateSlaDeadline,
    isChainAtMaxDepth,
    shouldNotifyForChainDepth,
    type MaintenanceChainConfig,
    type MaintenancePriority,
} from "@/lib/maintenance-config";
import { logVisitCreated, logFollowUpCreated, logStatusChanged, logEscalated, logCompleted } from "./audit";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate delay days between scheduled and actual arrival
 */
function calculateDelayDays(
    scheduledDate: string | Date | null | undefined,
    actualArrivalDate: string | Date | null | undefined
): number {
    if (!scheduledDate || !actualArrivalDate) return 0;

    const scheduled = typeof scheduledDate === "string" ? parseISO(scheduledDate) : scheduledDate;
    const actual = typeof actualArrivalDate === "string" ? parseISO(actualArrivalDate) : actualArrivalDate;

    if (!isValid(scheduled) || !isValid(actual)) return 0;

    const diff = differenceInDays(actual, scheduled);
    return diff > 0 ? diff : 0;
}

/**
 * Derive status from resolution status
 */
function deriveStatus(
    problemOccurred: boolean | undefined,
    resolutionStatus: string | undefined
): MaintenanceStatus {
    if (problemOccurred === false || resolutionStatus === "solved") {
        return "Completed";
    }
    if (resolutionStatus === "waiting_parts") {
        return "Waiting for Parts";
    }
    if (resolutionStatus === "partial" || resolutionStatus === "not_solved") {
        return "Follow-up Required";
    }
    return "In Progress";
}

/**
 * Revalidate all maintenance-related paths
 */
function revalidateMaintenancePaths(): void {
    revalidatePath("/maintenance");
    revalidatePath("/maintenance/analytics");
    revalidatePath("/clients");
}

// =============================================================================
// READ Operations
// =============================================================================

/**
 * Get all maintenance visits with optional filtering
 */
export async function getMaintenanceVisits(
    filters?: Partial<MaintenanceFilters>
): Promise<PaginatedResponse<MaintenanceVisit>> {
    try {
        // Validate filters if provided
        const validFilters = filters
            ? maintenanceFiltersSchema.parse(filters)
            : { limit: 100, offset: 0 };

        let query = supabase
            .from("maintenance")
            .select("*", { count: "exact" })
            .order("date", { ascending: false });

        // Apply filters
        if (validFilters.companyId) {
            query = query.eq("companyId", validFilters.companyId);
        }
        if (validFilters.branchId) {
            query = query.eq("branchId", validFilters.branchId);
        }
        if (validFilters.technicianName) {
            query = query.ilike("technicianName", `%${validFilters.technicianName}%`);
        }
        if (validFilters.status) {
            query = query.eq("status", validFilters.status);
        }
        if (validFilters.visitType) {
            query = query.eq("visitType", validFilters.visitType);
        }
        if (validFilters.dateFrom) {
            query = query.gte("date", validFilters.dateFrom);
        }
        if (validFilters.dateTo) {
            query = query.lte("date", validFilters.dateTo);
        }
        if (validFilters.searchTerm) {
            query = query.or(
                `branchName.ilike.%${validFilters.searchTerm}%,` +
                `companyName.ilike.%${validFilters.searchTerm}%,` +
                `technicianName.ilike.%${validFilters.searchTerm}%,` +
                `maintenanceNotes.ilike.%${validFilters.searchTerm}%`
            );
        }

        // Apply pagination
        query = query.range(
            validFilters.offset,
            validFilters.offset + validFilters.limit - 1
        );

        const { data, error, count } = await query;

        if (error) {
            logger.error(error, {
                component: "maintenance-actions",
                action: "getMaintenanceVisits",
                data: { filters: validFilters }
            });
            return {
                success: false,
                error: "Failed to fetch maintenance visits",
                total: 0,
                limit: validFilters.limit,
                offset: validFilters.offset,
                hasMore: false,
            };
        }

        const total = count || 0;
        return {
            success: true,
            data: (data || []) as MaintenanceVisit[],
            total,
            limit: validFilters.limit,
            offset: validFilters.offset,
            hasMore: validFilters.offset + validFilters.limit < total,
        };
    } catch (error) {
        logger.error(error, { component: "maintenance-actions", action: "getMaintenanceVisits" });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
            total: 0,
            limit: 100,
            offset: 0,
            hasMore: false,
        };
    }
}

/**
 * Get a single maintenance visit by ID
 */
export async function getMaintenanceVisitById(
    id: string
): Promise<ActionResponse<MaintenanceVisit>> {
    try {
        if (!id) {
            return { success: false, error: "Visit ID is required" };
        }

        const { data, error } = await supabase
            .from("maintenance")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            logger.error(error, {
                component: "maintenance-actions",
                action: "getMaintenanceVisitById",
                data: { id }
            });
            return { success: false, error: "Maintenance visit not found" };
        }

        return { success: true, data: data as MaintenanceVisit };
    } catch (error) {
        logger.error(error, {
            component: "maintenance-actions",
            action: "getMaintenanceVisitById",
            data: { id }
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Get maintenance visits for a specific company
 */
export async function getMaintenanceVisitsByCompany(
    companyId: string
): Promise<ActionResponse<MaintenanceVisit[]>> {
    return getMaintenanceVisits({ companyId, limit: 500 }) as Promise<ActionResponse<MaintenanceVisit[]>>;
}

/**
 * Get maintenance visits for a specific branch
 */
export async function getMaintenanceVisitsByBranch(
    branchId: string
): Promise<ActionResponse<MaintenanceVisit[]>> {
    return getMaintenanceVisits({ branchId, limit: 500 }) as Promise<ActionResponse<MaintenanceVisit[]>>;
}

// =============================================================================
// CREATE Operations
// =============================================================================

/**
 * Create a new maintenance visit
 */
export async function createMaintenanceVisit(
    input: CreateMaintenanceVisitInput
): Promise<ActionResponse<MaintenanceVisit>> {
    try {
        // Validate input
        const parsed = createMaintenanceVisitSchema.safeParse(input);
        if (!parsed.success) {
            logger.warn("Validation failed for createMaintenanceVisit", {
                component: "maintenance-actions",
                action: "createMaintenanceVisit",
                data: { errors: parsed.error.flatten() }
            });
            return { success: false, error: parsed.error.flatten() };
        }

        // Prepare data for insert
        const visitData = {
            ...parsed.data,
            status: "Scheduled" as const,
            date: typeof parsed.data.date === "object"
                ? parsed.data.date.toISOString()
                : parsed.data.date,
            scheduledDate: parsed.data.scheduledDate
                ? typeof parsed.data.scheduledDate === "object"
                    ? parsed.data.scheduledDate.toISOString()
                    : parsed.data.scheduledDate
                : typeof parsed.data.date === "object"
                    ? parsed.data.date.toISOString()
                    : parsed.data.date,
        };

        const { data, error } = await supabase
            .from("maintenance")
            .insert(visitData)
            .select()
            .single();

        if (error) {
            logger.error(error, {
                component: "maintenance-actions",
                action: "createMaintenanceVisit",
                data: { input: parsed.data }
            });
            return { success: false, error: "Failed to create maintenance visit" };
        }

        logger.info("Maintenance visit created", {
            component: "maintenance-actions",
            action: "createMaintenanceVisit",
            data: { visitId: data.id }
        });
        revalidateMaintenancePaths();

        return { success: true, data: data as MaintenanceVisit };
    } catch (error) {
        logger.error(error, { component: "maintenance-actions", action: "createMaintenanceVisit" });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Create a follow-up visit linked to a root visit
 * Includes chain depth validation, priority escalation, and problem inheritance
 */
export async function createFollowUpVisit(
    rootVisitId: string,
    input: CreateMaintenanceVisitInput,
    config: MaintenanceChainConfig = DEFAULT_CHAIN_CONFIG
): Promise<ActionResponse<MaintenanceVisit>> {
    try {
        // First, verify the root visit exists
        const { data: rootVisit, error: rootError } = await supabase
            .from("maintenance")
            .select("*")
            .eq("id", rootVisitId)
            .single();

        if (rootError || !rootVisit) {
            return { success: false, error: "Root visit not found" };
        }

        // Get chain info to validate depth
        const { data: chainInfo, error: chainError } = await supabase
            .rpc('get_maintenance_chain_info', { p_root_visit_id: rootVisitId });

        const currentDepth = chainInfo?.chainCount || 1;
        const unresolvedProblems = chainInfo?.unresolvedProblems || [];
        const lastTechnician = chainInfo?.lastTechnician;

        // Validate chain depth
        if (isChainAtMaxDepth(currentDepth, config)) {
            return {
                success: false,
                error: `Maximum follow-up depth (${config.maxChainDepth}) reached. Please escalate to management.`,
            };
        }

        // Determine technician (prefer same technician if configured)
        const technicianName = config.preferSameTechnician && !input.technicianName && lastTechnician
            ? lastTechnician
            : input.technicianName;

        // Calculate priority escalation
        const currentPriority = (rootVisit.priority || 'normal') as MaintenancePriority;
        const newPriority = calculateEscalatedPriority(currentDepth, currentPriority, config);

        // Calculate SLA deadline
        const slaDeadline = calculateSlaDeadline(new Date(), newPriority, config);

        // Inherit unresolved problems if configured
        const inheritedProblems = config.inheritUnresolvedProblems
            ? unresolvedProblems
            : undefined;

        // Create follow-up with enhanced data
        const result = await createMaintenanceVisit({
            ...input,
            companyId: rootVisit.companyId,
            branchId: rootVisit.branchId,
            companyName: rootVisit.companyName,
            branchName: rootVisit.branchName,
            technicianName,
        });

        if (!result.success || !result.data) {
            return result;
        }

        // Update the new visit with chain tracking fields
        const { data: updatedVisit, error: updateError } = await supabase
            .from("maintenance")
            .update({
                rootVisitId,
                chainDepth: currentDepth,
                priority: newPriority,
                slaDeadline: slaDeadline.toISOString(),
                problemReason: inheritedProblems,
            })
            .eq("id", result.data.id)
            .select()
            .single();

        if (updateError) {
            logger.error(updateError, {
                component: "maintenance-actions",
                action: "createFollowUpVisit",
                data: { rootVisitId, followUpId: result.data.id }
            });
        }

        // Log audit entry
        await logFollowUpCreated(
            updatedVisit || result.data,
            rootVisit as MaintenanceVisit,
            input.technicianName
        );

        // Log escalation if priority changed
        if (newPriority !== currentPriority) {
            await logEscalated(
                result.data.id,
                rootVisitId,
                currentPriority,
                newPriority,
                currentDepth,
                input.technicianName
            );
        }

        // Check if we need to notify managers
        const notificationCheck = shouldNotifyForChainDepth(currentDepth, config);
        if (notificationCheck.notify) {
            // TODO: Integrate with notification system
            logger.info("Manager notification triggered", {
                component: "maintenance-actions",
                action: "createFollowUpVisit",
                data: {
                    rootVisitId,
                    chainDepth: currentDepth,
                    roles: notificationCheck.roles,
                }
            });
        }

        return {
            success: true,
            data: (updatedVisit || result.data) as MaintenanceVisit,
        };
    } catch (error) {
        logger.error(error, {
            component: "maintenance-actions",
            action: "createFollowUpVisit",
            data: { rootVisitId }
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// UPDATE Operations
// =============================================================================

/**
 * Update an existing maintenance visit
 */
export async function updateMaintenanceVisit(
    id: string,
    input: UpdateMaintenanceVisitInput
): Promise<ActionResponse<MaintenanceVisit>> {
    try {
        if (!id) {
            return { success: false, error: "Visit ID is required" };
        }

        // Validate input
        const parsed = updateMaintenanceVisitSchema.safeParse(input);
        if (!parsed.success) {
            logger.warn("Validation failed for updateMaintenanceVisit", {
                component: "maintenance-actions",
                action: "updateMaintenanceVisit",
                data: { id, errors: parsed.error.flatten() }
            });
            return { success: false, error: parsed.error.flatten() };
        }

        // Get existing visit to calculate derived fields
        const { data: existingVisit, error: fetchError } = await supabase
            .from("maintenance")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !existingVisit) {
            return { success: false, error: "Maintenance visit not found" };
        }

        // Calculate delay days if dates changed
        const delayDays = calculateDelayDays(
            parsed.data.scheduledDate || existingVisit.scheduledDate,
            parsed.data.actualArrivalDate || existingVisit.actualArrivalDate
        );

        // Derive status if resolution status changed
        const derivedStatus = parsed.data.resolutionStatus
            ? deriveStatus(
                parsed.data.problemOccurred ?? existingVisit.problemOccurred,
                parsed.data.resolutionStatus
            )
            : parsed.data.status;

        // Calculate services cost
        const servicesCost = parsed.data.services?.reduce(
            (acc, service) => acc + service.cost * service.quantity,
            0
        ) || 0;

        // Prepare update data
        const updateData: Record<string, unknown> = {
            ...parsed.data,
            delayDays: parsed.data.delayDays ?? delayDays,
            isSignificantDelay: delayDays > 3,
            status: derivedStatus || existingVisit.status,
            laborCost: parsed.data.laborCost ?? servicesCost,
        };

        // Convert dates to ISO strings
        if (updateData.date && typeof updateData.date === "object") {
            updateData.date = (updateData.date as Date).toISOString();
        }
        if (updateData.scheduledDate && typeof updateData.scheduledDate === "object") {
            updateData.scheduledDate = (updateData.scheduledDate as Date).toISOString();
        }
        if (updateData.actualArrivalDate && typeof updateData.actualArrivalDate === "object") {
            updateData.actualArrivalDate = (updateData.actualArrivalDate as Date).toISOString();
        }
        if (updateData.resolutionDate && typeof updateData.resolutionDate === "object") {
            updateData.resolutionDate = (updateData.resolutionDate as Date).toISOString();
        }

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // Clear problem-related fields if no problem occurred
        if (parsed.data.problemOccurred === false) {
            updateData.problemReason = [];
            updateData.spareParts = [];
            updateData.services = [];
        }

        const { data, error } = await supabase
            .from("maintenance")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error(error, {
                component: "maintenance-actions",
                action: "updateMaintenanceVisit",
                data: { id }
            });
            return { success: false, error: "Failed to update maintenance visit" };
        }

        // Handle significant delay notification logging
        if (updateData.isSignificantDelay) {
            logger.warn("Significant maintenance delay detected", {
                component: "maintenance-actions",
                action: "updateMaintenanceVisit",
                data: { visitId: id, delayDays, delayReason: parsed.data.delayReason }
            });
        }

        // Update root visit aggregates/status (Chain Sync)
        // We do this for ANY update to ensure costs and status are consistent
        const targetRootId = existingVisit.rootVisitId || id;

        // Only trigger if it's a child OR if it's a root that might have children (checked inside)
        // Optimization: checking if derivedStatus changed or costs changed would be better, 
        // but for robustness we sync.
        await updateRootVisitAggregates(targetRootId);

        logger.info("Maintenance visit updated", {
            component: "maintenance-actions",
            action: "updateMaintenanceVisit",
            data: { visitId: id, status: derivedStatus }
        });
        revalidateMaintenancePaths();

        return { success: true, data: data as MaintenanceVisit };
    } catch (error) {
        logger.error(error, {
            component: "maintenance-actions",
            action: "updateMaintenanceVisit",
            data: { id }
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Update maintenance visit status only
 */
export async function updateMaintenanceVisitStatus(
    id: string,
    status: MaintenanceStatus
): Promise<ActionResponse<MaintenanceVisit>> {
    return updateMaintenanceVisit(id, { status });
}

/**
 * Update aggregates on root visit when follow-ups complete
 * Uses atomic RPC function to prevent race conditions
 */
async function updateRootVisitAggregates(rootVisitId: string): Promise<void> {
    try {
        // Use atomic RPC function for aggregate calculation
        const { data: aggregates, error: rpcError } = await supabase
            .rpc('calculate_maintenance_aggregates', { p_root_visit_id: rootVisitId });

        if (rpcError) {
            logger.error(rpcError, {
                component: "maintenance-actions",
                action: "updateRootVisitAggregates",
                data: { rootVisitId }
            });

            // Fallback to manual calculation if RPC fails
            await updateRootVisitAggregatesManual(rootVisitId);
            return;
        }

        logger.info("Root visit aggregates updated via RPC", {
            component: "maintenance-actions",
            action: "updateRootVisitAggregates",
            data: { rootVisitId, aggregates }
        });
    } catch (error) {
        logger.error(error, {
            component: "maintenance-actions",
            action: "updateRootVisitAggregates",
            data: { rootVisitId }
        });
    }
}

/**
 * Manual aggregate calculation fallback
 * Used when RPC function is not available
 */
async function updateRootVisitAggregatesManual(rootVisitId: string): Promise<void> {
    try {
        // Get root visit
        const { data: rootVisit, error: rootError } = await supabase
            .from("maintenance")
            .select("*")
            .eq("id", rootVisitId)
            .single();

        if (rootError || !rootVisit) return;

        // Get all child visits
        const { data: childVisits } = await supabase
            .from("maintenance")
            .select("*")
            .eq("rootVisitId", rootVisitId);

        const allVisits = [rootVisit, ...(childVisits || [])];
        const totalVisits = allVisits.length;

        // Calculate total cost
        const totalCost = allVisits.reduce((sum, visit) => {
            const laborCost = visit.laborCost || 0;
            const partsCost = (visit.spareParts || []).reduce(
                (pSum: number, p: { price?: number; quantity: number }) =>
                    pSum + (p.price || 0) * p.quantity,
                0
            );
            return sum + laborCost + partsCost;
        }, 0);

        // Calculate resolution time
        const rootDate = rootVisit.date ? parseISO(rootVisit.date) : null;
        const completedVisit = allVisits.find(
            (v) => v.status === "Completed" && v.resolutionDate
        );
        const resolutionDate = completedVisit?.resolutionDate
            ? parseISO(completedVisit.resolutionDate)
            : null;

        const resolutionTimeDays =
            rootDate && resolutionDate && isValid(rootDate) && isValid(resolutionDate)
                ? differenceInDays(resolutionDate, rootDate)
                : 0;

        // Determine status based on active visits
        const activeVisits = allVisits.filter(v =>
            v.status !== "Completed" && v.status !== "Cancelled"
        ).length;

        let newStatus: MaintenanceStatus = rootVisit.status;
        if (activeVisits === 0) {
            newStatus = "Completed";
        } else if (rootVisit.status === "Completed") {
            // Reopen if active visits exist
            newStatus = "In Progress";
        }

        // Update root visit
        await supabase
            .from("maintenance")
            .update({
                totalVisits,
                totalCost,
                resolutionTimeDays,
                status: newStatus,
            })
            .eq("id", rootVisitId);

        logger.info("Root visit aggregates updated (manual fallback)", {
            component: "maintenance-actions",
            action: "updateRootVisitAggregatesManual",
            data: { rootVisitId, totalVisits, totalCost, resolutionTimeDays }
        });
    } catch (error) {
        logger.error(error, {
            component: "maintenance-actions",
            action: "updateRootVisitAggregatesManual",
            data: { rootVisitId }
        });
    }
}

// =============================================================================
// DELETE Operations
// =============================================================================

/**
 * Delete a maintenance visit (and its children if it's a root visit)
 */
export async function deleteMaintenanceVisit(
    id: string
): Promise<ActionResponse<void>> {
    try {
        if (!id) {
            return { success: false, error: "Visit ID is required" };
        }

        // Get visit to check if it's a root visit
        const { data: visit, error: fetchError } = await supabase
            .from("maintenance")
            .select("id, rootVisitId, companyId, branchId")
            .eq("id", id)
            .single();

        if (fetchError || !visit) {
            return { success: false, error: "Maintenance visit not found" };
        }

        // Delete visit
        const { error: deleteError } = await supabase
            .from("maintenance")
            .delete()
            .eq("id", id);

        if (deleteError) {
            logger.error(deleteError, {
                component: "maintenance-actions",
                action: "deleteMaintenanceVisit",
                data: { id }
            });
            return { success: false, error: "Failed to delete maintenance visit" };
        }

        // If this was a root visit (no rootVisitId), delete all children
        if (!visit.rootVisitId) {
            const { error: childDeleteError } = await supabase
                .from("maintenance")
                .delete()
                .eq("rootVisitId", id);

            if (childDeleteError) {
                logger.error(childDeleteError, {
                    component: "maintenance-actions",
                    action: "deleteMaintenanceVisit",
                    data: { rootId: id, message: "Failed to delete child visits" }
                });
            }
        }

        logger.info("Maintenance visit deleted", {
            component: "maintenance-actions",
            action: "deleteMaintenanceVisit",
            data: { visitId: id }
        });
        revalidateMaintenancePaths();

        return { success: true };
    } catch (error) {
        logger.error(error, {
            component: "maintenance-actions",
            action: "deleteMaintenanceVisit",
            data: { id }
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// BULK Operations
// =============================================================================

/**
 * Bulk update status for multiple visits
 */
export async function bulkUpdateMaintenanceStatus(
    input: BulkStatusUpdateInput
): Promise<ActionResponse<{ updated: number }>> {
    try {
        // Validate input
        const parsed = bulkStatusUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .from("maintenance")
            .update({ status: parsed.data.status })
            .in("id", parsed.data.ids)
            .select("id");

        if (error) {
            logger.error(error, {
                component: "maintenance-actions",
                action: "bulkUpdateMaintenanceStatus",
                data: { input: parsed.data }
            });
            return { success: false, error: "Failed to update maintenance visits" };
        }

        const updated = data?.length || 0;
        logger.info("Bulk maintenance status updated", {
            component: "maintenance-actions",
            action: "bulkUpdateMaintenanceStatus",
            data: { count: updated, status: parsed.data.status }
        });
        revalidateMaintenancePaths();

        return { success: true, data: { updated } };
    } catch (error) {
        logger.error(error, { component: "maintenance-actions", action: "bulkUpdateMaintenanceStatus" });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Bulk delete maintenance visits
 */
export async function bulkDeleteMaintenanceVisits(
    ids: string[]
): Promise<ActionResponse<{ deleted: number }>> {
    try {
        // Validate input
        const parsed = bulkDeleteSchema.safeParse({ ids });
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .from("maintenance")
            .delete()
            .in("id", parsed.data.ids)
            .select("id");

        if (error) {
            logger.error(error, {
                component: "maintenance-actions",
                action: "bulkDeleteMaintenanceVisits",
                data: { ids }
            });
            return { success: false, error: "Failed to delete maintenance visits" };
        }

        const deleted = data?.length || 0;
        logger.info("Bulk maintenance visits deleted", {
            component: "maintenance-actions",
            action: "bulkDeleteMaintenanceVisits",
            data: { count: deleted }
        });
        revalidateMaintenancePaths();

        return { success: true, data: { deleted } };
    } catch (error) {
        logger.error(error, { component: "maintenance-actions", action: "bulkDeleteMaintenanceVisits" });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// SEARCH Operations
// =============================================================================

/**
 * Search maintenance visits by term
 */
export async function searchMaintenanceVisits(
    searchTerm: string
): Promise<ActionResponse<MaintenanceVisit[]>> {
    if (!searchTerm.trim()) {
        return getMaintenanceVisits() as Promise<ActionResponse<MaintenanceVisit[]>>;
    }

    return getMaintenanceVisits({ searchTerm, limit: 500 }) as Promise<ActionResponse<MaintenanceVisit[]>>;
}
