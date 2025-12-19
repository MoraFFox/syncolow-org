/**
 * Date Distributor Utility
 *
 * Distributes events across time periods using realistic patterns,
 * business hour constraints, and delivery schedules.
 */

import {
  addDays,
  addMinutes,
  isSameDay,
  getDay,
  setHours,
  setMinutes,
  differenceInMinutes,
} from 'date-fns';
import seedrandom from 'seedrandom';

/**
 * Delivery schedule configuration
 */
export interface DeliverySchedule {
  /** Region A delivery days (0=Sunday, 6=Saturday) */
  regionA: number[];
  /** Region B delivery days */
  regionB: number[];
}

/**
 * Default Egyptian delivery schedule
 */
const DEFAULT_DELIVERY_SCHEDULE: DeliverySchedule = {
  regionA: [0, 2, 4], // Sunday, Tuesday, Thursday
  regionB: [1, 3, 6], // Monday, Wednesday, Saturday
};

/**
 * Business hours configuration
 */
export interface BusinessHours {
  start: number; // 0-23
  end: number; // 0-23
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  start: 8,
  end: 20,
};

export class DateDistributor {
  private rng: seedrandom.PRNG;
  private deliverySchedule: DeliverySchedule;
  private businessHours: BusinessHours;

  constructor(
    seed?: number,
    deliverySchedule?: DeliverySchedule,
    businessHours?: BusinessHours
  ) {
    this.rng = seedrandom(seed?.toString() ?? Date.now().toString());
    this.deliverySchedule = deliverySchedule ?? DEFAULT_DELIVERY_SCHEDULE;
    this.businessHours = businessHours ?? DEFAULT_BUSINESS_HOURS;
  }

  /**
   * Distribute a count of events evenly across a date range
   */
  distributeEvenly(startDate: Date, endDate: Date, count: number): Date[] {
    const dates: Date[] = [];
    const totalMs = endDate.getTime() - startDate.getTime();
    const intervalMs = totalMs / count;

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startDate.getTime() + intervalMs * i);
      dates.push(this.applyBusinessHours(timestamp));
    }

    return dates;
  }

  /**
   * Distribute events with jitter (randomness) within business hours
   */
  distributeWithJitter(
    startDate: Date,
    endDate: Date,
    count: number,
    jitterPercent: number = 0.2
  ): Date[] {
    const dates: Date[] = [];
    const totalMs = endDate.getTime() - startDate.getTime();
    const intervalMs = totalMs / count;
    const maxJitterMs = intervalMs * jitterPercent;

    for (let i = 0; i < count; i++) {
      const baseTimestamp = startDate.getTime() + intervalMs * i;
      const jitter = (this.rng() - 0.5) * 2 * maxJitterMs;
      const timestamp = new Date(baseTimestamp + jitter);
      dates.push(this.applyBusinessHours(timestamp));
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Get the next delivery date for a region
   */
  getNextDeliveryDate(fromDate: Date, region: 'A' | 'B'): Date {
    const deliveryDays =
      region === 'A' ? this.deliverySchedule.regionA : this.deliverySchedule.regionB;

    let checkDate = addDays(fromDate, 1);

    for (let i = 0; i < 7; i++) {
      const dayOfWeek = getDay(checkDate);
      if (deliveryDays.includes(dayOfWeek)) {
        return this.setToBusinessHours(checkDate);
      }
      checkDate = addDays(checkDate, 1);
    }

    // Fallback - should not reach here
    return addDays(fromDate, 2);
  }

  /**
   * Check if a date is a delivery day for a region
   */
  isDeliveryDay(date: Date, region: 'A' | 'B'): boolean {
    const deliveryDays =
      region === 'A' ? this.deliverySchedule.regionA : this.deliverySchedule.regionB;
    return deliveryDays.includes(getDay(date));
  }

  /**
   * Generate dates only on delivery days
   */
  generateDeliveryDates(
    startDate: Date,
    endDate: Date,
    count: number,
    region: 'A' | 'B'
  ): Date[] {
    const dates: Date[] = [];
    const deliveryDays: Date[] = [];

    // First, collect all delivery days in range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (this.isDeliveryDay(currentDate, region)) {
        deliveryDays.push(new Date(currentDate));
      }
      currentDate = addDays(currentDate, 1);
    }

    if (deliveryDays.length === 0) {
      return [this.getNextDeliveryDate(startDate, region)];
    }

    // Distribute count across delivery days
    const perDay = Math.ceil(count / deliveryDays.length);

    for (const day of deliveryDays) {
      const dayCount = Math.min(perDay, count - dates.length);
      for (let i = 0; i < dayCount; i++) {
        const timestamp = this.generateTimeWithinBusinessHours(day);
        dates.push(timestamp);
      }
      if (dates.length >= count) break;
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Apply business hours constraint to a timestamp
   */
  private applyBusinessHours(date: Date): Date {
    let result = new Date(date);
    const hour = result.getHours();

    if (hour < this.businessHours.start) {
      result = setHours(result, this.businessHours.start);
      result = setMinutes(result, Math.floor(this.rng() * 60));
    } else if (hour >= this.businessHours.end) {
      // Move to next day's business hours
      result = addDays(result, 1);
      result = setHours(result, this.businessHours.start);
      result = setMinutes(result, Math.floor(this.rng() * 60));
    }

    return result;
  }

  /**
   * Set a date to a random time within business hours
   */
  private setToBusinessHours(date: Date): Date {
    return this.generateTimeWithinBusinessHours(date);
  }

  /**
   * Generate a random time within business hours for a given day
   */
  private generateTimeWithinBusinessHours(date: Date): Date {
    const start = this.businessHours.start;
    const end = this.businessHours.end;
    const hourRange = end - start;

    const hour = start + Math.floor(this.rng() * hourRange);
    const minute = Math.floor(this.rng() * 60);
    const second = Math.floor(this.rng() * 60);

    let result = new Date(date);
    result = setHours(result, hour);
    result = setMinutes(result, minute);
    result.setSeconds(second);

    return result;
  }

  /**
   * Generate timestamps with Poisson-like inter-arrival times
   */
  generatePoissonTimestamps(
    startDate: Date,
    endDate: Date,
    averagePerHour: number
  ): Date[] {
    const dates: Date[] = [];
    const totalHours = differenceInMinutes(endDate, startDate) / 60;
    const expectedCount = Math.floor(totalHours * averagePerHour);

    let currentTime = new Date(startDate);

    for (let i = 0; i < expectedCount * 2 && currentTime < endDate; i++) {
      // Exponential inter-arrival time
      const lambda = averagePerHour / 60; // per minute
      const interArrival = -Math.log(1 - this.rng()) / lambda;
      currentTime = addMinutes(currentTime, interArrival);

      if (currentTime <= endDate) {
        const adjusted = this.applyBusinessHours(currentTime);
        dates.push(adjusted);
      }
    }

    return dates.slice(0, expectedCount);
  }

  /**
   * Group dates by day
   */
  groupByDay(dates: Date[]): Map<string, Date[]> {
    const groups = new Map<string, Date[]>();

    for (const date of dates) {
      const key = date.toISOString().split('T')[0];
      const existing = groups.get(key) ?? [];
      existing.push(date);
      groups.set(key, existing);
    }

    return groups;
  }

  /**
   * Get the delivery schedule
   */
  getDeliverySchedule(): DeliverySchedule {
    return { ...this.deliverySchedule };
  }

  /**
   * Get business hours
   */
  getBusinessHours(): BusinessHours {
    return { ...this.businessHours };
  }
}
