/**
 * Refund Generator Engine
 *
 * Generates refund records linked to returns with realistic
 * processing times and approval workflows.
 */

import { Faker } from '@faker-js/faker';
import { addDays } from 'date-fns';
import { BaseGenerator } from './base-generator';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  MockOrder,
  Refund,
} from '../types';
import type { Return } from '@/lib/types';

/**
 * Extended return type for mock data
 */
export interface MockReturn extends Return {
  orderId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Return reasons
 */
const RETURN_REASONS = [
  'Product damaged during delivery',
  'Wrong product delivered',
  'Product quality issue',
  'Customer changed mind',
  'Product expired',
  'Quantity mismatch',
  'Packaging damaged',
  'Product not as described',
];

/**
 * Refund rejection reasons
 */
const REJECTION_REASONS = [
  'Return policy expired',
  'Product used/opened',
  'No proof of purchase',
  'Product tampered',
  'Outside return window',
];

export class RefundGenerator extends BaseGenerator<Refund> {
  private orders: MockOrder[] = [];
  private generatedReturns: MockReturn[] = [];

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
    return 'refunds';
  }

  async generate(count: number): Promise<Refund[]> {
    // First generate returns
    const returns = await this.generateReturns();
    this.generatedReturns = returns;

    // Then generate refunds for completed returns
    const refunds: Refund[] = [];

    for (const ret of returns) {
      const refund = this.generateRefundForReturn(ret);
      refunds.push(refund);

      if (refunds.length >= count) break;
    }

    return refunds.slice(0, count);
  }

  /**
   * Generate returns from delivered orders
   */
  private async generateReturns(): Promise<MockReturn[]> {
    const returns: MockReturn[] = [];
    const returnRate = 0.05; // 5% of delivered orders have returns

    const deliveredOrders = this.orders.filter(
      (o) => o.status === 'Delivered'
    );

    for (const order of deliveredOrders) {
      if (this.rng() < returnRate) {
        const orderDate = new Date(order.orderDate);
        const returnDate = addDays(orderDate, Math.floor(this.uniformDistribution(1, 14)));

        // Determine return status
        const statusRandom = this.rng();
        let status: MockReturn['status'];
        if (statusRandom < 0.6) {
          status = 'Completed';
        } else if (statusRandom < 0.85) {
          status = 'Processing';
        } else {
          status = 'Rejected';
        }

        returns.push({
          id: this.generateId(),
          orderId: order.id,
          returnDate: returnDate.toISOString(),
          reason: this.pickOne(RETURN_REASONS),
          status,
          createdAt: returnDate.toISOString(),
          updatedAt: addDays(returnDate, status === 'Processing' ? 0 : Math.floor(this.uniformDistribution(1, 5))).toISOString(),
        });
      }
    }

    return returns;
  }

  /**
   * Generate refund for a return
   */
  private generateRefundForReturn(ret: MockReturn): Refund {
    const returnDate = new Date(ret.returnDate);
    const order = this.orders.find((o) => o.id === ret.orderId);
    const refundAmount = order
      ? this.round(order.grandTotal * this.uniformDistribution(0.5, 1))
      : this.round(this.uniformDistribution(100, 5000));

    // Map return status to refund status
    let refundStatus: Refund['status'];
    let processedAt: string | undefined;
    let reason: string | undefined;

    switch (ret.status) {
      case 'Completed':
        refundStatus = 'completed';
        processedAt = addDays(returnDate, Math.floor(this.uniformDistribution(1, 7))).toISOString();
        break;
      case 'Processing':
        refundStatus = this.rng() > 0.5 ? 'pending' : 'approved';
        if (refundStatus === 'approved') {
          processedAt = addDays(returnDate, Math.floor(this.uniformDistribution(1, 3))).toISOString();
        }
        break;
      case 'Rejected':
        refundStatus = 'rejected';
        reason = this.pickOne(REJECTION_REASONS);
        processedAt = addDays(returnDate, Math.floor(this.uniformDistribution(1, 5))).toISOString();
        break;
      default:
        refundStatus = 'pending';
    }

    return {
      id: this.generateId(),
      returnId: ret.id,
      orderId: ret.orderId,
      amount: refundStatus === 'rejected' ? 0 : refundAmount,
      status: refundStatus,
      reason,
      processedAt,
      processedBy: processedAt ? 'accounts_dept' : undefined,
      createdAt: returnDate.toISOString(),
    };
  }

  /**
   * Get generated returns
   */
  getGeneratedReturns(): MockReturn[] {
    return this.generatedReturns;
  }
}
