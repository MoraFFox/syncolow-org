/**
 * Configuration Schemas for Mock Data Generator
 *
 * Zod schemas for runtime validation of generator configurations,
 * scenarios, and entity volumes.
 */

import { z } from 'zod';

// ============================================================================
// Entity Volume Schema
// ============================================================================

export const EntityVolumeSchema = z.object({
  users: z.number().int().min(1).max(10000).default(20),
  companies: z.number().int().min(1).max(100000).default(100),
  branchRatio: z.number().min(0).max(1).default(0.3),
  products: z.number().int().min(1).max(50000).default(200),
  ordersPerDay: z.number().int().min(1).max(10000).default(50),
  maintenanceVisitsPerWeek: z.number().int().min(0).max(1000).default(10),
});

// ============================================================================
// Distribution Schema
// ============================================================================

const OrderStatusDistributionSchema = z.object({
  Pending: z.number().min(0).max(1).default(0.1),
  Processing: z.number().min(0).max(1).default(0),
  Shipped: z.number().min(0).max(1).default(0.15),
  Delivered: z.number().min(0).max(1).default(0.7),
  Cancelled: z.number().min(0).max(1).default(0.05),
  'Delivery Failed': z.number().min(0).max(1).default(0),
}).refine(
  (data) => {
    const sum = Object.values(data).reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1) < 0.001;
  },
  { message: 'Order status distribution must sum to 1' }
);

const PaymentStatusDistributionSchema = z.object({
  Paid: z.number().min(0).max(1).default(0.8),
  Pending: z.number().min(0).max(1).default(0.15),
  Overdue: z.number().min(0).max(1).default(0.05),
}).refine(
  (data) => {
    const sum = Object.values(data).reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1) < 0.001;
  },
  { message: 'Payment status distribution must sum to 1' }
);

export const DistributionConfigSchema = z.object({
  orderStatus: OrderStatusDistributionSchema,
  paymentStatus: PaymentStatusDistributionSchema,
  productPopularity: z.enum(['zipf', 'normal', 'uniform']).default('zipf'),
  regionDistribution: z.object({
    A: z.number().min(0).max(1).default(0.6),
    B: z.number().min(0).max(1).default(0.4),
  }).refine(
    (data) => Math.abs(data.A + data.B - 1) < 0.001,
    { message: 'Region distribution must sum to 1' }
  ),
  deliveryDelays: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Anomaly Schema
// ============================================================================

export const AnomalyTypeSchema = z.enum([
  'payment_delay',
  'delivery_delay',
  'stock_shortage',
  'order_cancellation',
  'maintenance_failure',
  'duplicate_orders',
  'invalid_data',
]);

export const AnomalyConfigSchema = z.object({
  rate: z.number().min(0).max(1).default(0.05),
  types: z.array(AnomalyTypeSchema).optional(),
  clustering: z.enum(['burst', 'spread']).optional(),
});

// ============================================================================
// Scenario Profile Schema
// ============================================================================

export const ScenarioOverridesSchema = z.object({
  paymentMethods: z.array(z.enum(['transfer', 'check'])).optional(),
  orderValueRange: z.object({
    min: z.number().min(0).default(100),
    max: z.number().min(0).default(50000),
  }).optional(),
  productCategories: z.array(z.string()).optional(),
  companySizeDistribution: z.object({
    small: z.number().min(0).max(1).default(0.6),
    medium: z.number().min(0).max(1).default(0.3),
    large: z.number().min(0).max(1).default(0.1),
  }).optional(),
});

export const ScenarioProfileSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500),
  entityRates: EntityVolumeSchema,
  distributions: DistributionConfigSchema,
  anomalyRate: z.number().min(0).max(1).default(0.05),
  anomalyConfig: AnomalyConfigSchema.optional(),
  overrides: ScenarioOverridesSchema.optional(),
});

// ============================================================================
// Generator Config Schema
// ============================================================================

// Inner schema without refinement for partial usage
const GeneratorConfigBaseSchema = z.object({
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  seed: z.number().int().positive().optional(),
  scenario: z.string().min(1).default('normal-ops'),
  volumeMultiplier: z.number().min(0.1).max(100).default(1),
  batchSize: z.number().int().min(100).max(10000).default(1000),
  dryRun: z.boolean().default(false),
});

export const GeneratorConfigSchema = GeneratorConfigBaseSchema.refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'startDate must be before endDate' }
);

// Partial config schema for API request overrides
export const ConfigOverridesSchema = GeneratorConfigBaseSchema.partial();

// ============================================================================
// Safety Config Schema
// ============================================================================

export const SafetyConfigSchema = z.object({
  targetSchema: z.string().default('mock_data'),
  requireExplicitEnable: z.boolean().default(true),
  maxRecordsPerEntity: z.number().int().min(1000).max(10000000).default(1000000),
  allowedEnvironments: z.array(z.string()).default(['development', 'test', 'staging']),
  blockProductionWrites: z.boolean().default(true),
});

// ============================================================================
// Export Config Schema
// ============================================================================

export const ExportFormatSchema = z.enum(['csv', 'json', 'sql', 'pdf']);

export const ExportConfigSchema = z.object({
  format: ExportFormatSchema,
  entities: z.array(z.string()).optional(),
  outputPath: z.string().min(1),
  includeMetadata: z.boolean().default(true),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

export const GenerateRequestSchema = z.object({
  scenario: z.string().min(1),
  config: ConfigOverridesSchema.optional(),
});

export const StatusResponseSchema = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100),
  currentEntity: z.string().nullable(),
  recordsGenerated: z.record(z.number()),
  errors: z.array(z.object({
    entity: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })),
  estimatedTimeRemaining: z.number().nullable(),
});

// ============================================================================
// Type Exports from Schemas
// ============================================================================

export type EntityVolumeInput = z.input<typeof EntityVolumeSchema>;
export type DistributionConfigInput = z.input<typeof DistributionConfigSchema>;
export type ScenarioProfileInput = z.input<typeof ScenarioProfileSchema>;
export type GeneratorConfigInput = z.input<typeof GeneratorConfigSchema>;
export type SafetyConfigInput = z.input<typeof SafetyConfigSchema>;
export type ExportConfigInput = z.input<typeof ExportConfigSchema>;
export type GenerateRequestInput = z.input<typeof GenerateRequestSchema>;
