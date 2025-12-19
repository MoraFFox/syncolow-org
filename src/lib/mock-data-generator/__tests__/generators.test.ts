/**
 * Mock Data Generator Tests
 *
 * Unit tests for the mock data generator core components.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { TimeSeriesEngine } from '../time-series-engine';
import { UserGenerator } from '../engines/user-generator';
import { CompanyGenerator } from '../engines/company-generator';
import { ProductGenerator } from '../engines/product-generator';
import { OrderGenerator } from '../engines/order-generator';
import { getScenarioManager } from '../scenarios/scenario-manager';
import { SafetyGuard } from '../safety-guard';
import { ProgressTracker } from '../progress-tracker';
import { DistributionUtils } from '../utils/distributions';
import type { MockGeneratorConfig, ScenarioProfile, MockCompany, MockBranch, MockProduct } from '../types';

// Test configuration
const testConfig: MockGeneratorConfig = {
  startDate: '2024-01-01',
  endDate: '2024-03-31',
  seed: 12345,
  scenario: 'normal-ops',
  volumeMultiplier: 0.1, // Small for tests
  batchSize: 100,
  dryRun: true,
};

// Load test scenario
const scenarioManager = getScenarioManager();
const testScenario = scenarioManager.loadScenario('normal-ops');

describe('UserGenerator', () => {
  let generator: UserGenerator;

  beforeEach(() => {
    faker.seed(12345);
    generator = new UserGenerator(testConfig, testScenario, faker);
  });

  it('generates the correct number of users', async () => {
    const users = await generator.generate(10);
    expect(users).toHaveLength(10);
  });

  it('generates users with required fields', async () => {
    const users = await generator.generate(5);

    for (const user of users) {
      expect(user.id).toBeDefined();
      expect(user.displayName).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(['Admin', 'Manager', 'Sales', 'Support']).toContain(user.role);
    }
  });

  it('generates unique IDs for each user', async () => {
    const users = await generator.generate(50);
    const ids = new Set(users.map((u) => u.id));
    expect(ids.size).toBe(50);
  });

  it('respects role distribution', async () => {
    const users = await generator.generate(100);

    const roleCounts = users.reduce(
      (acc, u) => {
        acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Admin should be minority (~5%)
    expect(roleCounts['Admin'] ?? 0).toBeLessThan(20);
    // Sales should be dominant (~50%)
    expect(roleCounts['Sales'] ?? 0).toBeGreaterThan(30);
  });
});

describe('CompanyGenerator', () => {
  let generator: CompanyGenerator;

  beforeEach(() => {
    faker.seed(12345);
    generator = new CompanyGenerator(testConfig, testScenario, faker);
  });

  it('generates the correct number of companies', async () => {
    const companies = await generator.generate(10);
    expect(companies).toHaveLength(10);
  });

  it('generates companies with Egyptian-specific data', async () => {
    const companies = await generator.generate(5);

    for (const company of companies) {
      expect(company.id).toBeDefined();
      expect(company.name).toBeDefined();
      expect(company.area).toBeDefined();
      expect(company.region).toMatch(/^[AB]$/);
      expect(company.contacts![0].phoneNumbers[0].number).toMatch(/^\+20/);
    }
  });

  it('generates branches for companies', async () => {
    const companies = await generator.generate(10);
    const branches = await generator.generateBranches(companies, 0.3);

    // Should have approximately 30% branches relative to companies
    expect(branches.length).toBeGreaterThan(0);
    expect(branches.length).toBeLessThanOrEqual(companies.length);

    // All branches should reference valid companies
    const companyIds = new Set(companies.map((c) => c.id));
    for (const branch of branches) {
      expect(companyIds.has(branch.companyId)).toBe(true);
    }
  });
});

describe('ProductGenerator', () => {
  let generator: ProductGenerator;

  beforeEach(() => {
    faker.seed(12345);
    generator = new ProductGenerator(testConfig, testScenario, faker);
  });

  it('generates the correct number of products', async () => {
    const products = await generator.generate(20);
    expect(products).toHaveLength(20);
  });

  it('generates products with valid pricing', async () => {
    const products = await generator.generate(10);

    for (const product of products) {
      expect(product.price).toBeGreaterThan(0);
      // costPrice not in Product interface
      expect(product.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it('generates products with popularity ranks', async () => {
    const products = await generator.generate(50);

    for (const product of products) {
      expect(product.totalSold).toBeDefined();
      expect(product.totalSold).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('OrderGenerator', () => {
  let generator: OrderGenerator;
  let companies: MockCompany[];
  let branches: MockBranch[];
  let products: MockProduct[];

  beforeEach(async () => {
    faker.seed(12345);

    const companyGen = new CompanyGenerator(testConfig, testScenario, faker);
    companies = await companyGen.generate(5);
    branches = await companyGen.generateBranches(companies, 0.3);

    const productGen = new ProductGenerator(testConfig, testScenario, faker);
    products = await productGen.generate(20);

    const timeSeriesEngine = new TimeSeriesEngine(testConfig);
    generator = new OrderGenerator(testConfig, testScenario, faker, companies, branches, products, timeSeriesEngine);
  });

  it('generates orders with valid references', async () => {
    const orders = await generator.generate(10);

    const companyIds = new Set(companies.map((c) => c.id));
    const productIds = new Set(products.map((p) => p.id));

    for (const order of orders) {
      expect(companyIds.has(order.companyId)).toBe(true);
      expect(order.items.length).toBeGreaterThan(0);

      for (const item of order.items) {
        expect(productIds.has(item.productId)).toBe(true);
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.price).toBeGreaterThan(0);
      }
    }
  });

  it('generates orders with correct totals', async () => {
    const orders = await generator.generate(5);

    for (const order of orders) {
      const calculatedSubtotal = order.items.reduce(
        (sum, item) => sum + item.price * item.quantity - (item.discountValue ?? 0),
        0
      );

      // Subtotal should be close to calculated (accounting for rounding)
      expect(Math.abs(order.subtotal - calculatedSubtotal)).toBeLessThan(1);
    }
  });

  it('generates status history for orders', async () => {
    const orders = await generator.generate(10);

    for (const order of orders) {
      expect(order.statusHistory).toBeDefined();
      expect(order.statusHistory!.length).toBeGreaterThan(0);
      expect(order.statusHistory![0].status).toBe('Pending');
    }
  });
});

describe('ScenarioManager', () => {
  it('loads built-in scenarios', () => {
    const manager = getScenarioManager();
    const scenarios = manager.listScenarios();

    expect(scenarios).toContain('normal-ops');
    expect(scenarios).toContain('peak-season');
    expect(scenarios).toContain('anomaly-heavy');
    expect(scenarios).toContain('warehouse-outage');
  });

  it('validates scenario profiles', () => {
    const manager = getScenarioManager();
    const scenario = manager.loadScenario('normal-ops');
    const validation = manager.validateScenario(scenario);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('throws for unknown scenarios', () => {
    const manager = getScenarioManager();

    expect(() => manager.loadScenario('nonexistent')).toThrow();
  });

  it('creates custom scenarios from base', () => {
    const manager = getScenarioManager();
    const custom = manager.createCustomScenario('normal-ops', 'custom-test', {
      anomalyRate: 0.25,
      description: 'Custom test scenario',
    });

    expect(custom.name).toBe('custom-test');
    expect(custom.anomalyRate).toBe(0.25);
    expect(custom.entityRates).toBeDefined();
  });
});

describe('SafetyGuard', () => {
  let guard: SafetyGuard;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, MOCK_DATA_ENABLED: 'true', NODE_ENV: 'test' };
    guard = new SafetyGuard();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('checks environment correctly', () => {
    const result = guard.checkEnvironment();
    expect(result).toBe(true);
  });

  it('validates schema isolation', () => {
    const result = guard.validateSchemaIsolation('mock_data');
    expect(result).toBe(true);

    const invalidResult = guard.validateSchemaIsolation('public');
    expect(invalidResult).toBe(false);
  });

  it('validates record limits', () => {
    const result = guard.validateRecordLimit('users', 1000);
    expect(result).toBe(true);

    const invalidResult = guard.validateRecordLimit('users', 1000001);
    expect(invalidResult).toBe(false);
  });
});

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker('test-job-123', { users: 100, companies: 50 });
  });

  it('tracks progress correctly', () => {
    tracker.start();
    tracker.startEntity('users', 1);
    tracker.completeBatch('users', 50);
    tracker.completeBatch('users', 50);
    tracker.completeEntity('users');

    const progress = tracker.getProgress();

    expect(progress.status).toBe('generating');
    expect(progress.recordsGenerated.users).toBe(100);
    expect(progress.progressPercent).toBeGreaterThan(0);
  });

  it('emits progress events', () => {
    const events: string[] = [];
    tracker.addListener((progress, event) => {
      events.push(event.type);
    });

    tracker.start();
    tracker.startEntity('users', 1);
    tracker.completeBatch('users', 10);

    expect(events).toContain('started');
    expect(events).toContain('entity_started');
    expect(events).toContain('batch_completed');
  });

  it('calculates estimated time remaining', () => {
    tracker.start();
    tracker.startEntity('users', 10);

    for (let i = 0; i < 5; i++) {
      tracker.completeBatch('users', 10);
    }

    const progress = tracker.getProgress();
    expect(progress.estimatedTimeRemaining).toBeDefined();
  });
});

describe('DistributionUtils', () => {
  let utils: DistributionUtils;

  beforeEach(() => {
    utils = new DistributionUtils(12345);
  });

  it('generates Zipf distribution correctly', () => {
    const items = ['A', 'B', 'C', 'D', 'E'];
    const counts: Record<string, number> = {};

    for (let i = 0; i < 1000; i++) {
      const item = utils.zipfDistribution(items);
      counts[item] = (counts[item] ?? 0) + 1;
    }

    // First item should be selected most frequently
    expect(counts['A']).toBeGreaterThan(counts['E']);
  });

  it('generates normal distribution within expected range', () => {
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(utils.normalDistribution(100, 15));
    }

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const stdDev = Math.sqrt(
      samples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / samples.length
    );

    // Mean should be close to 100
    expect(Math.abs(mean - 100)).toBeLessThan(5);
    // StdDev should be close to 15
    expect(Math.abs(stdDev - 15)).toBeLessThan(3);
  });

  it('selects from weighted distribution', () => {
    const distribution = {
      high: 0.7,
      medium: 0.2,
      low: 0.1,
    };

    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };

    for (let i = 0; i < 1000; i++) {
      const selected = utils.selectFromDistribution(distribution);
      counts[selected]++;
    }

    // High should be selected most frequently (~70%)
    expect(counts.high).toBeGreaterThan(500);
    expect(counts.low).toBeLessThan(200);
  });
});
