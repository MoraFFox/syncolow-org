/**
 * Shipment Generator Engine
 *
 * Generates shipment records with delivery attempts,
 * tracking statuses, and delivery delays based on scenario.
 */

import { Faker } from '@faker-js/faker';
import { addDays, addHours } from 'date-fns';
import { BaseGenerator } from './base-generator';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  MockOrder,
  Shipment,
  DeliveryAttempt,
} from '../types';

/**
 * Delivery failure reasons
 */
const FAILURE_REASONS = [
  'Customer not available',
  'Wrong address',
  'Access denied',
  'Weather conditions',
  'Vehicle breakdown',
  'Customer refused delivery',
  'Could not locate address',
  'Security restrictions',
];

/**
 * Driver names for shipments
 */
const DRIVER_NAMES = [
  'Ahmed Mohamed',
  'Mohamed Hassan',
  'Mahmoud Ali',
  'Ibrahim Salem',
  'Khaled Omar',
  'Youssef Ahmed',
  'Hassan Kamal',
  'Omar Farouk',
];

export class ShipmentGenerator extends BaseGenerator<Shipment> {
  private orders: MockOrder[] = [];

  constructor(
    config: MockGeneratorConfig,
    scenario: ScenarioProfile,
    faker: Faker,
    orders: MockOrder[]
  ) {
    super(config, scenario, faker);
    this.orders = orders;
  }

  getEntityName(): string {
    return 'shipments';
  }

  async generate(count: number): Promise<Shipment[]> {
    // Generate shipments for non-cancelled orders
    const eligibleOrders = this.orders.filter(
      (o) => o.status !== 'Cancelled' && o.status !== 'Pending'
    );

    const shipments: Shipment[] = [];

    for (const order of eligibleOrders) {
      const shipment = this.generateShipmentForOrder(order);
      shipments.push(shipment);

      if (shipments.length >= count) break;
    }

    return shipments;
  }

  /**
   * Generate shipment for an order
   */
  private generateShipmentForOrder(order: MockOrder): Shipment {
    const orderDate = new Date(order.orderDate);
    const scheduledDeliveryDate = order.deliveryDate
      ? new Date(order.deliveryDate)
      : addDays(orderDate, 2);

    // Determine shipment status based on order status
    const status = this.mapOrderStatusToShipmentStatus(order.status);

    // Generate delivery attempts
    const attempts = this.generateDeliveryAttempts(
      order.status,
      scheduledDeliveryDate
    );

    // Calculate actual delivery date
    let actualDeliveryDate: Date | undefined;
    if (status === 'delivered') {
      const successfulAttempt = attempts.find((a) => a.status === 'success');
      if (successfulAttempt) {
        actualDeliveryDate = new Date(successfulAttempt.attemptDate);
      }
    }

    // Apply delivery delays based on scenario
    const delayRate = this.scenario.distributions.deliveryDelays ?? 0.1;
    if (this.rng() < delayRate && actualDeliveryDate) {
      const delayDays = Math.floor(this.uniformDistribution(1, 5));
      actualDeliveryDate = addDays(actualDeliveryDate, delayDays);
    }

    const shipment: Shipment = {
      id: this.generateId(),
      orderId: order.id,
      status,
      scheduledDeliveryDate: scheduledDeliveryDate.toISOString(),
      actualDeliveryDate: actualDeliveryDate?.toISOString(),
      attempts,
      driverName: this.pickOne(DRIVER_NAMES),
      vehicleId: `VH-${Math.floor(this.rng() * 100).toString().padStart(3, '0')}`,
      notes: this.rng() > 0.7 ? this.faker.lorem.sentence() : undefined,
      createdAt: orderDate.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return shipment;
  }

  /**
   * Map order status to shipment status
   */
  private mapOrderStatusToShipmentStatus(
    orderStatus: MockOrder['status']
  ): Shipment['status'] {
    switch (orderStatus) {
      case 'Processing':
        return 'pending';
      case 'Shipped':
        return 'in_transit';
      case 'Delivered':
        return 'delivered';
      case 'Delivery Failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Generate delivery attempts
   */
  private generateDeliveryAttempts(
    orderStatus: MockOrder['status'],
    scheduledDate: Date
  ): DeliveryAttempt[] {
    const attempts: DeliveryAttempt[] = [];

    if (orderStatus === 'Processing' || orderStatus === 'Pending') {
      return attempts; // No attempts yet
    }

    // First attempt
    const firstAttemptDate = addHours(scheduledDate, Math.floor(this.uniformDistribution(8, 18)));

    if (orderStatus === 'Delivered') {
      // Successful delivery - 80% first attempt, 15% second, 5% third
      const attemptSuccess = this.rng();

      if (attemptSuccess < 0.8) {
        // First attempt success
        attempts.push({
          attemptNumber: 1,
          attemptDate: firstAttemptDate.toISOString(),
          status: 'success',
        });
      } else if (attemptSuccess < 0.95) {
        // Second attempt success
        attempts.push({
          attemptNumber: 1,
          attemptDate: firstAttemptDate.toISOString(),
          status: 'rescheduled',
          failureReason: this.pickOne(FAILURE_REASONS),
        });
        attempts.push({
          attemptNumber: 2,
          attemptDate: addDays(firstAttemptDate, 1).toISOString(),
          status: 'success',
        });
      } else {
        // Third attempt success
        attempts.push({
          attemptNumber: 1,
          attemptDate: firstAttemptDate.toISOString(),
          status: 'failed',
          failureReason: this.pickOne(FAILURE_REASONS),
        });
        attempts.push({
          attemptNumber: 2,
          attemptDate: addDays(firstAttemptDate, 1).toISOString(),
          status: 'rescheduled',
          failureReason: this.pickOne(FAILURE_REASONS),
        });
        attempts.push({
          attemptNumber: 3,
          attemptDate: addDays(firstAttemptDate, 2).toISOString(),
          status: 'success',
        });
      }
    } else if (orderStatus === 'Delivery Failed') {
      // All attempts failed
      const attemptCount = Math.floor(this.uniformDistribution(2, 4));

      for (let i = 1; i <= attemptCount; i++) {
        attempts.push({
          attemptNumber: i,
          attemptDate: addDays(firstAttemptDate, i - 1).toISOString(),
          status: 'failed',
          failureReason: this.pickOne(FAILURE_REASONS),
          notes: i === attemptCount ? 'Maximum attempts reached' : undefined,
        });
      }
    } else if (orderStatus === 'Shipped') {
      // In transit - first attempt scheduled
      attempts.push({
        attemptNumber: 1,
        attemptDate: firstAttemptDate.toISOString(),
        status: 'rescheduled',
        notes: 'Delivery in progress',
      });
    }

    return attempts;
  }
}
