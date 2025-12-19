/**
 * Payment Generator Engine
 *
 * Generates payment records for paid orders with realistic
 * payment methods, references, and processing times.
 */

import { Faker } from '@faker-js/faker';
import { addDays, subDays } from 'date-fns';
import { BaseGenerator } from './base-generator';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  MockOrder,
} from '../types';
import type { Payment } from '@/lib/types';

/**
 * Extended payment record for mock data
 */
export interface MockPayment extends Payment {
  orderId: string;
  reference?: string;
  notes?: string;
  markedBy?: string;
  createdAt: string;
}

export class PaymentGenerator extends BaseGenerator<MockPayment> {
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
    return 'payments';
  }

  async generate(count: number): Promise<MockPayment[]> {
    // Generate payments for paid orders only
    const paidOrders = this.orders.filter((o) => o.paymentStatus === 'Paid');
    const payments: MockPayment[] = [];

    for (const order of paidOrders) {
      const payment = this.generatePaymentForOrder(order);
      payments.push(payment);

      if (payments.length >= count) break;
    }

    return payments;
  }

  /**
   * Generate payment for an order
   */
  private generatePaymentForOrder(order: MockOrder): MockPayment {
    const orderDate = new Date(order.orderDate);
    const paymentDueDate = order.paymentDueDate
      ? new Date(order.paymentDueDate)
      : addDays(orderDate, 30);

    // Determine payment date (usually before or on due date, sometimes after)
    const paymentDate = this.calculatePaymentDate(orderDate, paymentDueDate);

    // Determine payment method based on company config
    const method = this.rng() > 0.6 ? 'Bank Transfer' : 'Other';

    const payment: MockPayment = {
      id: this.generateId(),
      invoiceId: order.id, // Using order ID as invoice reference
      orderId: order.id,
      paymentDate: paymentDate.toISOString(),
      amount: order.grandTotal,
      method,
      reference: this.generatePaymentReference(method),
      notes: this.rng() > 0.8 ? this.faker.lorem.sentence() : undefined,
      markedBy: this.rng() > 0.3 ? 'accounts_team' : 'auto_reconciliation',
      createdAt: paymentDate.toISOString(),
    };

    return payment;
  }

  /**
   * Calculate realistic payment date
   */
  private calculatePaymentDate(orderDate: Date, dueDate: Date): Date {
    const random = this.rng();

    if (random < 0.1) {
      // 10% pay immediately (same day)
      return orderDate;
    } else if (random < 0.4) {
      // 30% pay early (before due date)
      const daysEarly = Math.floor(this.uniformDistribution(3, 15));
      return subDays(dueDate, daysEarly);
    } else if (random < 0.7) {
      // 30% pay on time (around due date ±2 days)
      const daysDiff = Math.floor(this.uniformDistribution(-2, 2));
      return addDays(dueDate, daysDiff);
    } else if (random < 0.9) {
      // 20% pay slightly late (1-14 days after due)
      const daysLate = Math.floor(this.uniformDistribution(1, 14));
      return addDays(dueDate, daysLate);
    } else {
      // 10% pay very late (15-45 days after due)
      const daysLate = Math.floor(this.uniformDistribution(15, 45));
      return addDays(dueDate, daysLate);
    }
  }

  /**
   * Generate payment reference number
   */
  private generatePaymentReference(method: string): string {
    const prefix = method === 'Bank Transfer' ? 'TRF' : 'PAY';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(this.rng() * 1000000).toString().padStart(6, '0');
    return `${prefix}-${date}-${random}`;
  }

  /**
   * Generate bulk payment record for bulk payment cycles
   */
  generateBulkPayment(
    orders: MockOrder[],
    cycleId: string
  ): MockPayment {
    const totalAmount = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const latestOrderDate = orders.reduce(
      (max, o) => Math.max(max, new Date(o.orderDate).getTime()),
      0
    );

    const payment: MockPayment = {
      id: this.generateId(),
      invoiceId: cycleId,
      orderId: orders[0]?.id ?? '',
      paymentDate: addDays(new Date(latestOrderDate), 30).toISOString(),
      amount: this.round(totalAmount),
      method: 'Bank Transfer',
      reference: this.generatePaymentReference('Bank Transfer'),
      notes: `Bulk payment for ${orders.length} orders - Cycle: ${cycleId}`,
      markedBy: 'accounts_team',
      createdAt: new Date().toISOString(),
    };

    return payment;
  }
}
