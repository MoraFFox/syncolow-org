/**
 * Mock Data Generator - Main Entry Point
 *
 * Exports all public interfaces for the mock data generator module.
 */

// Types
export type {
  MockGeneratorConfig,
  ScenarioProfile,
  GenerationResult,
  EntityRecordCounts,
  GenerationProgress,
  SafetyConfig,
  SafetyCheckResult,
  ExportConfig,
  ExportResult,
  GenerationMetrics,
  MockCompany,
  MockBranch,
  MockOrder,
  MockProduct,
  MockUser,
  MockMaintenanceVisit,
  InventoryMovement,
  Shipment,
  DeliveryAttempt,
  Discount,
  Refund,
  GenerationJob,
} from './types';

// Config schemas
export {
  GeneratorConfigSchema,
  ScenarioProfileSchema,
  SafetyConfigSchema,
  ExportConfigSchema,
  GenerateRequestSchema,
} from './config/schemas';

// Safety
export { SafetyGuard, isMockDataGenerationAllowed, getSafeMockDataClient } from './safety-guard';

// Scenarios
export { ScenarioManager, getScenarioManager } from './scenarios/scenario-manager';

// Time Series
export { TimeSeriesEngine } from './time-series-engine';
export type { TimePattern, TimedEvent, TimeSeriesConfig } from './time-series-engine';

// Progress
export {
  ProgressTracker,
  createConsoleProgressListener,
} from './progress-tracker';
export type { ProgressEvent, ProgressEventType, ProgressListener } from './progress-tracker';

// Orchestrator
export {
  MockDataOrchestrator,
  runMockDataGeneration,
} from './orchestrator';
export type { OrchestratorConfig } from './orchestrator';

// Generators (for advanced usage)
export { BaseGenerator } from './engines/base-generator';
export { UserGenerator } from './engines/user-generator';
export { CompanyGenerator } from './engines/company-generator';
export { AddressGenerator } from './engines/address-generator';
export { ProductGenerator } from './engines/product-generator';
export { OrderGenerator } from './engines/order-generator';
export { InventoryGenerator } from './engines/inventory-generator';
export { ShipmentGenerator } from './engines/shipment-generator';
export { PaymentGenerator } from './engines/payment-generator';
export { DiscountGenerator } from './engines/discount-generator';
export { RefundGenerator } from './engines/refund-generator';
export { MaintenanceGenerator } from './engines/maintenance-generator';
export { AuditLogGenerator } from './engines/audit-log-generator';

// Utilities
export { DateDistributor } from './utils/date-distributor';
export type { DeliverySchedule, BusinessHours } from './utils/date-distributor';
