/**
 * Discount Generator Engine
 *
 * Generates discount records for orders and order items
 * with realistic discount ranges and promotional periods.
 */

import { Faker } from '@faker-js/faker';
import { BaseGenerator } from './base-generator';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  MockOrder,
  Discount,
} from '../types';

/**
 * Discount reasons
 */
const DISCOUNT_REASONS = [
  'Loyalty discount',
  'Volume discount',
  'First order discount',
  'Seasonal promotion',
  'Manager approval',
  'Price match',
  'Bulk order discount',
  'Holiday special',
  'Anniversary discount',
  'Referral bonus',
];

export class DiscountGenerator extends BaseGenerator<Discount> {
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
    return 'discounts';
  }

  async generate(count: number): Promise<Discount[]> {
    const discounts: Discount[] = [];
    const discountRate = 0.2; // 20% of orders get discounts

    for (const order of this.orders) {
      if (this.rng() < discountRate) {
        // Order-level discount
        if (order.discountType && order.discountAmount) {
          const discount = this.generateOrderDiscount(order);
          discounts.push(discount);
        }

        // Item-level discounts
        for (const item of order.items) {
          if (item.discountType && item.discountValue) {
            const itemDiscount = this.generateItemDiscount(order, item.id);
            discounts.push(itemDiscount);
          }
        }
      }

      if (discounts.length >= count) break;
    }

    return discounts.slice(0, count);
  }

  /**
   * Generate order-level discount record
   */
  private generateOrderDiscount(order: MockOrder): Discount {
    return {
      id: this.generateId(),
      orderId: order.id,
      type: order.discountType!,
      value: order.discountValue!,
      amount: order.discountAmount!,
      reason: this.pickOne(DISCOUNT_REASONS),
      appliedAt: order.orderDate,
      appliedBy: this.rng() > 0.5 ? 'sales_rep' : 'system',
    };
  }

  /**
   * Generate item-level discount record
   */
  private generateItemDiscount(order: MockOrder, itemId: string): Discount {
    const discountType = this.rng() > 0.6 ? 'percentage' : 'fixed';
    const value = discountType === 'percentage'
      ? Math.floor(this.uniformDistribution(5, 20))
      : Math.floor(this.uniformDistribution(20, 200));

    // Calculate amount based on a typical item value
    const amount = discountType === 'percentage'
      ? this.round(500 * (value / 100)) // Assume ~500 EGP item
      : Math.min(value, 500);

    return {
      id: this.generateId(),
      orderId: order.id,
      orderItemId: itemId,
      type: discountType,
      value,
      amount,
      reason: this.pickOne(DISCOUNT_REASONS),
      appliedAt: order.orderDate,
      appliedBy: 'sales_rep',
    };
  }

  /**
   * Generate promotional period discounts
   */
  generatePromotionalDiscounts(
    startDate: Date,
    endDate: Date,
    discountPercent: number
  ): Discount[] {
    const discounts: Discount[] = [];

    // Filter orders within promotional period
    const promotionalOrders = this.orders.filter((o) => {
      const orderDate = new Date(o.orderDate);
      return orderDate >= startDate && orderDate <= endDate;
    });

    for (const order of promotionalOrders) {
      const amount = this.round(order.subtotal * (discountPercent / 100));

      discounts.push({
        id: this.generateId(),
        orderId: order.id,
        type: 'percentage',
        value: discountPercent,
        amount,
        reason: 'Promotional period discount',
        appliedAt: order.orderDate,
        appliedBy: 'system',
      });
    }

    return discounts;
  }
}
