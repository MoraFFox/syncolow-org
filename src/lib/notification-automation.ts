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

/**
 * Typed value for automation rule conditions
 */
export type ConditionValue = string | number | boolean;

/**
 * Context provided to automation rule processing
 */
export interface AutomationContext {
  order?: Order;
  company?: Company;
  maintenanceVisit?: MaintenanceVisit;
}

/**
 * Configuration for automation actions
 */
export interface ActionConfig {
  [key: string]: unknown;
  template?: string;
  to?: string;
  priority?: string;
  title?: string;
  assignee?: string;
  dueDate?: string;
  newStatus?: string;
  type?: string;
  daysFromNow?: number;
  reason?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    notificationType: string;
    conditions: Array<{
      field: string;
      operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
      value: ConditionValue;
    }>;
  };
  actions: Array<{
    type: AutomationAction;
    config: ActionConfig;
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
    context?: AutomationContext
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
  private static getFieldValue(notification: Notification, field: string, context?: AutomationContext): ConditionValue | undefined {
    const parts = field.split('.');
    let value: Record<string, unknown> = notification as unknown as Record<string, unknown>;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part] as Record<string, unknown>;
      } else {
        value = undefined as unknown as Record<string, unknown>;
        break;
      }
    }

    if (value === undefined && context) {
      const contextObj = context as Record<string, Record<string, unknown>>;
      value = contextObj[parts[0]]?.[parts[1]] as Record<string, unknown>;
    }

    return value as unknown as ConditionValue | undefined;
  }

  /**
   * Evaluate condition
   */
  private static evaluateCondition(value: ConditionValue | undefined, operator: string, expected: ConditionValue): boolean {
    if (value === undefined) return false;

    switch (operator) {
      case 'equals':
        return value === expected;
      case 'greater_than':
        return typeof value === 'number' && typeof expected === 'number' && value > expected;
      case 'less_than':
        return typeof value === 'number' && typeof expected === 'number' && value < expected;
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
    context?: AutomationContext
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
    action: { type: AutomationAction; config: ActionConfig },
    notification: Notification,
    context?: AutomationContext
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

  /**
   * Resolve recipient email based on role or context
   */
  private static async resolveRecipientEmail(
    to: string,
    context?: { order?: Order; company?: Company; maintenanceVisit?: MaintenanceVisit }
  ): Promise<string | null> {
    try {
      // Import cache for caching of role lookups
      const { universalCache } = await import('./cache/universal-cache');
      const { CacheKeyFactory } = await import('./cache/key-factory');

      if (to === 'client') {
        // Get email from company context
        if (context?.company?.email) {
          return context.company.email;
        }
        // If order context, try to look up company
        if (context?.order?.companyId) {
          const { supabaseAdmin } = await import('./supabase');
          const { data: company } = await supabaseAdmin
            .from('companies')
            .select('email')
            .eq('id', context.order.companyId)
            .single();
          return company?.email || null;
        }
        return null;
      }

      // For role-based recipients (manager, supervisor, admin)
      // Map role names to actual user roles
      const roleMap: Record<string, string> = {
        'manager': 'Manager',
        'supervisor': 'Admin',
        'admin': 'Admin'
      };
      const targetRole = roleMap[to.toLowerCase()] || to;

      // Use universalCache.get with a fetcher for proper caching
      const cacheKey = CacheKeyFactory.detail('automation', `role-email-${targetRole}`);

      const email = await universalCache.get<string | null>(
        cacheKey,
        async () => {
          // Query Supabase auth.users via admin API
          const { supabaseAdmin } = await import('./supabase');
          const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

          if (error || !users?.users) {
            logger.warn('Failed to list users for email resolution', { error });
            return null;
          }

          // Find first user with matching role
          const user = users.users.find(
            (u: { user_metadata?: { role?: string }; email?: string }) => u.user_metadata?.role === targetRole
          );

          if (!user?.email) {
            logger.warn('No user found with role', { role: targetRole });
            return null;
          }

          return user.email;
        },
        { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
      );

      return email;
    } catch (error) {
      logger.error(error, { component: 'NotificationAutomation', action: 'resolveRecipientEmail' });
      return null;
    }
  }

  /**
   * Resolve user by role (for SMS phone number resolution)
   */
  private static async resolveUserByRole(
    role: string
  ): Promise<{ email?: string; phone?: string } | null> {
    try {
      const { supabaseAdmin } = await import('./supabase');
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();

      if (!users?.users) return null;

      const user = users.users.find(
        (u: any) => u.user_metadata?.role === role
      );

      if (!user) return null;

      return {
        email: user.email || undefined,
        phone: user.user_metadata?.phone || user.phone || undefined
      };
    } catch (error) {
      logger.error(error, { component: 'NotificationAutomation', action: 'resolveUserByRole' });
      return null;
    }
  }

  private static async sendEmail(config: ActionConfig, notification: Notification, context?: AutomationContext): Promise<void> {
    try {
      const { sendEmailNotification } = await import('./notification-email-service');

      const recipientEmail = config.to ? await this.resolveRecipientEmail(config.to, context) : null;

      if (!recipientEmail) {
        logger.warn('No recipient found for email automation', { to: config.to });
        return;
      }

      // If a specific template is requested, we could customize the notification
      // For now, send with the standard template
      const notificationWithTemplate = config.template ? {
        ...notification,
        metadata: {
          ...notification.metadata,
          automationTemplate: config.template
        }
      } : notification;

      await sendEmailNotification(recipientEmail, notificationWithTemplate);

      logger.debug('Automation email sent', {
        to: recipientEmail,
        template: config.template,
        notificationId: notification.id
      });
    } catch (error) {
      logger.error(error, {
        component: 'NotificationAutomation',
        action: 'sendEmail',
        config
      });
    }
  }

  private static async createTask(config: ActionConfig, notification: Notification): Promise<void> {
    try {
      // Call the automation API route to create task with server-side token access
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

      const response = await fetch(`${baseUrl}/api/automation/create-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: config.title || notification.title,
          assignee: config.assignee,
          priority: config.priority,
          notificationId: notification.id,
          notes: notification.message,
          dueDate: config.dueDate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        logger.warn('Task creation failed', { error, config });
        return;
      }

      const result = await response.json();
      logger.debug('Automation task created', {
        taskId: result.taskId,
        title: config.title
      });
    } catch (error) {
      logger.error(error, {
        component: 'NotificationAutomation',
        action: 'createTask',
        config
      });
    }
  }

  private static async updateStatus(config: ActionConfig, context?: AutomationContext): Promise<void> {
    try {
      const { supabase } = await import('./supabase');
      const { drilldownCacheInvalidator } = await import('./cache/drilldown-cache-invalidator');
      const { universalCache } = await import('./cache/universal-cache');

      if (context?.order && config.newStatus) {
        // Validate status is valid for Order type
        const validOrderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Delivery Failed'];
        if (!validOrderStatuses.includes(config.newStatus)) {
          logger.warn('Invalid order status', { newStatus: config.newStatus });
          return;
        }

        const { error } = await supabase
          .from('orders')
          .update({
            status: config.newStatus,
            statusHistory: [
              ...(context.order.statusHistory || []),
              { status: config.newStatus, timestamp: new Date().toISOString() }
            ]
          })
          .eq('id', context.order.id);

        if (error) {
          logger.error(error, { component: 'NotificationAutomation', action: 'updateStatus', orderId: context.order.id });
          return;
        }

        // Invalidate caches using namespace tag
        await universalCache.invalidate('orders');
        await drilldownCacheInvalidator.invalidatePreview('order', context.order.id);

        logger.debug('Order status updated via automation', {
          orderId: context.order.id,
          status: config.newStatus
        });
      } else if (context?.maintenanceVisit && config.newStatus) {
        // Validate status is valid for MaintenanceVisit type
        const validMaintenanceStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Follow-up Required', 'Waiting for Parts'];
        if (!validMaintenanceStatuses.includes(config.newStatus)) {
          logger.warn('Invalid maintenance status', { newStatus: config.newStatus });
          return;
        }

        const { error } = await supabase
          .from('maintenance')
          .update({ status: config.newStatus })
          .eq('id', context.maintenanceVisit.id);

        if (error) {
          logger.error(error, { component: 'NotificationAutomation', action: 'updateStatus', visitId: context.maintenanceVisit.id });
          return;
        }

        // Invalidate caches using namespace tag
        await universalCache.invalidate('maintenance');

        logger.debug('Maintenance status updated via automation', {
          visitId: context.maintenanceVisit.id,
          status: config.newStatus
        });
      } else {
        logger.warn('No valid context for status update', { config });
      }
    } catch (error) {
      logger.error(error, {
        component: 'NotificationAutomation',
        action: 'updateStatus',
        config
      });
    }
  }

  private static async escalate(config: ActionConfig, notification: Notification): Promise<void> {
    const { NotificationService } = await import('./notification-service');

    // Create escalated notification
    await NotificationService.createNotification({
      ...notification,
      priority: 'critical',
      title: `[ESCALATED] ${notification.title}`,
      message: `Escalated to ${config.to}: ${notification.message}`,
    });
  }

  private static async scheduleFollowUp(config: ActionConfig, context?: AutomationContext): Promise<void> {
    try {
      const { supabase } = await import('./supabase');

      if (config.type === 'delivery_retry' && context?.order) {
        // Reschedule delivery
        const newDeliveryDate = addDays(new Date(), config.daysFromNow || 1);

        const { error } = await supabase
          .from('orders')
          .update({
            deliveryDate: newDeliveryDate.toISOString(),
            status: 'Pending' // Reset to pending for retry
          })
          .eq('id', context.order.id);

        if (error) {
          logger.error(error, { component: 'NotificationAutomation', action: 'scheduleFollowUp' });
          return;
        }

        logger.debug('Delivery rescheduled via automation', {
          orderId: context.order.id,
          newDate: newDeliveryDate.toISOString()
        });
      } else if (context?.maintenanceVisit) {
        // Schedule follow-up maintenance visit
        const scheduledDate = addDays(new Date(), config.daysFromNow || 3);

        const { error } = await supabase
          .from('maintenance')
          .insert({
            branchId: context.maintenanceVisit.branchId,
            companyId: context.maintenanceVisit.companyId,
            branchName: context.maintenanceVisit.branchName,
            companyName: context.maintenanceVisit.companyName,
            scheduledDate: scheduledDate.toISOString(),
            date: scheduledDate.toISOString(),
            status: 'Scheduled',
            visitType: 'customer_request',
            technicianName: context.maintenanceVisit.technicianName || 'TBD',
            maintenanceNotes: `Follow-up visit for ${context.maintenanceVisit.id}`,
            rootVisitId: context.maintenanceVisit.id
          });

        if (error) {
          logger.error(error, { component: 'NotificationAutomation', action: 'scheduleFollowUp' });
          return;
        }

        logger.debug('Follow-up visit scheduled via automation', {
          rootVisitId: context.maintenanceVisit.id,
          scheduledDate: scheduledDate.toISOString()
        });
      } else {
        logger.warn('No valid context for scheduling follow-up', { config });
      }
    } catch (error) {
      logger.error(error, {
        component: 'NotificationAutomation',
        action: 'scheduleFollowUp',
        config
      });
    }
  }

  private static async suspendOrders(config: ActionConfig, context?: AutomationContext): Promise<void> {
    try {
      const { supabase } = await import('./supabase');
      const { universalCache } = await import('./cache/universal-cache');

      let companyId: string | null = null;

      if (context?.company) {
        companyId = context.company.id;
      } else if (context?.order?.companyId) {
        companyId = context.order.companyId;
      }

      if (!companyId) {
        logger.warn('No company ID found for order suspension', { config });
        return;
      }

      const { error } = await supabase
        .from('companies')
        .update({
          is_suspended: true,
          suspension_reason: config.reason || 'Automated suspension'
        })
        .eq('id', companyId);

      if (error) {
        logger.error(error, { component: 'NotificationAutomation', action: 'suspendOrders' });
        return;
      }

      // Invalidate company cache using namespace tag
      await universalCache.invalidate('companies');

      logger.debug('Company orders suspended via automation', {
        companyId,
        reason: config.reason
      });
    } catch (error) {
      logger.error(error, {
        component: 'NotificationAutomation',
        action: 'suspendOrders',
        config
      });
    }
  }

  private static async sendSMS(config: ActionConfig, notification: Notification, context?: AutomationContext): Promise<void> {
    try {
      const { SMSService } = await import('./sms-service');

      let phoneNumber: string | null = null;

      // Resolve phone number based on recipient type
      if (config.to === 'client' && context?.company) {
        // Get first phone number from company contacts
        const contact = context.company.contacts?.[0];
        const rawPhone = contact?.phoneNumbers?.[0]?.number;
        if (rawPhone) {
          phoneNumber = SMSService.formatPhoneNumber(rawPhone);
        }
      } else if (config.to === 'manager' || config.to === 'supervisor') {
        // Get phone from user metadata
        const user = await this.resolveUserByRole(
          config.to === 'manager' ? 'Manager' : 'Admin'
        );
        if (user?.phone) {
          phoneNumber = SMSService.formatPhoneNumber(user.phone);
        }
      }

      if (!phoneNumber) {
        logger.warn('No phone number found for SMS automation', { to: config.to });
        return;
      }

      // Build SMS message
      const message = `SynergyFlow: ${notification.title}\n${notification.message}`;

      const success = await SMSService.sendSMS(phoneNumber, message);

      if (success) {
        logger.debug('Automation SMS sent', {
          to: phoneNumber,
          notificationId: notification.id
        });
      }
    } catch (error) {
      logger.error(error, {
        component: 'NotificationAutomation',
        action: 'sendSMS',
        config
      });
    }
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

