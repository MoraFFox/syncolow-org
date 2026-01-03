/**
 * Maintenance Employee Server Actions
 * 
 * Server-side actions for maintenance technician/employee management.
 * Includes CRUD operations and workload statistics.
 */

"use server";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import type { MaintenanceEmployee } from "@/lib/types";
import {
    createMaintenanceEmployeeSchema,
    updateMaintenanceEmployeeSchema,
    type CreateMaintenanceEmployeeInput,
    type UpdateMaintenanceEmployeeInput,
    type ActionResponse,
} from "./maintenance-schemas";

// =============================================================================
// Types
// =============================================================================

interface MaintenanceVisitRecord {
    technicianName?: string;
    status?: string;
    delayDays?: number;
    resolutionTimeDays?: number;
}

// =============================================================================
// READ Operations
// =============================================================================

/**
 * Get all maintenance employees/technicians
 */
export async function getMaintenanceEmployees(): Promise<
    ActionResponse<MaintenanceEmployee[]>
> {
    try {
        const { data, error } = await supabase
            .from("maintenanceEmployees")
            .select("*")
            .order("name");

        if (error) {
            logger.error(error, {
                component: "employee-actions",
                action: "getMaintenanceEmployees"
            });
            return { success: false, error: "Failed to fetch maintenance employees" };
        }

        return { success: true, data: (data || []) as MaintenanceEmployee[] };
    } catch (error) {
        logger.error(error, {
            component: "employee-actions",
            action: "getMaintenanceEmployees"
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Get a single maintenance employee by ID
 */
export async function getMaintenanceEmployeeById(
    id: string
): Promise<ActionResponse<MaintenanceEmployee>> {
    try {
        if (!id) {
            return { success: false, error: "Employee ID is required" };
        }

        const { data, error } = await supabase
            .from("maintenanceEmployees")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            logger.error(error, {
                component: "employee-actions",
                action: "getMaintenanceEmployeeById",
                data: { id }
            });
            return { success: false, error: "Employee not found" };
        }

        return { success: true, data: data as MaintenanceEmployee };
    } catch (error) {
        logger.error(error, {
            component: "employee-actions",
            action: "getMaintenanceEmployeeById",
            data: { id }
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Get technician workload statistics
 */
export async function getTechnicianWorkload(
    technicianName: string,
    dateFrom?: string,
    dateTo?: string
): Promise<
    ActionResponse<{
        totalVisits: number;
        completedVisits: number;
        pendingVisits: number;
        avgResolutionDays: number;
        onTimePercentage: number;
        totalDelayDays: number;
    }>
> {
    try {
        if (!technicianName) {
            return { success: false, error: "Technician name is required" };
        }

        let query = supabase
            .from("maintenance")
            .select("*")
            .eq("technicianName", technicianName);

        if (dateFrom) {
            query = query.gte("date", dateFrom);
        }
        if (dateTo) {
            query = query.lte("date", dateTo);
        }

        const { data, error } = await query;

        if (error) {
            logger.error(error, {
                component: "employee-actions",
                action: "getTechnicianWorkload",
                data: { technicianName }
            });
            return { success: false, error: "Failed to fetch technician workload" };
        }

        const visits = (data || []) as MaintenanceVisitRecord[];
        const totalVisits = visits.length;
        const completedVisits = visits.filter((v) => v.status === "Completed").length;
        const pendingVisits = visits.filter(
            (v) => v.status === "Scheduled" || v.status === "In Progress"
        ).length;

        // Calculate average resolution time
        const completedWithResolution = visits.filter(
            (v) => v.status === "Completed" && v.resolutionTimeDays != null
        );
        const avgResolutionDays =
            completedWithResolution.length > 0
                ? completedWithResolution.reduce(
                    (sum, v) => sum + (v.resolutionTimeDays || 0),
                    0
                ) / completedWithResolution.length
                : 0;

        // Calculate on-time percentage
        const visitsWithDelay = visits.filter(
            (v) => v.status === "Completed" && (v.delayDays || 0) > 0
        );
        const onTimePercentage =
            completedVisits > 0
                ? ((completedVisits - visitsWithDelay.length) / completedVisits) * 100
                : 100;

        // Total delay days
        const totalDelayDays = visits.reduce(
            (sum, v) => sum + (v.delayDays || 0),
            0
        );

        return {
            success: true,
            data: {
                totalVisits,
                completedVisits,
                pendingVisits,
                avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
                onTimePercentage: Math.round(onTimePercentage),
                totalDelayDays,
            },
        };
    } catch (error) {
        logger.error(error, {
            component: "employee-actions",
            action: "getTechnicianWorkload",
            data: { technicianName }
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Get all technicians with their workload summary
 */
export async function getAllTechniciansWithWorkload(): Promise<
    ActionResponse<
        Array<{
            name: string;
            phone: string;
            totalVisits: number;
            pendingVisits: number;
            onTimePercentage: number;
        }>
    >
> {
    try {
        // Get all employees
        const { data: employees, error: empError } = await supabase
            .from("maintenanceEmployees")
            .select("*");

        if (empError) {
            logger.error(empError, {
                component: "employee-actions",
                action: "getAllTechniciansWithWorkload"
            });
            return { success: false, error: "Failed to fetch employees" };
        }

        // Get all maintenance visits
        const { data: visits, error: visitError } = await supabase
            .from("maintenance")
            .select("technicianName, status, delayDays");

        if (visitError) {
            logger.error(visitError, {
                component: "employee-actions",
                action: "getAllTechniciansWithWorkload"
            });
            return { success: false, error: "Failed to fetch visits" };
        }

        // Build workload map
        const workloadMap = new Map<
            string,
            { total: number; pending: number; completed: number; onTime: number }
        >();

        ((visits || []) as MaintenanceVisitRecord[]).forEach((visit) => {
            if (!visit.technicianName) return;

            const existing = workloadMap.get(visit.technicianName) || {
                total: 0,
                pending: 0,
                completed: 0,
                onTime: 0,
            };

            existing.total++;
            if (visit.status === "Scheduled" || visit.status === "In Progress") {
                existing.pending++;
            }
            if (visit.status === "Completed") {
                existing.completed++;
                if ((visit.delayDays || 0) === 0) {
                    existing.onTime++;
                }
            }

            workloadMap.set(visit.technicianName, existing);
        });

        // Merge with employee data
        const result = ((employees || []) as MaintenanceEmployee[]).map((emp) => {
            const workload = workloadMap.get(emp.name) || {
                total: 0,
                pending: 0,
                completed: 0,
                onTime: 0,
            };

            return {
                name: emp.name,
                phone: emp.phone,
                totalVisits: workload.total,
                pendingVisits: workload.pending,
                onTimePercentage:
                    workload.completed > 0
                        ? Math.round((workload.onTime / workload.completed) * 100)
                        : 100,
            };
        });

        return { success: true, data: result };
    } catch (error) {
        logger.error(error, {
            component: "employee-actions",
            action: "getAllTechniciansWithWorkload"
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// CREATE Operations
// =============================================================================

/**
 * Create a new maintenance employee
 */
export async function createMaintenanceEmployee(
    input: CreateMaintenanceEmployeeInput
): Promise<ActionResponse<MaintenanceEmployee>> {
    try {
        // Validate input
        const parsed = createMaintenanceEmployeeSchema.safeParse(input);
        if (!parsed.success) {
            logger.warn("Validation failed for createMaintenanceEmployee", {
                component: "employee-actions",
                action: "createMaintenanceEmployee",
                data: { errors: parsed.error.flatten() }
            });
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .from("maintenanceEmployees")
            .insert(parsed.data)
            .select()
            .single();

        if (error) {
            logger.error(error, {
                component: "employee-actions",
                action: "createMaintenanceEmployee",
                data: { input: parsed.data }
            });
            return { success: false, error: "Failed to create maintenance employee" };
        }

        logger.info("Maintenance employee created", {
            component: "employee-actions",
            action: "createMaintenanceEmployee",
            data: { employeeId: data.id }
        });
        revalidatePath("/maintenance");
        revalidatePath("/maintenance/crew");

        return { success: true, data: data as MaintenanceEmployee };
    } catch (error) {
        logger.error(error, {
            component: "employee-actions",
            action: "createMaintenanceEmployee"
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
 * Update an existing maintenance employee
 */
export async function updateMaintenanceEmployee(
    id: string,
    input: UpdateMaintenanceEmployeeInput
): Promise<ActionResponse<MaintenanceEmployee>> {
    try {
        if (!id) {
            return { success: false, error: "Employee ID is required" };
        }

        // Validate input
        const parsed = updateMaintenanceEmployeeSchema.safeParse(input);
        if (!parsed.success) {
            logger.warn("Validation failed for updateMaintenanceEmployee", {
                component: "employee-actions",
                action: "updateMaintenanceEmployee",
                data: { id, errors: parsed.error.flatten() }
            });
            return { success: false, error: parsed.error.flatten() };
        }

        // Remove undefined values
        const updateData: Record<string, string> = {};
        if (parsed.data.name) updateData.name = parsed.data.name;
        if (parsed.data.phone) updateData.phone = parsed.data.phone;

        if (Object.keys(updateData).length === 0) {
            return { success: false, error: "No valid fields to update" };
        }

        const { data, error } = await supabase
            .from("maintenanceEmployees")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error(error, {
                component: "employee-actions",
                action: "updateMaintenanceEmployee",
                data: { id }
            });
            return { success: false, error: "Failed to update maintenance employee" };
        }

        logger.info("Maintenance employee updated", {
            component: "employee-actions",
            action: "updateMaintenanceEmployee",
            data: { employeeId: id }
        });
        revalidatePath("/maintenance");
        revalidatePath("/maintenance/crew");

        return { success: true, data: data as MaintenanceEmployee };
    } catch (error) {
        logger.error(error, {
            component: "employee-actions",
            action: "updateMaintenanceEmployee",
            data: { id }
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// DELETE Operations
// =============================================================================

/**
 * Delete a maintenance employee
 */
export async function deleteMaintenanceEmployee(
    id: string
): Promise<ActionResponse<void>> {
    try {
        if (!id) {
            return { success: false, error: "Employee ID is required" };
        }

        const { error } = await supabase
            .from("maintenanceEmployees")
            .delete()
            .eq("id", id);

        if (error) {
            logger.error(error, {
                component: "employee-actions",
                action: "deleteMaintenanceEmployee",
                data: { id }
            });
            return { success: false, error: "Failed to delete maintenance employee" };
        }

        logger.info("Maintenance employee deleted", {
            component: "employee-actions",
            action: "deleteMaintenanceEmployee",
            data: { employeeId: id }
        });
        revalidatePath("/maintenance");
        revalidatePath("/maintenance/crew");

        return { success: true };
    } catch (error) {
        logger.error(error, {
            component: "employee-actions",
            action: "deleteMaintenanceEmployee",
            data: { id }
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}
