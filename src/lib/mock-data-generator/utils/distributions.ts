/**
 * Distribution Utilities
 *
 * Statistical distribution functions for realistic data generation
 * including Zipf, normal, Poisson, and exponential distributions.
 */

import seedrandom from 'seedrandom';

export class DistributionUtils {
  private rng: seedrandom.PRNG;

  constructor(seed?: number) {
    this.rng = seedrandom(seed?.toString() ?? Date.now().toString());
  }

  /**
   * Apply Zipf distribution (power law) for popularity-based selection
   * Top 20% of items account for ~80% of selections (Pareto principle)
   *
   * @param items Array of items to distribute
   * @param alpha Zipf exponent (higher = more skewed, typically 1.0-2.0)
   * @returns Selected item from the distribution
   */
  zipfDistribution<T>(items: T[], alpha: number = 1.07): T {
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
   * Apply weights to items based on Zipf distribution
   * Returns array of weights (summing to 1) for each item position
   */
  zipfWeights(count: number, alpha: number = 1.07): number[] {
    let harmonicN = 0;
    for (let k = 1; k <= count; k++) {
      harmonicN += 1 / Math.pow(k, alpha);
    }

    const weights: number[] = [];
    for (let k = 1; k <= count; k++) {
      weights.push((1 / Math.pow(k, alpha)) / harmonicN);
    }

    return weights;
  }

  /**
   * Normal (Gaussian) distribution using Box-Muller transform
   *
   * @param mean Mean of the distribution
   * @param stdDev Standard deviation
   * @returns Random value from normal distribution
   */
  normalDistribution(mean: number, stdDev: number): number {
    const u1 = this.rng();
    const u2 = this.rng();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Truncated normal distribution (bounded between min and max)
   */
  truncatedNormal(mean: number, stdDev: number, min: number, max: number): number {
    let value: number;
    do {
      value = this.normalDistribution(mean, stdDev);
    } while (value < min || value > max);
    return value;
  }

  /**
   * Poisson distribution for event counts
   *
   * @param lambda Average number of events
   * @returns Random count from Poisson distribution
   */
  poissonDistribution(lambda: number): number {
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
   * Exponential distribution for inter-arrival times
   *
   * @param lambda Rate parameter (1/mean)
   * @returns Random value from exponential distribution
   */
  exponentialDistribution(lambda: number): number {
    return -Math.log(1 - this.rng()) / lambda;
  }

  /**
   * Uniform distribution within a range
   */
  uniformDistribution(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  /**
   * Uniform integer distribution within a range (inclusive)
   */
  uniformInt(min: number, max: number): number {
    return Math.floor(min + this.rng() * (max - min + 1));
  }

  /**
   * Weighted random selection from a distribution map
   */
  selectFromDistribution<K extends string>(distribution: Record<K, number>): K {
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
   * Beta distribution for modeling probabilities
   */
  betaDistribution(alpha: number, beta: number): number {
    // Using the Gamma distribution method
    const gamma1 = this.gammaDistribution(alpha, 1);
    const gamma2 = this.gammaDistribution(beta, 1);
    return gamma1 / (gamma1 + gamma2);
  }

  /**
   * Gamma distribution (helper for beta distribution)
   */
  private gammaDistribution(shape: number, scale: number): number {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.gammaDistribution(shape + 1, scale) * Math.pow(this.rng(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.normalDistribution(0, 1);
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = this.rng();

      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v * scale;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }

  /**
   * Triangular distribution (useful for estimates)
   */
  triangularDistribution(min: number, mode: number, max: number): number {
    const u = this.rng();
    const f = (mode - min) / (max - min);

    if (u < f) {
      return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
  }

  /**
   * Log-normal distribution (useful for financial data)
   */
  logNormalDistribution(meanLog: number, stdDevLog: number): number {
    return Math.exp(this.normalDistribution(meanLog, stdDevLog));
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Pick random items from array without replacement
   */
  pickRandom<T>(array: T[], count: number): T[] {
    if (count >= array.length) {
      return this.shuffleArray(array);
    }
    return this.shuffleArray(array).slice(0, count);
  }

  /**
   * Pick single random item from array
   */
  pickOne<T>(array: T[]): T {
    return array[Math.floor(this.rng() * array.length)];
  }

  /**
   * Generate samples from a distribution
   */
  generateSamples(
    distribution: 'normal' | 'poisson' | 'exponential' | 'uniform',
    count: number,
    params: { mean?: number; stdDev?: number; lambda?: number; min?: number; max?: number }
  ): number[] {
    const samples: number[] = [];

    for (let i = 0; i < count; i++) {
      switch (distribution) {
        case 'normal':
          samples.push(this.normalDistribution(params.mean ?? 0, params.stdDev ?? 1));
          break;
        case 'poisson':
          samples.push(this.poissonDistribution(params.lambda ?? 1));
          break;
        case 'exponential':
          samples.push(this.exponentialDistribution(params.lambda ?? 1));
          break;
        case 'uniform':
          samples.push(this.uniformDistribution(params.min ?? 0, params.max ?? 1));
          break;
      }
    }

    return samples;
  }
}
