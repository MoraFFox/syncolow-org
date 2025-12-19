/**
 * Time Series Engine
 *
 * Distributes generated events across time periods with realistic patterns,
 * supporting daily/weekly patterns, seasonal variations, and temporal anomalies.
 */

import {
  addDays,
  addHours,
  differenceInDays,
  isWeekend,
  getDay,
  getHours,
  setHours,
  setMinutes,
} from 'date-fns';
import seedrandom from 'seedrandom';
import type { MockGeneratorConfig, AnomalyConfig, AnomalyType } from './types';

/**
 * Time distribution pattern
 */
export type TimePattern = 'even' | 'business_hours' | 'weighted_weekdays' | 'seasonal';

/**
 * Event with timestamp
 */
export interface TimedEvent<T> {
  data: T;
  timestamp: Date;
}

/**
 * Time series configuration
 */
export interface TimeSeriesConfig {
  /** Distribution pattern */
  pattern: TimePattern;
  /** Business hours start (0-23) */
  businessHoursStart?: number;
  /** Business hours end (0-23) */
  businessHoursEnd?: number;
  /** Weekend multiplier (0-1, 0 = no weekend activity) */
  weekendMultiplier?: number;
  /** Seasonal peak months (1-12) */
  peakMonths?: number[];
  /** Seasonal peak multiplier */
  peakMultiplier?: number;
}

/**
 * Default time series configuration
 */
const DEFAULT_CONFIG: TimeSeriesConfig = {
  pattern: 'business_hours',
  businessHoursStart: 8,
  businessHoursEnd: 20,
  weekendMultiplier: 0.3,
  peakMonths: [11, 12, 1], // Nov, Dec, Jan
  peakMultiplier: 1.5,
};

export class TimeSeriesEngine {
  private config: MockGeneratorConfig;
  private timeConfig: TimeSeriesConfig;
  private rng: seedrandom.PRNG;

  constructor(
    config: MockGeneratorConfig,
    timeConfig: Partial<TimeSeriesConfig> = {}
  ) {
    this.config = config;
    this.timeConfig = { ...DEFAULT_CONFIG, ...timeConfig };
    this.rng = seedrandom(config.seed?.toString() ?? Date.now().toString());
  }

  /**
   * Generate a time series of events distributed over the config date range
   */
  async generateTimeSeries<T>(
    generateFn: (timestamp: Date) => T,
    totalCount: number
  ): Promise<TimedEvent<T>[]> {
    const startDate = new Date(this.config.startDate);
    const endDate = new Date(this.config.endDate);
    const days = differenceInDays(endDate, startDate);

    if (days <= 0) {
      throw new Error('End date must be after start date');
    }

    // Calculate daily counts with pattern adjustments
    const dailyCounts = this.calculateDailyCounts(startDate, days, totalCount);

    const events: TimedEvent<T>[] = [];

    for (let day = 0; day < days; day++) {
      const currentDate = addDays(startDate, day);
      const countForDay = dailyCounts[day];

      for (let i = 0; i < countForDay; i++) {
        const timestamp = this.generateTimestampForDay(currentDate);
        const data = generateFn(timestamp);
        events.push({ data, timestamp });
      }
    }

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return events;
  }

  /**
   * Distribute existing events over the time range
   */
  distributeEventsOverTime<T>(events: T[], startDate: Date, endDate: Date): TimedEvent<T>[] {
    const days = differenceInDays(endDate, startDate);
    const dailyCounts = this.calculateDailyCounts(startDate, days, events.length);

    const timedEvents: TimedEvent<T>[] = [];
    let eventIndex = 0;

    for (let day = 0; day < days && eventIndex < events.length; day++) {
      const currentDate = addDays(startDate, day);
      const countForDay = dailyCounts[day];

      for (let i = 0; i < countForDay && eventIndex < events.length; i++) {
        const timestamp = this.generateTimestampForDay(currentDate);
        timedEvents.push({ data: events[eventIndex], timestamp });
        eventIndex++;
      }
    }

    return timedEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate event counts for each day
   */
  private calculateDailyCounts(startDate: Date, days: number, totalCount: number): number[] {
    const weights: number[] = [];

    for (let day = 0; day < days; day++) {
      const currentDate = addDays(startDate, day);
      let weight = 1;

      // Apply weekend multiplier
      if (isWeekend(currentDate)) {
        weight *= this.timeConfig.weekendMultiplier ?? 0.3;
      }

      // Apply seasonal multiplier
      const month = currentDate.getMonth() + 1;
      if (this.timeConfig.peakMonths?.includes(month)) {
        weight *= this.timeConfig.peakMultiplier ?? 1.5;
      }

      // Add some randomness
      weight *= 0.7 + this.rng() * 0.6; // 70% to 130%

      weights.push(weight);
    }

    // Normalize weights to sum to totalCount
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const counts = weights.map((w) => Math.round((w / totalWeight) * totalCount));

    // Adjust for rounding errors
    const actualTotal = counts.reduce((a, b) => a + b, 0);
    if (actualTotal !== totalCount) {
      const diff = totalCount - actualTotal;
      // Add/remove from the day with highest weight
      const maxIdx = weights.indexOf(Math.max(...weights));
      counts[maxIdx] += diff;
    }

    return counts;
  }

  /**
   * Generate a timestamp within a specific day
   */
  private generateTimestampForDay(date: Date): Date {
    const start = this.timeConfig.businessHoursStart ?? 8;
    const end = this.timeConfig.businessHoursEnd ?? 20;

    // Generate hour within business hours
    const hour = start + Math.floor(this.rng() * (end - start));
    const minute = Math.floor(this.rng() * 60);
    const second = Math.floor(this.rng() * 60);

    let timestamp = new Date(date);
    timestamp = setHours(timestamp, hour);
    timestamp = setMinutes(timestamp, minute);
    timestamp.setSeconds(second);

    return timestamp;
  }

  /**
   * Inject temporal anomalies into events
   */
  injectTemporalAnomalies<T>(
    events: TimedEvent<T>[],
    anomalyConfig: AnomalyConfig,
    anomalyHandler: (event: T, anomalyType: AnomalyType) => T
  ): TimedEvent<T>[] {
    const anomalyRate = anomalyConfig.rate;
    const anomalyTypes = anomalyConfig.types ?? ['delivery_delay', 'payment_delay'];
    const clustering = anomalyConfig.clustering ?? 'spread';

    if (clustering === 'burst') {
      // Inject anomalies in bursts (consecutive events)
      return this.injectBurstAnomalies(events, anomalyRate, anomalyTypes, anomalyHandler);
    } else {
      // Spread anomalies evenly
      return this.injectSpreadAnomalies(events, anomalyRate, anomalyTypes, anomalyHandler);
    }
  }

  /**
   * Inject anomalies spread evenly across events
   */
  private injectSpreadAnomalies<T>(
    events: TimedEvent<T>[],
    rate: number,
    types: AnomalyType[],
    handler: (event: T, type: AnomalyType) => T
  ): TimedEvent<T>[] {
    return events.map((event) => {
      if (this.rng() < rate) {
        const anomalyType = types[Math.floor(this.rng() * types.length)];
        return {
          ...event,
          data: handler(event.data, anomalyType),
        };
      }
      return event;
    });
  }

  /**
   * Inject anomalies in bursts
   */
  private injectBurstAnomalies<T>(
    events: TimedEvent<T>[],
    rate: number,
    types: AnomalyType[],
    handler: (event: T, type: AnomalyType) => T
  ): TimedEvent<T>[] {
    const result = [...events];
    const totalAnomalies = Math.floor(events.length * rate);
    const burstCount = Math.max(1, Math.floor(totalAnomalies / 10)); // ~10 anomalies per burst
    const anomaliesPerBurst = Math.ceil(totalAnomalies / burstCount);

    for (let burst = 0; burst < burstCount; burst++) {
      // Pick a random starting point
      const startIdx = Math.floor(this.rng() * (events.length - anomaliesPerBurst));

      for (let i = 0; i < anomaliesPerBurst && startIdx + i < events.length; i++) {
        const idx = startIdx + i;
        const anomalyType = types[Math.floor(this.rng() * types.length)];
        result[idx] = {
          ...result[idx],
          data: handler(result[idx].data, anomalyType),
        };
      }
    }

    return result;
  }

  /**
   * Calculate time acceleration ratio
   * Maps real duration to simulated duration
   */
  accelerateTime(realDurationMs: number, simulatedDurationMs: number): number {
    return simulatedDurationMs / realDurationMs;
  }

  /**
   * Generate inter-arrival times using exponential distribution
   */
  generateInterArrivalTimes(count: number, averageRatePerHour: number): number[] {
    const lambda = averageRatePerHour / 3600000; // Convert to per millisecond
    const times: number[] = [];

    for (let i = 0; i < count; i++) {
      // Exponential distribution
      const interArrival = -Math.log(1 - this.rng()) / lambda;
      times.push(interArrival);
    }

    return times;
  }

  /**
   * Get day-of-week distribution weights
   */
  getDayOfWeekWeights(): number[] {
    // Sunday=0 to Saturday=6
    // Higher weights for weekdays
    return [0.3, 1.0, 1.0, 1.0, 1.0, 0.9, 0.4];
  }

  /**
   * Get hour-of-day distribution weights
   */
  getHourOfDayWeights(): number[] {
    // 0-23 hours, higher weights during business hours
    const weights: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      if (hour < 6) {
        weights.push(0.05); // Early morning
      } else if (hour < 9) {
        weights.push(0.5); // Morning ramp-up
      } else if (hour < 12) {
        weights.push(1.0); // Morning peak
      } else if (hour < 14) {
        weights.push(0.7); // Lunch dip
      } else if (hour < 17) {
        weights.push(1.0); // Afternoon peak
      } else if (hour < 20) {
        weights.push(0.6); // Evening wind-down
      } else {
        weights.push(0.1); // Night
      }
    }
    return weights;
  }
}
