/**
 * Type definitions for the Mock Data Generator
 *
 * This module defines all TypeScript interfaces and types used by the mock data
 * generation system, including configuration, scenarios, and result types.
 */

import type {
  Company,
  Branch,
  Product,
  Order,
  User,
  MaintenanceVisit,
} from '@/lib/types';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Main configuration for the mock data generator
 */
export interface MockGeneratorConfig {
  /** Start date for data generation (ISO 8601) */
  startDate: string;
  /** End date for data generation (ISO 8601) */
  endDate: string;
  /** Random seed for reproducibility */
  seed?: number;
  /** Scenario name to use */
  scenario: string;
  /** Volume multiplier (1.0 = normal, 2.0 = double) */
  volumeMultiplier?: number;
  /** Batch size for database inserts */
  batchSize?: number;
  /** Whether to run in dry-run mode (no database writes) */
  dryRun?: boolean;
}

/**
 * Entity volume configuration
 */
export interface EntityVolume {
  /** Number of users to generate */
  users: number;
  /** Number of companies to generate */
  companies: number;
  /** Number of branches as a ratio of companies (e.g., 0.3 = 30% of companies have branches) */
  branchRatio: number;
  /** Number of products to generate */
  products: number;
  /** Average orders per day */
  ordersPerDay: number;
  /** Maintenance visits per week */
  maintenanceVisitsPerWeek: number;
}

/**
 * Distribution configuration for various entity attributes
 */
export interface DistributionConfig {
  /** Order status distribution */
  orderStatus: Record<Order['status'], number>;
  /** Payment status distribution */
  paymentStatus: Record<Order['paymentStatus'], number>;
  /** Product popularity distribution type */
  productPopularity: 'zipf' | 'normal' | 'uniform';
  /** Region distribution */
  regionDistribution: Record<'A' | 'B', number>;
  /** Delivery delay rate (0-1) */
  deliveryDelays?: number;
}

/**
 * Anomaly configuration for stress testing
 */
export interface AnomalyConfig {
  /** Overall anomaly rate (0-1) */
  rate: number;
  /** Types of anomalies to inject */
  types?: AnomalyType[];
  /** Temporal clustering of anomalies (burst vs spread) */
  clustering?: 'burst' | 'spread';
}

/**
 * Types of anomalies that can be injected
 */
export type AnomalyType =
  | 'payment_delay'
  | 'delivery_delay'
  | 'stock_shortage'
  | 'order_cancellation'
  | 'maintenance_failure'
  | 'duplicate_orders'
  | 'invalid_data';

// ============================================================================
// Scenario Types
// ============================================================================

/**
 * Complete scenario profile definition
 */
export interface ScenarioProfile {
  /** Unique scenario name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Entity volume configuration */
  entityRates: EntityVolume;
  /** Distribution configurations */
  distributions: DistributionConfig;
  /** Anomaly configuration */
  anomalyRate: number;
  /** Optional anomaly details */
  anomalyConfig?: AnomalyConfig;
  /** Scenario-specific overrides */
  overrides?: Partial<ScenarioOverrides>;
}

/**
 * Scenario-specific overrides
 */
export interface ScenarioOverrides {
  /** Force specific payment methods */
  paymentMethods: ('transfer' | 'check')[];
  /** Minimum/maximum order values */
  orderValueRange: { min: number; max: number };
  /** Specific product categories to focus on */
  productCategories: string[];
  /** Company size distribution */
  companySizeDistribution: Record<'small' | 'medium' | 'large', number>;
}

// ============================================================================
// Generation Result Types
// ============================================================================

/**
 * Result of a generation run
 */
export interface GenerationResult {
  /** Unique job ID */
  jobId: string;
  /** Whether generation was successful */
  success: boolean;
  /** Scenario used */
  scenario: string;
  /** Configuration used */
  config: MockGeneratorConfig;
  /** Records generated per entity type */
  recordCounts: EntityRecordCounts;
  /** Any errors encountered */
  errors: GenerationError[];
  /** Execution timing */
  timing: ExecutionTiming;
  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Record counts per entity type
 */
export interface EntityRecordCounts {
  users: number;
  companies: number;
  branches: number;
  addresses: number;
  products: number;
  orders: number;
  orderItems: number;
  inventory: number;
  shipments: number;
  payments: number;
  discounts: number;
  returns: number;
  refunds: number;
  maintenanceVisits: number;
  auditLogs: number;
}

/**
 * Generation error details
 */
export interface GenerationError {
  /** Entity type that failed */
  entity: keyof EntityRecordCounts;
  /** Error message */
  message: string;
  /** Batch number that failed */
  batchNumber?: number;
  /** Whether the error was recovered from */
  recovered: boolean;
  /** Timestamp of error */
  timestamp: string;
}

/**
 * Execution timing metrics
 */
export interface ExecutionTiming {
  /** Start timestamp */
  startedAt: string;
  /** End timestamp */
  completedAt: string;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Time per entity type */
  entityTiming: Record<string, number>;
}

// ============================================================================
// Safety Types
// ============================================================================

/**
 * Safety configuration for environment isolation
 */
export interface SafetyConfig {
  /** Target database schema */
  targetSchema: string;
  /** Whether to require explicit enable flag */
  requireExplicitEnable: boolean;
  /** Maximum records per entity */
  maxRecordsPerEntity: number;
  /** Environments where generation is allowed */
  allowedEnvironments: string[];
  /** Whether to block production writes */
  blockProductionWrites: boolean;
}

/**
 * Safety check result
 */
export interface SafetyCheckResult {
  /** Whether safety checks passed */
  passed: boolean;
  /** List of failed checks */
  failures: SafetyFailure[];
  /** Current environment */
  environment: string;
  /** Target schema */
  targetSchema: string;
}

/**
 * Safety check failure details
 */
export interface SafetyFailure {
  /** Check name that failed */
  check: string;
  /** Reason for failure */
  reason: string;
  /** Severity level */
  severity: 'error' | 'warning';
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

/**
 * Real-time progress tracking
 */
export interface GenerationProgress {
  /** Current job ID */
  jobId: string;
  /** Current status */
  status: 'initializing' | 'generating' | 'validating' | 'completed' | 'failed' | 'rolling_back';
  /** Current entity being generated */
  currentEntity: keyof EntityRecordCounts | null;
  /** Current batch number */
  currentBatch: number;
  /** Total batches for current entity */
  totalBatches: number;
  /** Records generated so far */
  recordsGenerated: EntityRecordCounts;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number | null;
  /** Current throughput (records/second) */
  throughput: number;
  /** Errors encountered so far */
  errorCount: number;
  /** Last update timestamp */
  updatedAt: string;
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'json' | 'sql' | 'pdf';

/**
 * Export configuration
 */
export interface ExportConfig {
  /** Export format */
  format: ExportFormat;
  /** Entities to export (empty = all) */
  entities?: (keyof EntityRecordCounts)[];
  /** Output directory or file path */
  outputPath: string;
  /** Whether to include metadata */
  includeMetadata?: boolean;
  /** Date range filter */
  dateRange?: { start: string; end: string };
}

/**
 * Export result
 */
export interface ExportResult {
  /** Whether export was successful */
  success: boolean;
  /** Output file paths */
  files: string[];
  /** Total records exported */
  totalRecords: number;
  /** Export duration in ms */
  durationMs: number;
  /** Any errors */
  errors: string[];
}

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * Generation run metrics for observability
 */
export interface GenerationMetrics {
  /** Run ID */
  runId: string;
  /** Scenario used */
  scenario: string;
  /** Total records generated */
  totalRecords: number;
  /** Records per second */
  recordsPerSecond: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Time per entity in ms */
  entityTimings: Record<string, number>;
  /** Memory usage peak in MB */
  peakMemoryMb?: number;
  /** Started at */
  startedAt: string;
  /** Completed at */
  completedAt: string;
}

// ============================================================================
// Extended Entity Types (for generation)
// ============================================================================

/**
 * Extended company type with generation metadata
 */
export interface MockCompany extends Company {
  _mockMetadata?: {
    generatedAt: string;
    seed: number;
    batchId: string;
  };
}

/**
 * Extended branch type with generation metadata
 */
export interface MockBranch extends Branch {
  _mockMetadata?: {
    generatedAt: string;
    seed: number;
    batchId: string;
  };
}

/**
 * Extended order type with generation metadata
 */
export interface MockOrder extends Order {
  _mockMetadata?: {
    generatedAt: string;
    seed: number;
    batchId: string;
  };
}

/**
 * Extended product type with generation metadata
 */
export interface MockProduct extends Product {
  _mockMetadata?: {
    generatedAt: string;
    seed: number;
    batchId: string;
  };
}

/**
 * Extended user type with generation metadata
 */
export interface MockUser extends User {
  _mockMetadata?: {
    generatedAt: string;
    seed: number;
    batchId: string;
  };
}

/**
 * Extended maintenance visit type with generation metadata
 */
export interface MockMaintenanceVisit extends MaintenanceVisit {
  _mockMetadata?: {
    generatedAt: string;
    seed: number;
    batchId: string;
  };
}

// ============================================================================
// Inventory Types (for mock generation)
// ============================================================================

/**
 * Inventory movement record
 */
export interface InventoryMovement {
  id: string;
  productId: string;
  movementType: 'ORDER_FULFILLMENT' | 'RETURN' | 'RESTOCK' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string; // orderId or returnId
  referenceType?: 'order' | 'return' | 'manual';
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

/**
 * Shipment record
 */
export interface Shipment {
  id: string;
  orderId: string;
  status: 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'failed';
  scheduledDeliveryDate: string;
  actualDeliveryDate?: string;
  attempts: DeliveryAttempt[];
  driverName?: string;
  vehicleId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Delivery attempt record
 */
export interface DeliveryAttempt {
  attemptNumber: number;
  attemptDate: string;
  status: 'success' | 'failed' | 'rescheduled';
  failureReason?: string;
  notes?: string;
}

/**
 * Discount record
 */
export interface Discount {
  id: string;
  orderId: string;
  orderItemId?: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
  reason?: string;
  appliedAt: string;
  appliedBy?: string;
}

/**
 * Refund record
 */
export interface Refund {
  id: string;
  returnId: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  reason?: string;
  processedAt?: string;
  processedBy?: string;
  createdAt: string;
}

// ============================================================================
// Job Management Types
// ============================================================================

/**
 * Generation job record
 */
export interface GenerationJob {
  id: string;
  scenario: string;
  config: MockGeneratorConfig;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: GenerationProgress;
  result?: GenerationResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}
