/**
 * Base Generator Engine
 *
 * Abstract base class for all entity generators, providing common functionality
 * for data generation, distribution application, and anomaly injection.
 */

import { Faker } from '@faker-js/faker';
import seedrandom from 'seedrandom';
import type { MockGeneratorConfig, ScenarioProfile, AnomalyType } from '../types';

/**
 * Abstract base class for entity generators
 */
export abstract class BaseGenerator<T> {
  protected config: MockGeneratorConfig;
  protected scenario: ScenarioProfile;
  protected faker: Faker;
  protected rng: seedrandom.PRNG;
  protected batchId: string;

  constructor(config: MockGeneratorConfig, scenario: ScenarioProfile, faker: Faker) {
    this.config = config;
    this.scenario = scenario;
    this.faker = faker;
    this.rng = seedrandom(config.seed?.toString() ?? Date.now().toString());
    this.batchId = this.generateBatchId();
  }

  /**
   * Generate a batch ID for tracking
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Abstract method to generate entities - must be implemented by subclasses
   */
  abstract generate(count: number): Promise<T[]>;

  /**
   * Get the entity name for logging
   */
  abstract getEntityName(): string;

  /**
   * Apply a distribution to select items from a weighted map
   */
  protected selectFromDistribution<K extends string>(
    distribution: Record<K, number>
  ): K {
    const random = this.rng();
    let cumulative = 0;

    for (const [key, weight] of Object.entries(distribution) as [K, number][]) {
      cumulative += weight;
      if (random <= cumulative) {
        return key;
      }
    }

    // Fallback to first key
    return Object.keys(distribution)[0] as K;
  }

  /**
   * Apply Zipf distribution (power law) for popularity-based selection
   * @param items Array of items to distribute
   * @param alpha Zipf exponent (higher = more skewed, typically 1.0-2.0)
   */
  protected applyZipfDistribution<I>(items: I[], alpha: number = 1.07): I {
    const n = items.length;
    if (n === 0) {
      throw new Error('Cannot apply Zipf distribution to empty array');
    }

    // Calculate harmonic number for normalization
    let harmonicN = 0;
    for (let k = 1; k <= n; k++) {
      harmonicN += 1 / Math.pow(k, alpha);
    }

    // Generate random value and find corresponding rank
    const random = this.rng();
    let cumulative = 0;

    for (let k = 1; k <= n; k++) {
      cumulative += (1 / Math.pow(k, alpha)) / harmonicN;
      if (random <= cumulative) {
        return items[k - 1];
      }
    }

    return items[0];
  }

  /**
   * Apply normal/Gaussian distribution
   */
  protected normalDistribution(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = this.rng();
    const u2 = this.rng();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Apply uniform distribution within a range
   */
  protected uniformDistribution(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  /**
   * Apply Poisson distribution for event counts
   */
  protected poissonDistribution(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;

    do {
      k++;
      p *= this.rng();
    } while (p > L);

    return k - 1;
  }

  /**
   * Apply exponential distribution for inter-arrival times
   */
  protected exponentialDistribution(lambda: number): number {
    return -Math.log(1 - this.rng()) / lambda;
  }

  /**
   * Inject anomalies into generated items
   */
  protected injectAnomalies<I>(
    items: I[],
    anomalyHandler: (item: I, anomalyType: AnomalyType) => I
  ): I[] {
    const anomalyRate = this.scenario.anomalyRate;
    const anomalyTypes = this.scenario.anomalyConfig?.types ?? [
      'payment_delay',
      'delivery_delay',
    ];

    return items.map((item) => {
      if (this.rng() < anomalyRate) {
        const anomalyType = anomalyTypes[
          Math.floor(this.rng() * anomalyTypes.length)
        ];
        return anomalyHandler(item, anomalyType);
      }
      return item;
    });
  }

  /**
   * Generate a random date within the config time window
   */
  protected randomDateInRange(): Date {
    const start = new Date(this.config.startDate).getTime();
    const end = new Date(this.config.endDate).getTime();
    return new Date(start + this.rng() * (end - start));
  }

  /**
   * Generate a date with business hour constraints (8 AM - 8 PM)
   */
  protected randomBusinessHourDate(): Date {
    const date = this.randomDateInRange();
    const hour = 8 + Math.floor(this.rng() * 12); // 8 AM - 8 PM
    const minute = Math.floor(this.rng() * 60);
    date.setHours(hour, minute, 0, 0);
    return date;
  }

  /**
   * Generate a UUID-like ID
   */
  protected generateId(): string {
    return this.faker.string.uuid();
  }

  /**
   * Generate metadata for tracking generated records
   */
  protected generateMetadata(): {
    generatedAt: string;
    seed: number;
    batchId: string;
  } {
    return {
      generatedAt: new Date().toISOString(),
      seed: this.config.seed ?? 0,
      batchId: this.batchId,
    };
  }

  /**
   * Shuffle an array using the seeded RNG
   */
  protected shuffleArray<I>(array: I[]): I[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Pick random items from an array
   */
  protected pickRandom<I>(array: I[], count: number): I[] {
    if (count >= array.length) {
      return [...array];
    }
    const shuffled = this.shuffleArray(array);
    return shuffled.slice(0, count);
  }

  /**
   * Pick a single random item from an array
   */
  protected pickOne<I>(array: I[]): I {
    return array[Math.floor(this.rng() * array.length)];
  }

  /**
   * Generate a value within a range with optional skew
   */
  protected generateInRange(min: number, max: number, skew: 'low' | 'mid' | 'high' = 'mid'): number {
    const random = this.rng();
    let skewed: number;

    switch (skew) {
      case 'low':
        skewed = Math.pow(random, 2); // Biased toward lower values
        break;
      case 'high':
        skewed = 1 - Math.pow(1 - random, 2); // Biased toward higher values
        break;
      default:
        skewed = random; // Uniform
    }

    return min + skewed * (max - min);
  }

  /**
   * Round a number to a specific precision
   */
  protected round(value: number, precision: number = 2): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Validate referential integrity for generated items
   */
  protected validateReferentialIntegrity(
    items: T[],
    references: Map<string, Set<string>>
  ): { valid: boolean; errors: string[] } {
    // This is a placeholder - subclasses should implement specific validation
    return { valid: true, errors: [] };
  }

  /**
   * Log generation progress
   */
  protected logProgress(generated: number, total: number): void {
    const percent = Math.round((generated / total) * 100);
    if (generated % 1000 === 0 || generated === total) {
      console.log(
        `[${this.getEntityName()}] Generated ${generated}/${total} (${percent}%)`
      );
    }
  }
}
