import type { Notification, Order, Company } from './types';
import { differenceInDays, differenceInHours } from 'date-fns';

interface PriorityScore {
  score: number; // 0-100
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  factors: string[];
}

/**
 * AI-powered priority scoring algorithm
 * Calculates urgency based on multiple factors
 */
export function calculateNotificationPriority(
  notification: Notification,
  context?: {
    order?: Order;
    company?: Company;
    relatedNotifications?: Notification[];
  }
): PriorityScore {
  let score = 0;
  const factors: string[] = [];

  // Base priority from notification type
  const basePriority = {
    critical: 80,
    warning: 50,
    info: 20,
  };
  score += basePriority[notification.priority];

  // Time sensitivity
  if (notification.metadata?.daysUntil !== undefined) {
    const daysUntil = notification.metadata.daysUntil;
    if (daysUntil <= 0) {
      score += 20;
      factors.push('Overdue');
    } else if (daysUntil <= 1) {
      score += 15;
      factors.push('Due today/tomorrow');
    } else if (daysUntil <= 3) {
      score += 10;
      factors.push('Due soon');
    }
  }

  // Financial impact
  if (notification.metadata?.amount) {
    const amount = notification.metadata.amount;
    if (amount > 50000) {
      score += 15;
      factors.push('Very high value');
    } else if (amount > 20000) {
      score += 10;
      factors.push('High value');
    } else if (amount > 10000) {
      score += 5;
      factors.push('Significant value');
    }
  }

  // Client importance
  if (context?.company) {
    if (context.company.currentPaymentScore && context.company.currentPaymentScore < 50) {
      score += 10;
      factors.push('At-risk client');
    }
    if (context.company.totalOutstandingAmount && context.company.totalOutstandingAmount > 50000) {
      score += 8;
      factors.push('High outstanding balance');
    }
  }

  // Order context
  if (context?.order) {
    if (context.order.grandTotal > 20000) {
      score += 5;
      factors.push('Large order');
    }
    if (context.order.status === 'Delivery Failed') {
      score += 15;
      factors.push('Failed delivery');
    }
  }

  // Recency - older unread notifications get higher priority
  const hoursOld = differenceInHours(new Date(), new Date(notification.createdAt));
  if (hoursOld > 48 && !notification.read) {
    score += 10;
    factors.push('Pending for 2+ days');
  } else if (hoursOld > 24 && !notification.read) {
    score += 5;
    factors.push('Pending for 1+ day');
  }

  // Grouped notifications with many items
  if (notification.isGroup && notification.items) {
    const itemCount = notification.items.length;
    if (itemCount > 10) {
      score += 10;
      factors.push(`${itemCount} items affected`);
    } else if (itemCount > 5) {
      score += 5;
      factors.push(`${itemCount} items affected`);
    }
  }

  // Related notifications (escalation)
  if (context?.relatedNotifications && context.relatedNotifications.length > 0) {
    const unreadRelated = context.relatedNotifications.filter(n => !n.read).length;
    if (unreadRelated > 3) {
      score += 8;
      factors.push('Multiple related alerts');
    }
  }

  // Cap score at 100
  score = Math.min(100, score);

  // Determine urgency level
  let urgency: PriorityScore['urgency'];
  if (score >= 80) urgency = 'immediate';
  else if (score >= 60) urgency = 'high';
  else if (score >= 40) urgency = 'medium';
  else urgency = 'low';

  return { score, urgency, factors };
}

/**
 * Smart grouping algorithm
 * Groups similar notifications to reduce noise
 */
export function groupSimilarNotifications(notifications: Notification[]): Notification[] {
  const grouped = new Map<string, Notification[]>();

  notifications.forEach(notification => {
    // Group by type and entity
    const key = `${notification.type}-${notification.entityId || 'general'}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(notification);
  });

  const result: Notification[] = [];

  grouped.forEach((group, key) => {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      // Create grouped notification
      const first = group[0];
      result.push({
        ...first,
        id: `grouped-${key}`,
        isGroup: true,
        title: `${group.length} ${first.type.replace(/_/g, ' ')} Alerts`,
        message: `Multiple ${first.source.toLowerCase()} notifications require attention`,
        items: group.map(n => ({
          id: n.id,
          title: n.title,
          link: n.link || '#',
          actionType: n.actionType || 'VIEW_ORDER',
          entityId: n.entityId || n.id,
        })),
      });
    }
  });

  return result;
}

/**
 * Generate AI summary for notifications
 */
export function generateNotificationSummary(notifications: Notification[]): string {
  const unread = notifications.filter(n => !n.read);
  const critical = unread.filter(n => n.priority === 'critical');
  const warning = unread.filter(n => n.priority === 'warning');

  if (unread.length === 0) {
    return "You're all caught up! No pending notifications.";
  }

  const parts: string[] = [];

  if (critical.length > 0) {
    parts.push(`${critical.length} critical ${critical.length === 1 ? 'issue' : 'issues'} need immediate attention`);
  }

  if (warning.length > 0) {
    parts.push(`${warning.length} ${warning.length === 1 ? 'warning' : 'warnings'}`);
  }

  const info = unread.length - critical.length - warning.length;
  if (info > 0) {
    parts.push(`${info} ${info === 1 ? 'update' : 'updates'}`);
  }

  return parts.join(', ') + '.';
}

/**
 * Suggest actions based on notification context
 */
export function suggestActions(notification: Notification): string[] {
  const suggestions: string[] = [];

  switch (notification.type) {
    case 'OVERDUE_PAYMENT':
      suggestions.push('Contact client about payment');
      suggestions.push('Send payment reminder email');
      suggestions.push('Review payment terms');
      break;

    case 'PAYMENT_DUE_SOON':
      suggestions.push('Send payment reminder');
      suggestions.push('Verify payment method on file');
      break;

    case 'STOCK_DEPLETION_WARNING':
      suggestions.push('Create purchase order');
      suggestions.push('Contact supplier');
      suggestions.push('Review sales forecast');
      break;

    case 'CLIENT_AT_RISK':
      suggestions.push('Schedule follow-up call');
      suggestions.push('Review account history');
      suggestions.push('Offer special promotion');
      break;

    case 'DELIVERY_DELAY_RISK':
      suggestions.push('Expedite order processing');
      suggestions.push('Contact client about delay');
      suggestions.push('Review delivery schedule');
      break;

    case 'MAINTENANCE_DELAYED':
      suggestions.push('Reschedule maintenance visit');
      suggestions.push('Contact client to apologize');
      suggestions.push('Assign backup technician');
      break;

    case 'LOW_CLIENT_SATISFACTION':
      suggestions.push('Schedule customer success call');
      suggestions.push('Review recent interactions');
      suggestions.push('Offer service improvement');
      break;

    default:
      suggestions.push('Review details');
      suggestions.push('Take appropriate action');
  }

  return suggestions;
}

/**
 * Determine if notification should trigger email
 */
export function shouldSendEmail(notification: Notification, priorityScore: PriorityScore): boolean {
  // Send email for immediate urgency
  if (priorityScore.urgency === 'immediate') return true;

  // Send email for critical priority
  if (notification.priority === 'critical') return true;

  // Send email for high-value items
  if (notification.metadata?.amount && notification.metadata.amount > 50000) return true;

  // Send email for overdue items
  if (notification.metadata?.daysUntil !== undefined && notification.metadata.daysUntil < 0) return true;

  return false;
}

/**
 * Determine quiet hours (don't send notifications)
 */
export function isQuietHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  // Quiet hours: 10 PM - 7 AM
  return hour >= 22 || hour < 7;
}

/**
 * Batch notifications for daily digest
 */
export function shouldBatchForDigest(notification: Notification): boolean {
  // Batch info-level notifications
  if (notification.priority === 'info') return true;

  // Batch non-urgent notifications
  if (notification.type === 'ORDER_STATUS_CHANGED' && notification.message.includes('Shipped')) {
    return true;
  }

  return false;
}

