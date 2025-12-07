import type { Notification, Order, Company, MaintenanceVisit } from './types';
import { addDays } from 'date-fns';
import { logger } from './logger';

export type AutomationAction = 
  | 'SEND_EMAIL'
  | 'CREATE_TASK'
  | 'UPDATE_STATUS'
  | 'ESCALATE'
  | 'SCHEDULE_FOLLOW_UP'
  | 'SUSPEND_ORDERS'
  | 'SEND_SMS';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    notificationType: string;
    conditions: Array<{
      field: string;
      operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
      value: any;
    }>;
  };
  actions: Array<{
    type: AutomationAction;
    config: Record<string, any>;
    delay?: number; // minutes
  }>;
}

/**
 * Workflow automation engine
 */
export class NotificationAutomation {
  private static rules: AutomationRule[] = [
    {
      id: 'overdue-30-days',
      name: 'Suspend orders for 30+ day overdue payments',
      enabled: true,
      trigger: {
        notificationType: 'OVERDUE_PAYMENT',
        conditions: [
          { field: 'metadata.daysUntil', operator: 'less_than', value: -30 },
        ],
      },
      actions: [
        {
          type: 'SEND_EMAIL',
          config: {
            template: 'payment_final_notice',
            to: 'manager',
          },
        },
        {
          type: 'ESCALATE',
          config: {
            to: 'manager',
            priority: 'critical',
          },
          delay: 60, // 1 hour
        },
        {
          type: 'SUSPEND_ORDERS',
          config: {
            reason: 'Payment overdue >30 days',
          },
          delay: 1440, // 24 hours
        },
      ],
    },
    {
      id: 'high-value-approval',
      name: 'Require approval for high-value orders',
      enabled: true,
      trigger: {
        notificationType: 'HIGH_VALUE_ORDER',
        conditions: [
          { field: 'metadata.amount', operator: 'greater_than', value: 50000 },
        ],
      },
      actions: [
        {
          type: 'CREATE_TASK',
          config: {
            title: 'Review high-value order',
            assignee: 'manager',
            priority: 'high',
          },
        },
        {
          type: 'SEND_EMAIL',
          config: {
            template: 'high_value_order_alert',
            to: 'manager',
          },
        },
      ],
    },
    {
      id: 'delivery-failed-followup',
      name: 'Auto-schedule follow-up for failed deliveries',
      enabled: true,
      trigger: {
        notificationType: 'DELIVERY_FAILED',
        conditions: [],
      },
      actions: [
        {
          type: 'SCHEDULE_FOLLOW_UP',
          config: {
            type: 'delivery_retry',
            daysFromNow: 1,
          },
        },
        {
          type: 'SEND_EMAIL',
          config: {
            template: 'delivery_failed_notice',
            to: 'client',
          },
        },
      ],
    },
    {
      id: 'maintenance-delayed-escalate',
      name: 'Escalate significantly delayed maintenance',
      enabled: true,
      trigger: {
        notificationType: 'MAINTENANCE_DELAYED',
        conditions: [
          { field: 'metadata.delayDays', operator: 'greater_than', value: 7 },
        ],
      },
      actions: [
        {
          type: 'ESCALATE',
          config: {
            to: 'supervisor',
            priority: 'high',
          },
        },
        {
          type: 'SEND_EMAIL',
          config: {
            template: 'maintenance_escalation',
            to: 'supervisor',
          },
        },
      ],
    },
  ];

  /**
   * Check if notification triggers any automation rules
   */
  static async processNotification(
    notification: Notification,
    context?: {
      order?: Order;
      company?: Company;
      maintenanceVisit?: MaintenanceVisit;
    }
  ): Promise<void> {
    const matchingRules = this.rules.filter(rule => 
      rule.enabled && this.matchesRule(notification, rule, context)
    );

    for (const rule of matchingRules) {
      await this.executeRule(rule, notification, context);
    }
  }

  /**
   * Check if notification matches rule conditions
   */
  private static matchesRule(
    notification: Notification,
    rule: AutomationRule,
    context?: any
  ): boolean {
    if (notification.type !== rule.trigger.notificationType) {
      return false;
    }

    return rule.trigger.conditions.every(condition => {
      const value = this.getFieldValue(notification, condition.field, context);
      return this.evaluateCondition(value, condition.operator, condition.value);
    });
  }

  /**
   * Get field value from notification or context
   */
  private static getFieldValue(notification: Notification, field: string, context?: any): any {
    const parts = field.split('.');
    let value: any = notification;

    for (const part of parts) {
      value = value?.[part];
    }

    if (value === undefined && context) {
      value = context[parts[0]]?.[parts[1]];
    }

    return value;
  }

  /**
   * Evaluate condition
   */
  private static evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expected;
      case 'greater_than':
        return value > expected;
      case 'less_than':
        return value < expected;
      case 'contains':
        return String(value).includes(String(expected));
      default:
        return false;
    }
  }

  /**
   * Execute automation rule
   */
  private static async executeRule(
    rule: AutomationRule,
    notification: Notification,
    context?: any
  ): Promise<void> {
    logger.debug(`Executing automation rule: ${rule.name}`);

    for (const action of rule.actions) {
      if (action.delay) {
        // Schedule delayed action
        setTimeout(() => this.executeAction(action, notification, context), action.delay * 60 * 1000);
      } else {
        await this.executeAction(action, notification, context);
      }
    }
  }

  /**
   * Execute single action
   */
  private static async executeAction(
    action: { type: AutomationAction; config: Record<string, any> },
    notification: Notification,
    context?: any
  ): Promise<void> {
    logger.debug(`Executing action: ${action.type}`, action.config);

    switch (action.type) {
      case 'SEND_EMAIL':
        await this.sendEmail(action.config, notification, context);
        break;
      case 'CREATE_TASK':
        await this.createTask(action.config, notification);
        break;
      case 'UPDATE_STATUS':
        await this.updateStatus(action.config, context);
        break;
      case 'ESCALATE':
        await this.escalate(action.config, notification);
        break;
      case 'SCHEDULE_FOLLOW_UP':
        await this.scheduleFollowUp(action.config, context);
        break;
      case 'SUSPEND_ORDERS':
        await this.suspendOrders(action.config, context);
        break;
      case 'SEND_SMS':
        await this.sendSMS(action.config, notification);
        break;
    }
  }

  private static async sendEmail(config: any, notification: Notification, context?: any): Promise<void> {
    const { sendEmailNotification } = await import('./notification-email-service');
    // TODO: Get recipient email based on config.to
    const email = 'manager@company.com'; // Placeholder
    await sendEmailNotification(email, notification);
  }

  private static async createTask(config: any, notification: Notification): Promise<void> {
    // TODO: Integrate with task management system
    logger.debug('Task created:', config.title);
  }

  private static async updateStatus(config: any, context?: any): Promise<void> {
    // TODO: Update order/maintenance status
    logger.debug('Status updated:', config);
  }

  private static async escalate(config: any, notification: Notification): Promise<void> {
    const { NotificationService } = await import('./notification-service');
    
    // Create escalated notification
    await NotificationService.createNotification({
      ...notification,
      priority: 'critical',
      title: `[ESCALATED] ${notification.title}`,
      message: `Escalated to ${config.to}: ${notification.message}`,
    });
  }

  private static async scheduleFollowUp(config: any, context?: any): Promise<void> {
    // TODO: Schedule follow-up visit/call
    logger.debug('Follow-up scheduled:', config);
  }

  private static async suspendOrders(config: any, context?: any): Promise<void> {
    // TODO: Suspend new orders for company
    logger.debug('Orders suspended:', config.reason);
  }

  private static async sendSMS(config: any, notification: Notification): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    logger.debug('SMS sent:', notification.title);
  }

  /**
   * Get all automation rules
   */
  static getRules(): AutomationRule[] {
    return this.rules;
  }

  /**
   * Add custom rule
   */
  static addRule(rule: AutomationRule): void {
    this.rules.push(rule);
  }

  /**
   * Update rule
   */
  static updateRule(ruleId: string, updates: Partial<AutomationRule>): void {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  /**
   * Delete rule
   */
  static deleteRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Toggle rule enabled status
   */
  static toggleRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
    }
  }
}

