/**
 * Audit Log Generator Engine
 *
 * Generates audit log records for all entity operations,
 * tracking user actions with realistic timestamps and details.
 */

import { Faker } from '@faker-js/faker';
import { addMinutes, addHours } from 'date-fns';
import { BaseGenerator } from './base-generator';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  MockUser,
  MockCompany,
  MockOrder,
  MockProduct,
  MockMaintenanceVisit,
} from '../types';
import type { AuditLog } from '@/lib/types';

/**
 * Extended audit log for mock data
 */
export interface MockAuditLog extends AuditLog {
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

/**
 * Action types for different entities
 */
const ENTITY_ACTIONS: Record<string, string[]> = {
  order: [
    'order.created',
    'order.updated',
    'order.status_changed',
    'order.payment_marked',
    'order.cancelled',
    'order.delivery_confirmed',
    'order.exported',
  ],
  company: [
    'company.created',
    'company.updated',
    'company.status_changed',
    'company.payment_config_updated',
    'company.suspended',
    'company.activated',
  ],
  product: [
    'product.created',
    'product.updated',
    'product.stock_adjusted',
    'product.price_changed',
    'product.discontinued',
  ],
  maintenance: [
    'maintenance.scheduled',
    'maintenance.started',
    'maintenance.completed',
    'maintenance.cancelled',
    'maintenance.follow_up_created',
    'maintenance.parts_ordered',
  ],
  user: [
    'user.login',
    'user.logout',
    'user.password_changed',
    'user.role_changed',
    'user.profile_updated',
  ],
  system: [
    'system.backup_created',
    'system.report_generated',
    'system.notification_sent',
    'system.sync_completed',
    'system.error_logged',
  ],
};

export class AuditLogGenerator extends BaseGenerator<MockAuditLog> {
  private users: MockUser[] = [];
  private companies: MockCompany[] = [];
  private orders: MockOrder[] = [];
  private products: MockProduct[] = [];
  private maintenanceVisits: MockMaintenanceVisit[] = [];

  constructor(
    config: MockGeneratorConfig,
    scenario: ScenarioProfile,
    faker: Faker,
    entities: {
      users: MockUser[];
      companies: MockCompany[];
      orders: MockOrder[];
      products: MockProduct[];
      maintenanceVisits: MockMaintenanceVisit[];
    }
  ) {
    super(config, scenario, faker);
    this.users = entities.users;
    this.companies = entities.companies;
    this.orders = entities.orders;
    this.products = entities.products;
    this.maintenanceVisits = entities.maintenanceVisits;
  }

  getEntityName(): string {
    return 'audit_logs';
  }

  async generate(count: number): Promise<MockAuditLog[]> {
    const logs: MockAuditLog[] = [];

    // Generate logs for each entity type
    logs.push(...this.generateOrderLogs());
    logs.push(...this.generateCompanyLogs());
    logs.push(...this.generateProductLogs());
    logs.push(...this.generateMaintenanceLogs());
    logs.push(...this.generateUserLogs());
    logs.push(...this.generateSystemLogs());

    // Sort by timestamp
    logs.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Return requested count
    return logs.slice(0, count);
  }

  /**
   * Generate logs for orders
   */
  private generateOrderLogs(): MockAuditLog[] {
    const logs: MockAuditLog[] = [];

    for (const order of this.orders) {
      const orderDate = new Date(order.orderDate);
      const user = this.pickOne(this.users);

      // Created log
      logs.push(this.createLog(
        user.id,
        'order.created',
        orderDate,
        {
          orderId: order.id,
          companyId: order.companyId,
          grandTotal: order.grandTotal,
        },
        'order',
        order.id
      ));

      // Status change logs from status history
      if (order.statusHistory) {
        for (const history of order.statusHistory.slice(1)) {
          logs.push(this.createLog(
            user.id,
            'order.status_changed',
            new Date(history.timestamp),
            {
              orderId: order.id,
              newStatus: history.status,
            },
            'order',
            order.id
          ));
        }
      }

      // Payment marked log
      if (order.paymentStatus === 'Paid' && order.paidDate) {
        logs.push(this.createLog(
          user.id,
          'order.payment_marked',
          new Date(order.paidDate),
          {
            orderId: order.id,
            amount: order.grandTotal,
            reference: order.paymentReference,
          },
          'order',
          order.id
        ));
      }
    }

    return logs;
  }

  /**
   * Generate logs for companies
   */
  private generateCompanyLogs(): MockAuditLog[] {
    const logs: MockAuditLog[] = [];

    for (const company of this.companies) {
      const createdDate = new Date(company.createdAt);
      const user = this.pickOne(this.users);

      // Created log
      logs.push(this.createLog(
        user.id,
        'company.created',
        createdDate,
        {
          companyId: company.id,
          name: company.name,
          region: company.region,
        },
        'company',
        company.id
      ));

      // Random update log
      if (this.rng() > 0.5) {
        logs.push(this.createLog(
          user.id,
          'company.updated',
          addHours(createdDate, Math.floor(this.uniformDistribution(24, 720))),
          {
            companyId: company.id,
            fields: ['contacts', 'email'],
          },
          'company',
          company.id
        ));
      }

      // Suspended log
      if (company.isSuspended) {
        logs.push(this.createLog(
          user.id,
          'company.suspended',
          this.randomDateInRange(),
          {
            companyId: company.id,
            reason: company.suspensionReason,
          },
          'company',
          company.id
        ));
      }
    }

    return logs;
  }

  /**
   * Generate logs for products
   */
  private generateProductLogs(): MockAuditLog[] {
    const logs: MockAuditLog[] = [];

    for (const product of this.products) {
      const createdDate = product.createdAt
        ? new Date(product.createdAt)
        : this.randomDateInRange();
      const user = this.pickOne(this.users);

      // Created log
      logs.push(this.createLog(
        user.id,
        'product.created',
        createdDate,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
        },
        'product',
        product.id
      ));

      // Stock adjustment log
      if (this.rng() > 0.7) {
        logs.push(this.createLog(
          user.id,
          'product.stock_adjusted',
          this.randomDateInRange(),
          {
            productId: product.id,
            adjustment: Math.floor(this.uniformDistribution(-50, 200)),
            newStock: product.stock,
          },
          'product',
          product.id
        ));
      }
    }

    return logs;
  }

  /**
   * Generate logs for maintenance visits
   */
  private generateMaintenanceLogs(): MockAuditLog[] {
    const logs: MockAuditLog[] = [];

    for (const visit of this.maintenanceVisits) {
      const visitDate = new Date(visit.date);
      const user = this.pickOne(this.users);

      // Scheduled log
      logs.push(this.createLog(
        user.id,
        'maintenance.scheduled',
        visitDate,
        {
          visitId: visit.id,
          companyId: visit.companyId,
          technicianName: visit.technicianName,
        },
        'maintenance',
        visit.id
      ));

      // Completed log
      if (visit.status === 'Completed') {
        logs.push(this.createLog(
          user.id,
          'maintenance.completed',
          visit.resolutionDate
            ? new Date(visit.resolutionDate)
            : addHours(visitDate, 4),
          {
            visitId: visit.id,
            resolutionStatus: visit.resolutionStatus,
            totalCost: visit.totalCost,
          },
          'maintenance',
          visit.id
        ));
      }
    }

    return logs;
  }

  /**
   * Generate user activity logs
   */
  private generateUserLogs(): MockAuditLog[] {
    const logs: MockAuditLog[] = [];

    for (const user of this.users) {
      // Generate login/logout pairs
      const sessionCount = Math.floor(this.uniformDistribution(5, 20));

      for (let i = 0; i < sessionCount; i++) {
        const loginTime = this.randomBusinessHourDate();
        const sessionDuration = Math.floor(this.uniformDistribution(30, 480)); // 30 min to 8 hours

        logs.push(this.createLog(
          user.id,
          'user.login',
          loginTime,
          {
            userId: user.id,
            email: user.email,
            ipAddress: this.faker.internet.ip(),
          },
          'user',
          user.id
        ));

        logs.push(this.createLog(
          user.id,
          'user.logout',
          addMinutes(loginTime, sessionDuration),
          {
            userId: user.id,
            sessionDuration: sessionDuration,
          },
          'user',
          user.id
        ));
      }
    }

    return logs;
  }

  /**
   * Generate system logs
   */
  private generateSystemLogs(): MockAuditLog[] {
    const logs: MockAuditLog[] = [];
    const systemActions = ENTITY_ACTIONS.system;
    const systemUser = this.users.find((u) => u.role === 'Admin') ?? this.users[0];

    // Generate ~50 system logs spread across the date range
    for (let i = 0; i < 50; i++) {
      const action = this.pickOne(systemActions);

      logs.push(this.createLog(
        systemUser?.id ?? 'system',
        action,
        this.randomDateInRange(),
        this.generateSystemLogDetails(action),
        'system',
        undefined
      ));
    }

    return logs;
  }

  /**
   * Create an audit log entry
   */
  private createLog(
    userId: string,
    action: string,
    timestamp: Date,
    details: Record<string, unknown>,
    entityType?: string,
    entityId?: string
  ): MockAuditLog {
    return {
      id: this.generateId(),
      userId,
      action,
      timestamp: timestamp.toISOString(),
      details,
      entityType,
      entityId,
      createdAt: timestamp.toISOString(),
    };
  }

  /**
   * Generate details for system logs
   */
  private generateSystemLogDetails(action: string): Record<string, unknown> {
    switch (action) {
      case 'system.backup_created':
        return { backupSize: `${Math.floor(this.uniformDistribution(100, 500))}MB`, backupType: 'full' };
      case 'system.report_generated':
        return { reportType: this.pickOne(['daily', 'weekly', 'monthly']), format: 'pdf' };
      case 'system.notification_sent':
        return { notificationType: 'email', recipientCount: Math.floor(this.uniformDistribution(1, 50)) };
      case 'system.sync_completed':
        return { syncedRecords: Math.floor(this.uniformDistribution(100, 10000)), durationMs: Math.floor(this.uniformDistribution(1000, 30000)) };
      case 'system.error_logged':
        return { errorCode: `ERR_${Math.floor(this.rng() * 1000)}`, severity: this.pickOne(['low', 'medium', 'high']) };
      default:
        return {};
    }
  }
}
