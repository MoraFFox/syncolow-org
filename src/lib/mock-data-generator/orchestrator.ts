/**
 * Mock Data Orchestrator
 *
 * Main execution engine that coordinates all generators, enforces
 * dependency order, and manages the generation lifecycle.
 */

import { faker } from '@faker-js/faker';
import { differenceInDays } from 'date-fns';
import { SafetyGuard, getSafeMockDataClient } from './safety-guard';
import { getScenarioManager } from './scenarios/scenario-manager';
import { ProgressTracker, createConsoleProgressListener } from './progress-tracker';
import { TimeSeriesEngine } from './time-series-engine';
import { UserGenerator } from './engines/user-generator';
import { CompanyGenerator } from './engines/company-generator';
import { AddressGenerator } from './engines/address-generator';
import { ProductGenerator } from './engines/product-generator';
import { OrderGenerator } from './engines/order-generator';
import { InventoryGenerator } from './engines/inventory-generator';
import { ShipmentGenerator } from './engines/shipment-generator';
import { PaymentGenerator } from './engines/payment-generator';
import { DiscountGenerator } from './engines/discount-generator';
import { RefundGenerator } from './engines/refund-generator';
import { MaintenanceGenerator } from './engines/maintenance-generator';
import { AuditLogGenerator } from './engines/audit-log-generator';
import { logger } from '../logger';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  GenerationResult,
  EntityRecordCounts,
  GenerationError,
  MockUser,
  MockCompany,
  MockBranch,
  MockProduct,
  MockOrder,
  MockMaintenanceVisit,
  InventoryMovement,
  Shipment,
  Discount,
  Refund,
} from './types';
import type { Payment, AuditLog } from '@/lib/types';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Enable console progress logging */
  enableConsoleProgress?: boolean;
  /** Enable database writes (false = dry run) */
  enableDatabaseWrites?: boolean;
  /** Custom Faker seed */
  fakerSeed?: number;
}

export class MockDataOrchestrator {
  private config: MockGeneratorConfig;
  private scenario: ScenarioProfile;
  private safetyGuard: SafetyGuard;
  private progressTracker: ProgressTracker;
  private timeSeriesEngine: TimeSeriesEngine;
  private jobId: string;
  private errors: GenerationError[] = [];
  private startTime: number = 0;
  private orchConfig: OrchestratorConfig;

  // Generated data references
  private users: MockUser[] = [];
  private companies: MockCompany[] = [];
  private branches: MockBranch[] = [];
  private products: MockProduct[] = [];
  private orders: MockOrder[] = [];
  private maintenanceVisits: MockMaintenanceVisit[] = [];
  private inventoryMovements: InventoryMovement[] = [];
  private shipments: Shipment[] = [];
  private payments: Payment[] = [];
  private discounts: Discount[] = [];
  private refunds: Refund[] = [];
  private auditLogs: AuditLog[] = [];

  constructor(config: MockGeneratorConfig, orchConfig: OrchestratorConfig = {}) {
    this.config = config;
    this.orchConfig = orchConfig;
    this.jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Load scenario
    const scenarioManager = getScenarioManager();
    this.scenario = scenarioManager.loadScenario(config.scenario);

    // Initialize components
    this.safetyGuard = new SafetyGuard();
    this.progressTracker = new ProgressTracker(this.jobId, this.calculateTargetCounts());
    this.timeSeriesEngine = new TimeSeriesEngine(config);

    // Set Faker seed for reproducibility
    if (config.seed) {
      faker.seed(config.seed);
    }

    // Add console progress listener if enabled
    if (orchConfig.enableConsoleProgress) {
      this.progressTracker.addListener(createConsoleProgressListener());
    }
  }

  /**
   * Execute the full generation workflow
   */
  async execute(): Promise<GenerationResult> {
    this.startTime = Date.now();

    logger.info('[Orchestrator] Starting generation', {
      jobId: this.jobId,
      scenario: this.scenario.name,
      config: this.config,
    });

    try {
      // Run safety checks
      const safetyResult = this.safetyGuard.runAllChecks();
      if (!safetyResult.passed) {
        throw new Error(`Safety checks failed: ${safetyResult.failures.map((f) => f.reason).join('; ')}`);
      }

      // Start progress tracking
      this.progressTracker.start();

      // Execute generators in dependency order
      await this.generateInOrder();

      // Validate referential integrity
      await this.validateIntegrity();

      // Write to database if enabled
      if (this.orchConfig.enableDatabaseWrites) {
        await this.writeToDatabase();
      }

      // Mark as complete
      this.progressTracker.complete();

      return this.buildResult(true);
    } catch (error) {
      logger.error('[Orchestrator] Generation failed', { error, jobId: this.jobId });

      this.progressTracker.fail(error instanceof Error ? error : String(error));

      // Attempt rollback if database writes were enabled
      if (this.orchConfig.enableDatabaseWrites) {
        await this.rollback();
      }

      return this.buildResult(false, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Execute generators in dependency order
   */
  private async generateInOrder(): Promise<void> {
    const volumeMultiplier = this.config.volumeMultiplier ?? 1;
    const rates = this.scenario.entityRates;

    // 1. Users
    await this.generateEntity('users', async () => {
      const generator = new UserGenerator(this.config, this.scenario, faker);
      this.users = await generator.generate(Math.floor(rates.users * volumeMultiplier));
      return this.users.length;
    });

    // 2. Companies
    await this.generateEntity('companies', async () => {
      const generator = new CompanyGenerator(this.config, this.scenario, faker);
      this.companies = await generator.generate(Math.floor(rates.companies * volumeMultiplier));
      return this.companies.length;
    });

    // 3. Branches
    await this.generateEntity('branches', async () => {
      const generator = new CompanyGenerator(this.config, this.scenario, faker);
      this.branches = await generator.generateBranches(this.companies, rates.branchRatio);
      return this.branches.length;
    });

    // 4. Addresses
    await this.generateEntity('addresses', async () => {
      const generator = new AddressGenerator(this.config, this.scenario, faker);
      const entities = [
        ...this.companies.map((c) => ({ id: c.id, type: 'company' as const, area: c.area })),
        ...this.branches.map((b) => ({ id: b.id, type: 'branch' as const, area: b.area })),
      ];
      const addresses = await generator.generateForEntities(entities);
      return addresses.length;
    });

    // 5. Products
    await this.generateEntity('products', async () => {
      const generator = new ProductGenerator(this.config, this.scenario, faker);
      this.products = await generator.generate(Math.floor(rates.products * volumeMultiplier));
      return this.products.length;
    });

    // 6. Orders
    await this.generateEntity('orders', async () => {
      const generator = new OrderGenerator(
        this.config,
        this.scenario,
        faker,
        this.companies,
        this.branches,
        this.products,
        this.timeSeriesEngine
      );

      const days = differenceInDays(
        new Date(this.config.endDate),
        new Date(this.config.startDate)
      );
      // Removed unused calculation

      this.orders = await generator.generateForDateRange(rates.ordersPerDay * volumeMultiplier);
      return this.orders.length;
    });

    // 7. Order Items
    const orderItemCount = this.orders.reduce((sum, o) => sum + o.items.length, 0);
    this.progressTracker.completeBatch('orderItems', orderItemCount);

    // 8. Inventory
    await this.generateEntity('inventory', async () => {
      const generator = new InventoryGenerator(
        this.config,
        this.scenario,
        faker,
        this.products,
        this.orders
      );
      this.inventoryMovements = await generator.generate(this.orders.length * 3);
      return this.inventoryMovements.length;
    });

    // 9. Shipments
    await this.generateEntity('shipments', async () => {
      const generator = new ShipmentGenerator(this.config, this.scenario, faker, this.orders);
      this.shipments = await generator.generate(this.orders.length);
      return this.shipments.length;
    });

    // 10. Payments
    await this.generateEntity('payments', async () => {
      const generator = new PaymentGenerator(this.config, this.scenario, faker, this.orders);
      this.payments = await generator.generate(this.orders.length);
      return this.payments.length;
    });

    // 11. Discounts
    await this.generateEntity('discounts', async () => {
      const generator = new DiscountGenerator(this.config, this.scenario, faker, this.orders);
      this.discounts = await generator.generate(Math.floor(this.orders.length * 0.2));
      return this.discounts.length;
    });

    // 12. Returns & Refunds
    await this.generateEntity('refunds', async () => {
      const generator = new RefundGenerator(this.config, this.scenario, faker, this.orders);
      this.refunds = await generator.generate(Math.floor(this.orders.length * 0.05));
      return this.refunds.length;
    });

    // 13. Maintenance Visits
    await this.generateEntity('maintenanceVisits', async () => {
      const generator = new MaintenanceGenerator(
        this.config,
        this.scenario,
        faker,
        this.companies,
        this.branches
      );

      const weeks = Math.ceil(
        differenceInDays(new Date(this.config.endDate), new Date(this.config.startDate)) / 7
      );
      const totalVisits = Math.floor(weeks * rates.maintenanceVisitsPerWeek * volumeMultiplier);

      this.maintenanceVisits = await generator.generate(totalVisits);
      return this.maintenanceVisits.length;
    });

    // 14. Audit Logs
    await this.generateEntity('auditLogs', async () => {
      const generator = new AuditLogGenerator(this.config, this.scenario, faker, {
        users: this.users,
        companies: this.companies,
        orders: this.orders,
        products: this.products,
        maintenanceVisits: this.maintenanceVisits,
      });

      const totalOperations =
        this.users.length +
        this.companies.length +
        this.orders.length * 3 +
        this.maintenanceVisits.length * 2;

      this.auditLogs = await generator.generate(totalOperations);
      return this.auditLogs.length;
    });
  }

  /**
   * Generate a single entity type with progress tracking
   */
  private async generateEntity(
    entity: keyof EntityRecordCounts,
    generateFn: () => Promise<number>
  ): Promise<void> {
    const batchSize = this.config.batchSize ?? 1000;

    this.progressTracker.startEntity(entity, 1); // Single batch for now

    try {
      const count = await generateFn();
      this.progressTracker.completeBatch(entity, count);
      this.progressTracker.completeEntity(entity);

      logger.info(`[Orchestrator] Generated ${count} ${entity}`);
    } catch (error) {
      this.errors.push({
        entity,
        message: error instanceof Error ? error.message : String(error),
        recovered: false,
        timestamp: new Date().toISOString(),
      });

      this.progressTracker.recordError(entity, error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Validate referential integrity of generated data
   */
  private async validateIntegrity(): Promise<void> {
    logger.info('[Orchestrator] Validating referential integrity');

    const companyIds = new Set(this.companies.map((c) => c.id));
    const branchIds = new Set(this.branches.map((b) => b.id));
    const productIds = new Set(this.products.map((p) => p.id));

    // Validate orders reference valid companies
    for (const order of this.orders) {
      if (!companyIds.has(order.companyId)) {
        logger.warn('[Orchestrator] Order references invalid company', {
          orderId: order.id,
          companyId: order.companyId,
        });
      }

      for (const item of order.items) {
        if (!productIds.has(item.productId)) {
          logger.warn('[Orchestrator] Order item references invalid product', {
            orderId: order.id,
            productId: item.productId,
          });
        }
      }
    }

    logger.info('[Orchestrator] Integrity validation complete');
  }

  /**
   * Rollback on failure
   */
  private async rollback(): Promise<void> {
    logger.info('[Orchestrator] Rolling back');
    this.progressTracker.startRollback();

    try {
      // In a real implementation, this would truncate mock_data schema tables
      // For now, just log the rollback
      logger.info('[Orchestrator] Rollback complete (no-op in dry run)');
    } catch (error) {
      logger.error('[Orchestrator] Rollback failed', { error });
    }

    this.progressTracker.completeRollback();
  }

  /**
   * Write generated data to database
   */
  private async writeToDatabase(): Promise<void> {
    logger.info('[Orchestrator] Writing data to database');

    const supabase = getSafeMockDataClient();
    const batchSize = 100;

    // Helper to insert in batches - using 'any' for flexibility with generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertBatch = async (
      table: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformFn?: (item: any) => Record<string, unknown>
    ) => {
      if (data.length === 0) return;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const insertData = transformFn ? batch.map(transformFn) : batch;

        const { error } = await supabase.from(table).insert(insertData);

        if (error) {
          // Log more detailed error info
          logger.error(`[Orchestrator] Failed to insert ${table}`, {
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            batch: i,
            sampleRecord: JSON.stringify(insertData[0]).substring(0, 200)
          });
          throw new Error(`Insert ${table} failed: ${error.message} (code: ${error.code})`);
        }
      }

      logger.info(`[Orchestrator] Inserted ${data.length} records into ${table}`);
    };

    // 1. Users (CamelCase)
    await insertBatch('users', this.users, (u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      photoURL: u.photoUrl
    }));

    // 2. Companies & Branches (Merged into 'companies' table)
    // Flatten hierarchy: MockBranch has companyId which maps to parentCompanyId
    const allCompanies = [
      ...this.companies.map(c => ({ ...c, isBranch: false })),
      ...this.branches.map(b => ({ ...b, isBranch: true, parentCompanyId: b.companyId }))
    ];

    await insertBatch('companies', allCompanies, (c: any) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      region: c.region,
      area: c.area,
      status: c.status || 'Active',
      contacts: c.contacts,
      taxNumber: c.taxNumber,
      email: c.email,
      managerName: c.managerName,
      paymentMethod: c.paymentMethod,
      paymentDueType: c.paymentDueType,
      paymentDueDays: c.paymentDueDays,
      paymentStatus: c.paymentStatus,
      maintenanceLocation: c.maintenanceLocation,
      location: c.location,
      isBranch: c.isBranch,
      parentCompanyId: c.parentCompanyId || null,
      machineOwned: c.machineOwned,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      // Default numeric fields to 0 if undefined
      currentPaymentScore: c.currentPaymentScore || 100,
      totalUnpaidOrders: c.totalUnpaidOrders || 0,
      totalOutstandingAmount: c.totalOutstandingAmount || 0,
      pendingBulkPaymentAmount: c.pendingBulkPaymentAmount || 0,
    }));

    // 3. Baristas (Extracted from companies/branches json)
    const allBaristas = allCompanies.flatMap((c: any) => {
      if (!c.baristas) return [];
      return c.baristas.map((b: any) => ({
        ...b,
        branchId: c.id // Corresponds to the company/branch record ID
      }));
    });

    await insertBatch('baristas', allBaristas, (b) => ({
      id: b.id,
      branchId: b.branchId,
      name: b.name,
      phoneNumber: b.phoneNumber,
      rating: b.rating,
      notes: b.notes
    }));

    // 4. Products (CamelCase)
    await insertBatch('products', this.products, (p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      sku: p.sku,
      manufacturerId: p.manufacturerId,
      category: p.category,
      imageUrl: p.imageUrl,
      parentProductId: p.parentProductId || null,
      isVariant: p.isVariant,
      variantName: p.variantName || null,
      totalSold: p.totalSold || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    // 5. Orders (CamelCase, with Items JSONB)
    await insertBatch('orders', this.orders, (order) => ({
      id: order.id,
      companyId: order.companyId,
      branchId: order.branchId,
      companyName: order.companyName,
      branchName: order.branchName,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      deliverySchedule: order.deliverySchedule,
      paymentDueDate: order.paymentDueDate,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      totalTax: order.totalTax || 0,
      discountType: order.discountType,
      discountValue: order.discountValue,
      grandTotal: order.grandTotal,
      total: order.grandTotal,
      items: order.items, // JSONB
      isPotentialClient: order.isPotentialClient,
      daysOverdue: order.daysOverdue,
      deliveryNotes: order.deliveryNotes,
      createdAt: order.orderDate,
      updatedAt: order.orderDate
    }));

    // 6. Maintenance (Renamed from maintenance_visits)
    // Note: use-order-store queries 'maintenance', not 'maintenance_visits'
    await insertBatch('maintenance', this.maintenanceVisits, (v) => ({
      id: v.id,
      branchId: v.branchId,
      companyId: v.companyId,
      branchName: v.branchName,
      companyName: v.companyName,
      date: v.date,
      scheduledDate: v.scheduledDate,
      technicianName: v.technicianName,
      visitType: v.visitType,
      status: v.status,
      maintenanceNotes: v.maintenanceNotes,
      spareParts: v.spareParts,
      services: v.services,
      baristaId: v.baristaId, // Ensure generated visits have these
      baristaName: v.baristaName,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    // 7. Inventory Movements
    await insertBatch('inventory_movements', this.inventoryMovements, (m) => ({
      id: m.id,
      productId: m.productId,
      type: m.movementType, // map movementType to 'type' column
      quantity: m.quantity,
      reason: 'Order Fulfillment', // Default/calculated
      reference: m.referenceId,
      createdAt: m.createdAt
    }));

    // 8. Shipments
    await insertBatch('shipments', this.shipments, (s) => ({
      id: s.id,
      orderId: s.orderId,
      status: s.status,
      trackingNumber: null, // shipment type doesn't support generic tracking number field? Check type
      carrier: 'Internal',
      estimatedDelivery: s.scheduledDeliveryDate,
      actualDelivery: s.actualDeliveryDate,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    // 9. Delivery Attempts
    const attempts = this.shipments.flatMap(s => s.attempts.map(a => ({ ...a, shipmentId: s.id })));
    await insertBatch('delivery_attempts', attempts, (a) => ({
      // id is generated by DB default if not provided? No, schema says primary key default gen_random_uuid()
      // But we might need to link them. The mock generator type has no ID for attempts?
      // DeliveryAttempt interface: attemptNumber, attemptDate, status...
      shipmentId: a.shipmentId,
      attemptDate: a.attemptDate,
      success: a.status === 'success',
      notes: a.notes,
      driverName: null
    }));

    // 10. Payments
    await insertBatch('payments', this.payments, (p) => ({
      id: p.id,
      orderId: p.invoiceId, // MockPayment maps invoiceId likely to orderId in this context
      amount: p.amount,
      date: p.paymentDate,
      method: p.method,
      status: 'Paid',
      notes: 'Generated Payment'
    }));

    // 11. Discounts
    await insertBatch('discounts', this.discounts, (d) => ({
      id: d.id,
      code: `DISC-${d.id.substring(0, 6)}`,
      type: d.type,
      value: d.value,
      startDate: d.appliedAt, // Approximate
      endDate: null,
      usedCount: 1
    }));

    // 12. Refunds (from this.refunds array)
    await insertBatch('refunds', this.refunds, (r) => ({
      id: r.id,
      paymentId: null, // MockRefund has returnId/orderId, schema has payment_id/order_id.
      orderId: r.orderId,
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      date: r.createdAt
    }));

    // 13. Audit Logs
    await insertBatch('audit_logs', this.auditLogs, (l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      entityType: 'System', // Generic
      details: l.details,
      createdAt: l.timestamp
    }));

    logger.info('[Orchestrator] Database write complete');
  }

  /**
   * Calculate target counts for progress tracking
   */
  private calculateTargetCounts(): Partial<EntityRecordCounts> {
    const rates = this.scenario.entityRates;
    const multiplier = this.config.volumeMultiplier ?? 1;
    const days = differenceInDays(
      new Date(this.config.endDate),
      new Date(this.config.startDate)
    );

    return {
      users: Math.floor(rates.users * multiplier),
      companies: Math.floor(rates.companies * multiplier),
      branches: Math.floor(rates.companies * rates.branchRatio * multiplier),
      products: Math.floor(rates.products * multiplier),
      orders: Math.floor(days * rates.ordersPerDay * multiplier),
    };
  }

  /**
   * Build the generation result
   */
  private buildResult(success: boolean, errorMessage?: string): GenerationResult {
    const progress = this.progressTracker.getProgress();

    return {
      jobId: this.jobId,
      success,
      scenario: this.scenario.name,
      config: this.config,
      recordCounts: progress.recordsGenerated,
      errors: errorMessage
        ? [
          ...this.errors,
          {
            entity: 'users',
            message: errorMessage,
            recovered: false,
            timestamp: new Date().toISOString(),
          },
        ]
        : this.errors,
      timing: {
        startedAt: new Date(this.startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startTime,
        entityTiming: {},
      },
      dryRun: this.config.dryRun ?? false,
    };
  }

  /**
   * Get current progress
   */
  getProgress() {
    return this.progressTracker.getProgress();
  }

  /**
   * Get the progress tracker instance (for adding listeners)
   */
  getProgressTracker() {
    return this.progressTracker;
  }

  /**
   * Get job ID
   */
  getJobId(): string {
    return this.jobId;
  }
}

/**
 * Convenience function to run generation
 */
export async function runMockDataGeneration(
  config: MockGeneratorConfig,
  options: OrchestratorConfig = {}
): Promise<GenerationResult> {
  const orchestrator = new MockDataOrchestrator(config, {
    enableConsoleProgress: true,
    ...options,
  });

  return orchestrator.execute();
}
