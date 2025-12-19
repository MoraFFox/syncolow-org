/**
 * Scenario Manager
 *
 * Loads and validates scenario profiles from YAML files
 * and manages scenario configuration.
 */

import { ScenarioProfileSchema } from '../config/schemas';
import type { ScenarioProfile, EntityVolume, DistributionConfig } from '../types';

/**
 * Default entity rates
 */
const DEFAULT_ENTITY_RATES: EntityVolume = {
  users: 20,
  companies: 100,
  branchRatio: 0.3,
  products: 200,
  ordersPerDay: 50,
  maintenanceVisitsPerWeek: 10,
};

/**
 * Default distribution config
 */
const DEFAULT_DISTRIBUTIONS: DistributionConfig = {
  orderStatus: {
    Pending: 0.1,
    Processing: 0,
    Shipped: 0.15,
    Delivered: 0.7,
    Cancelled: 0.05,
    'Delivery Failed': 0,
  },
  paymentStatus: {
    Paid: 0.8,
    Pending: 0.15,
    Overdue: 0.05,
  },
  productPopularity: 'zipf',
  regionDistribution: {
    A: 0.6,
    B: 0.4,
  },
  deliveryDelays: 0.1,
};

/**
 * Built-in scenario profiles
 */
const BUILT_IN_SCENARIOS: Record<string, ScenarioProfile> = {
  'normal-ops': {
    name: 'normal-ops',
    description: 'Standard business operations with typical patterns',
    entityRates: DEFAULT_ENTITY_RATES,
    distributions: DEFAULT_DISTRIBUTIONS,
    anomalyRate: 0.05,
  },
  'peak-season': {
    name: 'peak-season',
    description: 'High-volume holiday/peak season simulation',
    entityRates: {
      ...DEFAULT_ENTITY_RATES,
      ordersPerDay: 150,
      maintenanceVisitsPerWeek: 25,
    },
    distributions: {
      ...DEFAULT_DISTRIBUTIONS,
      paymentStatus: {
        Paid: 0.6,
        Pending: 0.3,
        Overdue: 0.1,
      },
    },
    anomalyRate: 0.15,
  },
  'anomaly-heavy': {
    name: 'anomaly-heavy',
    description: 'Stress testing with high anomaly rate',
    entityRates: DEFAULT_ENTITY_RATES,
    distributions: {
      ...DEFAULT_DISTRIBUTIONS,
      paymentStatus: {
        Paid: 0.4,
        Pending: 0.3,
        Overdue: 0.3,
      },
      deliveryDelays: 0.3,
    },
    anomalyRate: 0.4,
    anomalyConfig: {
      rate: 0.4,
      types: ['payment_delay', 'delivery_delay', 'order_cancellation', 'maintenance_failure'],
      clustering: 'spread',
    },
  },
  'warehouse-outage': {
    name: 'warehouse-outage',
    description: 'Simulates warehouse disruption scenario',
    entityRates: {
      ...DEFAULT_ENTITY_RATES,
      ordersPerDay: 30,
    },
    distributions: {
      ...DEFAULT_DISTRIBUTIONS,
      orderStatus: {
        Pending: 0.5,
        Processing: 0.3,
        Shipped: 0.05,
        Delivered: 0.1,
        Cancelled: 0.05,
        'Delivery Failed': 0,
      },
      deliveryDelays: 0.7,
    },
    anomalyRate: 0.6,
    anomalyConfig: {
      rate: 0.6,
      types: ['delivery_delay', 'stock_shortage', 'order_cancellation'],
      clustering: 'burst',
    },
  },
  'growth-phase': {
    name: 'growth-phase',
    description: 'Rapid business growth with increasing orders',
    entityRates: {
      ...DEFAULT_ENTITY_RATES,
      companies: 200,
      ordersPerDay: 80,
      products: 300,
    },
    distributions: {
      ...DEFAULT_DISTRIBUTIONS,
      paymentStatus: {
        Paid: 0.75,
        Pending: 0.2,
        Overdue: 0.05,
      },
    },
    anomalyRate: 0.08,
  },
  'payment-crisis': {
    name: 'payment-crisis',
    description: 'High payment delays and overdue rates',
    entityRates: DEFAULT_ENTITY_RATES,
    distributions: {
      ...DEFAULT_DISTRIBUTIONS,
      paymentStatus: {
        Paid: 0.3,
        Pending: 0.4,
        Overdue: 0.3,
      },
    },
    anomalyRate: 0.25,
    anomalyConfig: {
      rate: 0.25,
      types: ['payment_delay'],
      clustering: 'spread',
    },
  },
};

export class ScenarioManager {
  private scenarios: Map<string, ScenarioProfile> = new Map();

  constructor() {
    // Load built-in scenarios
    for (const [name, scenario] of Object.entries(BUILT_IN_SCENARIOS)) {
      this.scenarios.set(name, scenario);
    }
  }

  /**
   * Load a scenario by name
   */
  loadScenario(name: string): ScenarioProfile {
    const scenario = this.scenarios.get(name);

    if (!scenario) {
      throw new Error(
        `Scenario "${name}" not found. Available: ${this.listScenarios().join(', ')}`
      );
    }

    return scenario;
  }

  /**
   * List available scenario names
   */
  listScenarios(): string[] {
    return Array.from(this.scenarios.keys());
  }

  /**
   * Get all scenarios with descriptions
   */
  listScenariosWithDescriptions(): Array<{ name: string; description: string }> {
    return Array.from(this.scenarios.values()).map((s) => ({
      name: s.name,
      description: s.description,
    }));
  }

  /**
   * Validate a scenario profile
   */
  validateScenario(profile: ScenarioProfile): { valid: boolean; errors: string[] } {
    const result = ScenarioProfileSchema.safeParse(profile);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  /**
   * Register a custom scenario
   */
  registerScenario(scenario: ScenarioProfile): void {
    const validation = this.validateScenario(scenario);

    if (!validation.valid) {
      throw new Error(`Invalid scenario: ${validation.errors.join('; ')}`);
    }

    this.scenarios.set(scenario.name, scenario);
  }

  /**
   * Create a custom scenario from a base scenario with overrides
   */
  createCustomScenario(
    baseName: string,
    customName: string,
    overrides: Partial<ScenarioProfile>
  ): ScenarioProfile {
    const base = this.loadScenario(baseName);

    const customScenario: ScenarioProfile = {
      ...base,
      ...overrides,
      name: customName,
      entityRates: {
        ...base.entityRates,
        ...overrides.entityRates,
      },
      distributions: {
        ...base.distributions,
        ...overrides.distributions,
      },
      anomalyConfig: base.anomalyConfig || overrides.anomalyConfig ? {
        rate: overrides.anomalyConfig?.rate ?? base.anomalyConfig?.rate ?? overrides.anomalyRate ?? base.anomalyRate,
        types: overrides.anomalyConfig?.types ?? base.anomalyConfig?.types,
        clustering: overrides.anomalyConfig?.clustering ?? base.anomalyConfig?.clustering,
      } : undefined,
    };

    this.registerScenario(customScenario);
    return customScenario;
  }

  /**
   * Get default entity rates
   */
  getDefaultEntityRates(): EntityVolume {
    return { ...DEFAULT_ENTITY_RATES };
  }

  /**
   * Get default distributions
   */
  getDefaultDistributions(): DistributionConfig {
    return { ...DEFAULT_DISTRIBUTIONS };
  }
}

/**
 * Singleton instance
 */
let scenarioManagerInstance: ScenarioManager | null = null;

export function getScenarioManager(): ScenarioManager {
  if (!scenarioManagerInstance) {
    scenarioManagerInstance = new ScenarioManager();
  }
  return scenarioManagerInstance;
}
