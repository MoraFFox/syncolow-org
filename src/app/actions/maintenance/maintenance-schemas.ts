/**
 * Maintenance Module Zod Validation Schemas
 * 
 * Comprehensive validation schemas for all maintenance-related data types.
 * Used by server actions to validate input before database operations.
 */

import { z } from "zod";

// =============================================================================
// Base Schemas
// =============================================================================

/**
 * Spare part input validation
 */
export const sparePartInputSchema = z.object({
    name: z.string().min(1, "Part name is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    price: z.number().min(0, "Price must be non-negative").optional(),
    paidBy: z.enum(["Client", "Company"]),
});

/**
 * Maintenance service input validation
 */
export const maintenanceServiceInputSchema = z.object({
    name: z.string().min(1, "Service name is required"),
    cost: z.number().min(0, "Cost must be non-negative"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    paidBy: z.enum(["Client", "Company"]),
});

/**
 * Maintenance visit status enum
 */
export const maintenanceStatusSchema = z.enum([
    "Scheduled",
    "In Progress",
    "Completed",
    "Cancelled",
    "Follow-up Required",
    "Waiting for Parts",
]);

export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;

/**
 * Resolution status enum
 */
export const resolutionStatusSchema = z.enum([
    "solved",
    "partial",
    "not_solved",
    "waiting_parts",
]);

export type ResolutionStatus = z.infer<typeof resolutionStatusSchema>;

/**
 * Visit type enum
 */
export const visitTypeSchema = z.enum(["customer_request", "periodic"]);

// =============================================================================
// Create Maintenance Visit Schema
// =============================================================================

/**
 * Schema for creating a new maintenance visit
 */
export const createMaintenanceVisitSchema = z.object({
    // Required fields
    branchId: z.string().uuid("Invalid branch ID"),
    companyId: z.string().uuid("Invalid company ID"),
    branchName: z.string().min(1, "Branch name is required"),
    companyName: z.string().min(1, "Company name is required"),
    date: z.union([z.string().datetime(), z.date()]),
    technicianName: z.string().min(1, "Technician name is required"),
    visitType: visitTypeSchema,
    maintenanceNotes: z.string().default(""),

    // Optional scheduling fields
    scheduledDate: z.union([z.string().datetime(), z.date()]).optional(),
    laborCost: z.number().min(0).optional(),

    // Optional barista fields
    baristaId: z.string().optional(),
    baristaName: z.string().optional(),
});

export type CreateMaintenanceVisitInput = z.infer<typeof createMaintenanceVisitSchema>;

// =============================================================================
// Update Maintenance Visit Schema
// =============================================================================

/**
 * Schema for updating an existing maintenance visit
 * All fields are optional for partial updates
 */
export const updateMaintenanceVisitSchema = z.object({
    // Date fields
    date: z.union([z.string().datetime(), z.date()]).optional().nullable(),
    scheduledDate: z.union([z.string().datetime(), z.date()]).optional().nullable(),
    actualArrivalDate: z.union([z.string().datetime(), z.date()]).optional().nullable(),
    resolutionDate: z.union([z.string().datetime(), z.date()]).optional().nullable(),

    // Delay tracking
    delayDays: z.number().int().min(0).optional(),
    delayReason: z.string().optional(),
    isSignificantDelay: z.boolean().optional(),

    // Status fields
    status: maintenanceStatusSchema.optional(),
    resolutionStatus: resolutionStatusSchema.optional(),
    nonResolutionReason: z.string().optional(),

    // Technician and barista fields
    technicianName: z.string().min(1).optional(),
    baristaId: z.string().optional(),
    baristaName: z.string().optional(),
    baristaRecommendations: z.string().optional(),

    // Problem tracking
    problemOccurred: z.boolean().optional(),
    problemReason: z.array(z.string()).optional(),

    // Services and parts
    spareParts: z.array(sparePartInputSchema).optional(),
    services: z.array(maintenanceServiceInputSchema).optional(),
    laborCost: z.number().min(0).optional(),

    // Reporting
    maintenanceNotes: z.string().optional(),
    overallReport: z.string().optional(),
    reportSignedBy: z.string().optional(),
    supervisorWitness: z.string().optional(),

    // Aggregated fields (usually calculated)
    totalVisits: z.number().int().min(1).optional(),
    totalCost: z.number().min(0).optional(),
    resolutionTimeDays: z.number().min(0).optional(),
    averageDelayDays: z.number().min(0).optional(),

    // Follow-up tracking
    rootVisitId: z.string().uuid().optional().nullable(),

    // Enhanced chain tracking
    chainDepth: z.number().int().min(0).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    slaDeadline: z.union([z.string().datetime(), z.date()]).optional().nullable(),
    lastEscalatedAt: z.union([z.string().datetime(), z.date()]).optional().nullable(),
});


export type UpdateMaintenanceVisitInput = z.infer<typeof updateMaintenanceVisitSchema>;

// =============================================================================
// Query/Filter Schemas
// =============================================================================

/**
 * Schema for filtering maintenance visits
 */
export const maintenanceFiltersSchema = z.object({
    companyId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    technicianName: z.string().optional(),
    status: maintenanceStatusSchema.optional(),
    visitType: visitTypeSchema.optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    searchTerm: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(100),
    offset: z.number().int().min(0).default(0),
});

export type MaintenanceFilters = z.infer<typeof maintenanceFiltersSchema>;

// =============================================================================
// Bulk Operation Schemas
// =============================================================================

/**
 * Schema for bulk status update operations
 */
export const bulkStatusUpdateSchema = z.object({
    ids: z.array(z.string().uuid()).min(1, "At least one ID is required"),
    status: maintenanceStatusSchema,
    reason: z.string().optional(), // For cancellation or other status changes
});

export type BulkStatusUpdateInput = z.infer<typeof bulkStatusUpdateSchema>;

/**
 * Schema for bulk delete operations
 */
export const bulkDeleteSchema = z.object({
    ids: z.array(z.string().uuid()).min(1, "At least one ID is required"),
    hardDelete: z.boolean().default(false),
});

export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;

// =============================================================================
// Employee Schemas
// =============================================================================

/**
 * Schema for creating a maintenance employee/technician
 */
export const createMaintenanceEmployeeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(1, "Phone number is required"),
});

export type CreateMaintenanceEmployeeInput = z.infer<typeof createMaintenanceEmployeeSchema>;

/**
 * Schema for updating a maintenance employee
 */
export const updateMaintenanceEmployeeSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
});

export type UpdateMaintenanceEmployeeInput = z.infer<typeof updateMaintenanceEmployeeSchema>;

// =============================================================================
// Cancellation Reason Schema
// =============================================================================

/**
 * Schema for cancellation reasons
 */
export const createCancellationReasonSchema = z.object({
    reason: z.string().min(1, "Reason is required"),
});

export type CreateCancellationReasonInput = z.infer<typeof createCancellationReasonSchema>;

// =============================================================================
// Response Types
// =============================================================================

/**
 * Standard server action response
 */
export interface ActionResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string | z.ZodError["formErrors"];
    count?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ActionResponse<T[]> {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
