/**
 * Order Generator Engine
 *
 * Generates mock orders with realistic line items, delivery schedules,
 * payment due dates, and status distributions.
 */

import { Faker } from '@faker-js/faker';
import { addDays, isWeekend, Day } from 'date-fns';
import { BaseGenerator } from './base-generator';
import type { TimeSeriesEngine } from '../time-series-engine';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  MockOrder,
  MockCompany,
  MockBranch,
  MockProduct,
  AnomalyType,
} from '../types';
import type { Order, OrderItem } from '@/lib/types';

/**
 * Tax configuration
 */
const TAX_RATE = 0.14; // 14% VAT in Egypt

/**
 * Cancellation reasons
 */
const CANCELLATION_REASONS = [
  'Customer requested cancellation',
  'Out of stock',
  'Payment issue',
  'Delivery area not serviceable',
  'Duplicate order',
  'Price dispute',
];

export class OrderGenerator extends BaseGenerator<MockOrder> {
  private companies: MockCompany[] = [];
  private branches: MockBranch[] = [];
  private products: MockProduct[] = [];
  private generatedOrders: MockOrder[] = [];
  private timeSeriesEngine: TimeSeriesEngine;

  constructor(
    config: MockGeneratorConfig,
    scenario: ScenarioProfile,
    faker: Faker,
    companies: MockCompany[],
    branches: MockBranch[],
    products: MockProduct[],
    timeSeriesEngine: TimeSeriesEngine
  ) {
    super(config, scenario, faker);
    this.companies = companies;
    this.branches = branches;
    this.products = products;
    this.timeSeriesEngine = timeSeriesEngine;
  }

  getEntityName(): string {
    return 'orders';
  }

  async generate(count: number): Promise<MockOrder[]> {
    const orders: MockOrder[] = [];

    for (let i = 0; i < count; i++) {
      const order = this.generateOrder();
      orders.push(order);
      this.logProgress(i + 1, count);
    }

    // Apply anomalies
    const ordersWithAnomalies = this.injectAnomalies(orders, this.handleAnomaly.bind(this));

    this.generatedOrders = ordersWithAnomalies;
    return ordersWithAnomalies;
  }

  /**
   * Generate orders distributed across a date range
   */
  async generateForDateRange(ordersPerDay: number): Promise<MockOrder[]> {
    const startDate = new Date(this.config.startDate);
    const endDate = new Date(this.config.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate total orders roughly
    const totalOrders = Math.floor(ordersPerDay * days);

    // Use TimeSeriesEngine to distribute orders
    const timedEvents = await this.timeSeriesEngine.generateTimeSeries<MockOrder>(
        (timestamp) => this.generateOrderForDate(timestamp),
        totalOrders
    );
    
    const orders = timedEvents.map(e => e.data);

    // Apply anomalies
    const ordersWithAnomalies = this.injectAnomalies(orders, this.handleAnomaly.bind(this));

    this.generatedOrders = ordersWithAnomalies;
    return ordersWithAnomalies;
  }

  /**
   * Generate a single order
   */
  private generateOrder(): MockOrder {
    const orderDate = this.randomBusinessHourDate();
    return this.generateOrderForDate(orderDate);
  }

  /**
   * Generate order for a specific date
   */
  private generateOrderForDate(orderDate: Date): MockOrder {
    // Select company (and optionally branch)
    const company = this.selectCompanyByPopularity();
    const branch = this.rng() > 0.7 ? this.selectBranchForCompany(company.id) : null;

    // Generate order items
    const items = this.generateOrderItems();

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalTax = items.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0);

    // Apply order-level discount (20% chance)
    let discountType: 'percentage' | 'fixed' | null = null;
    let discountValue: number | null = null;
    let discountAmount = 0;

    if (this.rng() < 0.2) {
      discountType = this.rng() > 0.5 ? 'percentage' : 'fixed';
      if (discountType === 'percentage') {
        discountValue = Math.floor(this.uniformDistribution(5, 20));
        discountAmount = this.round(subtotal * (discountValue / 100));
      } else {
        discountValue = Math.floor(this.uniformDistribution(50, 500));
        discountAmount = Math.min(discountValue, subtotal);
      }
    }

    const grandTotal = this.round(subtotal + totalTax - discountAmount);

    // Determine status
    const status = this.selectFromDistribution(this.scenario.distributions.orderStatus);

    // Determine payment status (based on order status and scenario)
    const paymentStatus = this.determinePaymentStatus(status);

    // Calculate dates
    const deliverySchedule = company.region as 'A' | 'B';
    const deliveryDate = this.calculateDeliveryDate(orderDate, deliverySchedule);
    const paymentDueDate = this.calculatePaymentDueDate(orderDate, company);

    // Generate status history
    const statusHistory = this.generateStatusHistory(orderDate, status);

    const order: MockOrder = {
      id: this.generateId(),
      companyId: company.id,
      branchId: branch?.id ?? null,
      companyName: company.name,
      branchName: branch?.name,
      orderDate: orderDate.toISOString(),
      deliveryDate: deliveryDate?.toISOString() ?? null,
      deliverySchedule,
      paymentDueDate: paymentDueDate?.toISOString() ?? null,
      status,
      paymentStatus,
      subtotal: this.round(subtotal),
      totalTax: this.round(totalTax),
      discountType,
      discountValue,
      discountAmount: this.round(discountAmount),
      grandTotal,
      total: grandTotal, // Deprecated field
      items,
      deliveryNotes: this.rng() > 0.7 ? this.faker.lorem.sentence() : undefined,
      statusHistory,
      isPotentialClient: false,
      area: company.area,
      expectedPaymentDate: paymentDueDate?.toISOString(),
      isPaid: paymentStatus === 'Paid',
      paidDate: paymentStatus === 'Paid' ? this.generatePaidDate(orderDate, paymentDueDate).toISOString() : undefined,
      daysOverdue: paymentStatus === 'Overdue' ? Math.floor(this.uniformDistribution(1, 60)) : 0,
      cancellationReason: status === 'Cancelled' ? this.pickOne(CANCELLATION_REASONS) : undefined,
      _mockMetadata: this.generateMetadata(),
    };

    return order;
  }

  /**
   * Generate order items
   */
  private generateOrderItems(): OrderItem[] {
    const itemCount = Math.floor(this.uniformDistribution(1, 8));
    const items: OrderItem[] = [];
    const selectedProducts = new Set<string>();

    for (let i = 0; i < itemCount; i++) {
      // Select product using Zipf distribution (popular products more likely)
      let product: MockProduct;
      do {
        product = this.applyZipfDistribution(this.products);
      } while (selectedProducts.has(product.id) && selectedProducts.size < this.products.length);

      if (selectedProducts.has(product.id)) continue;
      selectedProducts.add(product.id);

      const quantity = Math.floor(this.uniformDistribution(1, 20));
      const taxAmount = this.round(product.price * quantity * TAX_RATE);

      // Item-level discount (10% chance)
      let itemDiscountType: 'percentage' | 'fixed' | null = null;
      let itemDiscountValue: number | null = null;

      if (this.rng() < 0.1) {
        itemDiscountType = this.rng() > 0.6 ? 'percentage' : 'fixed';
        itemDiscountValue = itemDiscountType === 'percentage'
          ? Math.floor(this.uniformDistribution(5, 15))
          : Math.floor(this.uniformDistribution(10, 100));
      }

      items.push({
        id: this.generateId(),
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
        taxId: 'vat-14',
        taxRate: TAX_RATE * 100,
        taxAmount,
        discountType: itemDiscountType,
        discountValue: itemDiscountValue,
      });
    }

    return items;
  }

  /**
   * Select company weighted by popularity (larger companies order more)
   */
  private selectCompanyByPopularity(): MockCompany {
    // Use Zipf to favor larger/more active companies
    return this.applyZipfDistribution(this.companies, 0.8);
  }

  /**
   * Select a branch for a company if available
   */
  private selectBranchForCompany(companyId: string): MockBranch | null {
    const companyBranches = this.branches.filter((b) => b.companyId === companyId);
    if (companyBranches.length === 0) return null;
    return this.pickOne(companyBranches);
  }

  /**
   * Determine payment status based on order status
   */
  private determinePaymentStatus(orderStatus: Order['status']): Order['paymentStatus'] {
    if (orderStatus === 'Cancelled') {
      return 'Pending'; // Cancelled orders don't get paid
    }

    // For delivered orders, use scenario distribution
    if (orderStatus === 'Delivered') {
      return this.selectFromDistribution(this.scenario.distributions.paymentStatus);
    }

    // Non-delivered orders are pending
    return 'Pending';
  }

  /**
   * Calculate delivery date based on order date and schedule
   */
  private calculateDeliveryDate(orderDate: Date, schedule: 'A' | 'B'): Date | null {
    // A: Sun/Tue/Thu, B: Mon/Wed/Sat
    const deliveryDays: Record<'A' | 'B', Day[]> = {
      'A': [0, 2, 4], // Sunday, Tuesday, Thursday
      'B': [1, 3, 6], // Monday, Wednesday, Saturday
    };

    const days = deliveryDays[schedule];
    const orderDay = orderDate.getDay();

    // Find next delivery day
    for (let i = 1; i <= 7; i++) {
      const checkDay = (orderDay + i) % 7;
      if (days.includes(checkDay as Day)) {
        return addDays(orderDate, i);
      }
    }

    return addDays(orderDate, 2); // Fallback
  }

  /**
   * Calculate payment due date based on company payment configuration
   */
  private calculatePaymentDueDate(orderDate: Date, company: MockCompany): Date | null {
    switch (company.paymentDueType) {
      case 'immediate':
        return orderDate;
      case 'days_after_order':
        return addDays(orderDate, company.paymentDueDays ?? 30);
      case 'monthly_date':
        const dueDate = new Date(orderDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(company.paymentDueDate ?? 1);
        return dueDate;
      case 'bulk_schedule':
        // Next bulk payment date
        return addDays(orderDate, 90); // Simplified
      default:
        return addDays(orderDate, 30);
    }
  }

  /**
   * Generate a realistic paid date
   */
  private generatePaidDate(orderDate: Date, paymentDueDate: Date | null): Date {
    if (!paymentDueDate) {
      return addDays(orderDate, Math.floor(this.uniformDistribution(1, 14)));
    }

    // 70% pay before due date, 30% pay after
    if (this.rng() < 0.7) {
      const daysBeforeDue = Math.floor(this.uniformDistribution(0, 7));
      return addDays(paymentDueDate, -daysBeforeDue);
    } else {
      const daysAfterDue = Math.floor(this.uniformDistribution(1, 30));
      return addDays(paymentDueDate, daysAfterDue);
    }
  }

  /**
   * Generate status history
   */
  private generateStatusHistory(
    orderDate: Date,
    finalStatus: Order['status']
  ): { status: Order['status']; timestamp: string }[] {
    const history: { status: Order['status']; timestamp: string }[] = [];

    history.push({ status: 'Pending', timestamp: orderDate.toISOString() });

    if (['Processing', 'Shipped', 'Delivered', 'Delivery Failed'].includes(finalStatus)) {
      history.push({
        status: 'Processing',
        timestamp: addDays(orderDate, 1).toISOString(),
      });
    }

    if (['Shipped', 'Delivered', 'Delivery Failed'].includes(finalStatus)) {
      history.push({
        status: 'Shipped',
        timestamp: addDays(orderDate, 2).toISOString(),
      });
    }

    if (finalStatus === 'Delivered') {
      history.push({
        status: 'Delivered',
        timestamp: addDays(orderDate, 3).toISOString(),
      });
    }

    if (finalStatus === 'Delivery Failed') {
      history.push({
        status: 'Delivery Failed',
        timestamp: addDays(orderDate, 3).toISOString(),
      });
    }

    if (finalStatus === 'Cancelled') {
      history.push({
        status: 'Cancelled',
        timestamp: addDays(orderDate, Math.floor(this.rng() * 2)).toISOString(),
      });
    }

    return history;
  }

  /**
   * Handle anomaly injection
   */
  private handleAnomaly(order: MockOrder, anomalyType: AnomalyType): MockOrder {
    switch (anomalyType) {
      case 'payment_delay':
        if (order.paymentStatus === 'Paid') {
          order.paymentStatus = 'Overdue';
          order.isPaid = false;
          order.daysOverdue = Math.floor(this.uniformDistribution(15, 90));
          order.paidDate = undefined;
        }
        break;

      case 'delivery_delay':
        if (order.deliveryDate) {
          const delay = Math.floor(this.uniformDistribution(3, 14));
          order.deliveryDate = addDays(new Date(order.deliveryDate), delay).toISOString();
          if (order.status === 'Delivered') {
            order.status = 'Shipped'; // Revert to shipped
          }
        }
        break;

      case 'order_cancellation':
        order.status = 'Cancelled';
        order.cancellationReason = this.pickOne(CANCELLATION_REASONS);
        order.paymentStatus = 'Pending';
        order.isPaid = false;
        break;

      case 'duplicate_orders':
        // Mark as potential duplicate (for analytics testing)
        order.deliveryNotes = (order.deliveryNotes ?? '') + ' [POTENTIAL_DUPLICATE]';
        break;

      default:
        // No specific handling
        break;
    }

    return order;
  }

  /**
   * Get generated orders
   */
  getGeneratedOrders(): MockOrder[] {
    return this.generatedOrders;
  }
}
