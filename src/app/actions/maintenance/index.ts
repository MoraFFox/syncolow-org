/**
 * Maintenance Actions - Barrel Export
 * 
 * Export all maintenance-related server actions from this module.
 */

// CRUD operations for maintenance visits
export {
    getMaintenanceVisits,
    getMaintenanceVisitById,
    getMaintenanceVisitsByCompany,
    getMaintenanceVisitsByBranch,
    createMaintenanceVisit,
    createFollowUpVisit,
    updateMaintenanceVisit,
    updateMaintenanceVisitStatus,
    deleteMaintenanceVisit,
    bulkUpdateMaintenanceStatus,
    bulkDeleteMaintenanceVisits,
    searchMaintenanceVisits,
} from "./maintenance-actions";

// CRUD operations for maintenance employees
export {
    getMaintenanceEmployees,
    getMaintenanceEmployeeById,
    getTechnicianWorkload,
    getAllTechniciansWithWorkload,
    createMaintenanceEmployee,
    updateMaintenanceEmployee,
    deleteMaintenanceEmployee,
} from "./employee-actions";

// Analytics operations
export {
    getMaintenanceKPIs,
    getDelayAnalytics,
    getTechnicianPerformance,
    getMaintenanceCostBreakdown,
    getResolutionMetrics,
    getMaintenanceDashboardSummary,
    type MaintenanceKPIs,
    type DelayAnalytics,
    type TechnicianPerformance,
    type CostBreakdown,
    type ResolutionMetrics,
    type DateRangeFilter,
} from "./analytics-actions";

// Catalog operations
export {
    // Services catalog
    getServicesCatalog,
    getGroupedServicesCatalog,
    addServiceToCatalog,
    updateServiceInCatalog,
    removeServiceFromCatalog,
    // Parts catalog
    getPartsCatalog,
    getGroupedPartsCatalog,
    addPartToCatalog,
    updatePartInCatalog,
    removePartFromCatalog,
    // Problems catalog
    getProblemsCatalog,
    getGroupedProblemsCatalog,
    addProblemToCatalog,
    updateProblemInCatalog,
    removeProblemFromCatalog,
    // Bulk operations
    getAllCatalogs,
    getCatalogCategories,
    // Types
    type ServiceCatalogItem,
    type PartsCatalogItem,
    type ProblemsCatalogItem,
    type GroupedServicesCatalog,
    type GroupedPartsCatalog,
    type GroupedProblemsCatalog,
} from "./catalog-actions";

// Validation schemas and types
export {
    // Base schemas
    sparePartInputSchema,
    maintenanceServiceInputSchema,
    maintenanceStatusSchema,
    resolutionStatusSchema,
    visitTypeSchema,
    // CRUD schemas
    createMaintenanceVisitSchema,
    updateMaintenanceVisitSchema,
    maintenanceFiltersSchema,
    bulkStatusUpdateSchema,
    bulkDeleteSchema,
    // Employee schemas
    createMaintenanceEmployeeSchema,
    updateMaintenanceEmployeeSchema,
    createCancellationReasonSchema,
    // Types
    type MaintenanceStatus,
    type ResolutionStatus,
    type CreateMaintenanceVisitInput,
    type UpdateMaintenanceVisitInput,
    type MaintenanceFilters,
    type BulkStatusUpdateInput,
    type BulkDeleteInput,
    type CreateMaintenanceEmployeeInput,
    type UpdateMaintenanceEmployeeInput,
    type CreateCancellationReasonInput,
    type ActionResponse,
    type PaginatedResponse,
} from "./maintenance-schemas";
