/**
 * Maintenance Catalog Server Actions
 * 
 * Server-side actions for managing maintenance catalogs:
 * - Services catalog
 * - Spare parts catalog
 * - Problems catalog
 */

"use server";

import { supabase, getCurrentSchema, isMockDataMode } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResponse } from "./maintenance-schemas";

// =============================================================================
// Types
// =============================================================================

export interface ServiceCatalogItem {
    id: string;
    category: string;
    name: string;
    defaultCost: number;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PartsCatalogItem {
    id: string;
    category: string;
    name: string;
    defaultPrice: number;
    description?: string;
    sku?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProblemsCatalogItem {
    id: string;
    category: string;
    problem: string;
    severity: "low" | "medium" | "high" | "critical";
    suggestedResolution?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Grouped catalog format (matching existing store structure)
export interface GroupedServicesCatalog {
    [category: string]: { [serviceName: string]: number };
}

export interface GroupedPartsCatalog {
    [category: string]: { [partName: string]: number };
}

export interface GroupedProblemsCatalog {
    [category: string]: string[];
}

// =============================================================================
// Validation Schemas
// =============================================================================

const createServiceSchema = z.object({
    category: z.string().min(1, "Category is required"),
    name: z.string().min(1, "Service name is required"),
    defaultCost: z.number().min(0, "Cost must be non-negative"),
    description: z.string().optional(),
});

const updateServiceSchema = z.object({
    category: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    defaultCost: z.number().min(0).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
});

const createPartSchema = z.object({
    category: z.string().min(1, "Category is required"),
    name: z.string().min(1, "Part name is required"),
    defaultPrice: z.number().min(0, "Price must be non-negative"),
    description: z.string().optional(),
    sku: z.string().optional(),
});

const updatePartSchema = z.object({
    category: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    defaultPrice: z.number().min(0).optional(),
    description: z.string().optional(),
    sku: z.string().optional(),
    isActive: z.boolean().optional(),
});

const createProblemSchema = z.object({
    category: z.string().min(1, "Category is required"),
    problem: z.string().min(1, "Problem description is required"),
    severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    suggestedResolution: z.string().optional(),
});

const updateProblemSchema = z.object({
    category: z.string().min(1).optional(),
    problem: z.string().min(1).optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    suggestedResolution: z.string().optional(),
    isActive: z.boolean().optional(),
});

// =============================================================================
// Services Catalog Actions
// =============================================================================

/**
 * Get all services from catalog
 */
export async function getServicesCatalog(): Promise<ActionResponse<ServiceCatalogItem[]>> {
    try {
        // Debug log for schema and connection
        logger.info("Fetching services catalog", {
            component: "catalog-actions",
            action: "getServicesCatalog",
            data: {
                schema: getCurrentSchema(), // Need to import this
                isMock: isMockDataMode()    // Need to import this
            }
        });

        console.log(" [catalog-actions] Fetching services from PUBLIC schema...");

        const { data, error } = await supabase
            .schema('public')
            .from("maintenanceServiceCatalog")
            .select("*")
            .eq("isActive", true)
            .order("category")
            .order("name");

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "getServicesCatalog",
            });
            return { success: false, error: "Failed to fetch services catalog" };
        }

        logger.info(`Fetched ${data?.length || 0} services`, {
            component: "catalog-actions",
            action: "getServicesCatalog"
        });

        return { success: true, data: (data || []) as ServiceCatalogItem[] };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "getServicesCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Get services catalog in grouped format (for compatibility with existing store)
 */
export async function getGroupedServicesCatalog(): Promise<ActionResponse<GroupedServicesCatalog>> {
    const result = await getServicesCatalog();
    if (!result.success || !result.data) {
        return { success: false, error: result.error };
    }

    const grouped: GroupedServicesCatalog = {};
    result.data.forEach((item) => {
        if (!grouped[item.category]) {
            grouped[item.category] = {};
        }
        grouped[item.category][item.name] = item.defaultCost;
    });

    return { success: true, data: grouped };
}

/**
 * Add a new service to the catalog
 */
export async function addServiceToCatalog(
    input: z.infer<typeof createServiceSchema>
): Promise<ActionResponse<ServiceCatalogItem>> {
    try {
        const parsed = createServiceSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .schema('public')
            .from("maintenanceServiceCatalog")
            .insert({
                category: parsed.data.category,
                name: parsed.data.name,
                defaultCost: parsed.data.defaultCost,
                description: parsed.data.description,
            })
            .select()
            .single();

        if (error) {
            // Handle unique constraint violation
            if (error.code === '23505') {
                return { success: false, error: "A service with this name already exists in this category." };
            }

            logger.error("Supabase insert failed", {
                component: "catalog-actions",
                action: "addServiceToCatalog",
                data: { input: parsed.data, error },
            });
            return { success: false, error: error.message || "Failed to add service to catalog" };
        }

        logger.info("Service added to catalog", {
            component: "catalog-actions",
            action: "addServiceToCatalog",
            data: { serviceId: data.id },
        });
        revalidatePath("/maintenance");

        return { success: true, data: data as ServiceCatalogItem };
    } catch (error) {
        logger.error("Exception in addServiceToCatalog", {
            component: "catalog-actions",
            action: "addServiceToCatalog",
        }, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Update a service in the catalog
 */
export async function updateServiceInCatalog(
    id: string,
    input: z.infer<typeof updateServiceSchema>
): Promise<ActionResponse<ServiceCatalogItem>> {
    try {
        if (!id) {
            return { success: false, error: "Service ID is required" };
        }

        const parsed = updateServiceSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .from("maintenanceServiceCatalog")
            .update(parsed.data)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "updateServiceInCatalog",
                data: { id },
            });
            return { success: false, error: "Failed to update service" };
        }

        revalidatePath("/maintenance");
        return { success: true, data: data as ServiceCatalogItem };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "updateServiceInCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Remove a service from catalog (soft delete)
 */
export async function removeServiceFromCatalog(id: string): Promise<ActionResponse<void>> {
    try {
        if (!id) {
            return { success: false, error: "Service ID is required" };
        }

        const { error } = await supabase
            .from("maintenanceServiceCatalog")
            .update({ isActive: false })
            .eq("id", id);

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "removeServiceFromCatalog",
                data: { id },
            });
            return { success: false, error: "Failed to remove service" };
        }

        revalidatePath("/maintenance");
        return { success: true };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "removeServiceFromCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// Parts Catalog Actions
// =============================================================================

/**
 * Get all parts from catalog
 */
export async function getPartsCatalog(): Promise<ActionResponse<PartsCatalogItem[]>> {
    try {
        console.log(" [catalog-actions] Fetching parts from PUBLIC schema...");
        const { data, error } = await supabase
            .schema('public')
            .from("maintenancePartsCatalog")
            .select("*")
            .eq("isActive", true)
            .order("category")
            .order("name");

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "getPartsCatalog",
            });
            return { success: false, error: "Failed to fetch parts catalog" };
        }

        return { success: true, data: (data || []) as PartsCatalogItem[] };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "getPartsCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Get parts catalog in grouped format
 */
export async function getGroupedPartsCatalog(): Promise<ActionResponse<GroupedPartsCatalog>> {
    const result = await getPartsCatalog();
    if (!result.success || !result.data) {
        return { success: false, error: result.error };
    }

    const grouped: GroupedPartsCatalog = {};
    result.data.forEach((item) => {
        if (!grouped[item.category]) {
            grouped[item.category] = {};
        }
        grouped[item.category][item.name] = item.defaultPrice;
    });

    return { success: true, data: grouped };
}

/**
 * Add a new part to the catalog
 */
export async function addPartToCatalog(
    input: z.infer<typeof createPartSchema>
): Promise<ActionResponse<PartsCatalogItem>> {
    try {
        const parsed = createPartSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .schema('public')
            .from("maintenancePartsCatalog")
            .insert({
                category: parsed.data.category,
                name: parsed.data.name,
                defaultPrice: parsed.data.defaultPrice,
                description: parsed.data.description,
                sku: parsed.data.sku,
            })
            .select()
            .single();

        if (error) {
            // Handle unique constraint violation
            if (error.code === '23505') {
                return { success: false, error: "A part with this name already exists in this category." };
            }

            logger.error(error, {
                component: "catalog-actions",
                action: "addPartToCatalog",
                data: { input: parsed.data },
            });
            return { success: false, error: "Failed to add part to catalog" };
        }

        logger.info("Part added to catalog", {
            component: "catalog-actions",
            action: "addPartToCatalog",
            data: { partId: data.id },
        });
        revalidatePath("/maintenance");

        return { success: true, data: data as PartsCatalogItem };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "addPartToCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Update a part in the catalog
 */
export async function updatePartInCatalog(
    id: string,
    input: z.infer<typeof updatePartSchema>
): Promise<ActionResponse<PartsCatalogItem>> {
    try {
        if (!id) {
            return { success: false, error: "Part ID is required" };
        }

        const parsed = updatePartSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .schema('public')
            .from("maintenancePartsCatalog")
            .update(parsed.data)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "updatePartInCatalog",
                data: { id },
            });
            return { success: false, error: "Failed to update part" };
        }

        revalidatePath("/maintenance");
        return { success: true, data: data as PartsCatalogItem };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "updatePartInCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Remove a part from catalog (soft delete)
 */
export async function removePartFromCatalog(id: string): Promise<ActionResponse<void>> {
    try {
        if (!id) {
            return { success: false, error: "Part ID is required" };
        }

        const { error } = await supabase
            .schema('public')
            .from("maintenancePartsCatalog")
            .update({ isActive: false })
            .eq("id", id);

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "removePartFromCatalog",
                data: { id },
            });
            return { success: false, error: "Failed to remove part" };
        }

        revalidatePath("/maintenance");
        return { success: true };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "removePartFromCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// Problems Catalog Actions
// =============================================================================

/**
 * Get all problems from catalog
 */
export async function getProblemsCatalog(): Promise<ActionResponse<ProblemsCatalogItem[]>> {
    try {
        console.log(" [catalog-actions] Fetching problems from PUBLIC schema...");
        const { data, error } = await supabase
            .schema('public')
            .from("maintenanceProblemsCatalog")
            .select("*")
            .eq("isActive", true)
            .order("category")
            .order("problem");

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "getProblemsCatalog",
            });
            return { success: false, error: "Failed to fetch problems catalog" };
        }

        return { success: true, data: (data || []) as ProblemsCatalogItem[] };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "getProblemsCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Get problems catalog in grouped format
 */
export async function getGroupedProblemsCatalog(): Promise<ActionResponse<GroupedProblemsCatalog>> {
    const result = await getProblemsCatalog();
    if (!result.success || !result.data) {
        return { success: false, error: result.error };
    }

    const grouped: GroupedProblemsCatalog = {};
    result.data.forEach((item) => {
        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item.problem);
    });

    return { success: true, data: grouped };
}

/**
 * Add a new problem to the catalog
 */
export async function addProblemToCatalog(
    input: z.infer<typeof createProblemSchema>
): Promise<ActionResponse<ProblemsCatalogItem>> {
    try {
        const parsed = createProblemSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .schema('public')
            .from("maintenanceProblemsCatalog")
            .insert({
                category: parsed.data.category,
                problem: parsed.data.problem,
                severity: parsed.data.severity,
                suggestedResolution: parsed.data.suggestedResolution,
            })
            .select()
            .single();

        if (error) {
            // Handle unique constraint violation
            if (error.code === '23505') {
                return { success: false, error: "A problem with this description already exists in this category." };
            }

            logger.error(error, {
                component: "catalog-actions",
                action: "addProblemToCatalog",
                data: { input: parsed.data },
            });
            return { success: false, error: "Failed to add problem to catalog" };
        }

        logger.info("Problem added to catalog", {
            component: "catalog-actions",
            action: "addProblemToCatalog",
            data: { problemId: data.id },
        });
        revalidatePath("/maintenance");

        return { success: true, data: data as ProblemsCatalogItem };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "addProblemToCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Update a problem in the catalog
 */
export async function updateProblemInCatalog(
    id: string,
    input: z.infer<typeof updateProblemSchema>
): Promise<ActionResponse<ProblemsCatalogItem>> {
    try {
        if (!id) {
            return { success: false, error: "Problem ID is required" };
        }

        const parsed = updateProblemSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.flatten() };
        }

        const { data, error } = await supabase
            .from("maintenanceProblemsCatalog")
            .update(parsed.data)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "updateProblemInCatalog",
                data: { id },
            });
            return { success: false, error: "Failed to update problem" };
        }

        revalidatePath("/maintenance");
        return { success: true, data: data as ProblemsCatalogItem };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "updateProblemInCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Remove a problem from catalog (soft delete)
 */
export async function removeProblemFromCatalog(id: string): Promise<ActionResponse<void>> {
    try {
        if (!id) {
            return { success: false, error: "Problem ID is required" };
        }

        const { error } = await supabase
            .from("maintenanceProblemsCatalog")
            .update({ isActive: false })
            .eq("id", id);

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "removeProblemFromCatalog",
                data: { id },
            });
            return { success: false, error: "Failed to remove problem" };
        }

        revalidatePath("/maintenance");
        return { success: true };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "removeProblemFromCatalog",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

// =============================================================================
// Bulk Operations
// =============================================================================

/**
 * Get all catalogs at once (for initial load)
 */
export async function getAllCatalogs(): Promise<
    ActionResponse<{
        services: GroupedServicesCatalog;
        parts: GroupedPartsCatalog;
        problems: GroupedProblemsCatalog;
    }>
> {
    try {
        const [servicesResult, partsResult, problemsResult] = await Promise.all([
            getGroupedServicesCatalog(),
            getGroupedPartsCatalog(),
            getGroupedProblemsCatalog(),
        ]);

        if (!servicesResult.success || !servicesResult.data) {
            return { success: false, error: servicesResult.error };
        }
        if (!partsResult.success || !partsResult.data) {
            return { success: false, error: partsResult.error };
        }
        if (!problemsResult.success || !problemsResult.data) {
            return { success: false, error: problemsResult.error };
        }

        return {
            success: true,
            data: {
                services: servicesResult.data,
                parts: partsResult.data,
                problems: problemsResult.data,
            },
        };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "getAllCatalogs",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}

/**
 * Get categories for a specific catalog type
 */
export async function getCatalogCategories(
    catalogType: "services" | "parts" | "problems"
): Promise<ActionResponse<string[]>> {
    try {
        const tableMap = {
            services: "maintenanceServiceCatalog",
            parts: "maintenancePartsCatalog",
            problems: "maintenanceProblemsCatalog",
        };

        const { data, error } = await supabase
            .schema('public')
            .from(tableMap[catalogType])
            .select("category")
            .eq("isActive", true);

        if (error) {
            logger.error(error, {
                component: "catalog-actions",
                action: "getCatalogCategories",
                data: { catalogType },
            });
            return { success: false, error: "Failed to fetch categories" };
        }

        // Extract unique categories
        const categories = Array.from(new Set(
            (data || []).map((item: any) => String(item.category))
        )).sort() as string[];

        return { success: true, data: categories };
    } catch (error) {
        logger.error(error, {
            component: "catalog-actions",
            action: "getCatalogCategories",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}
