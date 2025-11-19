import type { Notification } from './types';
import { differenceInDays, subDays, startOfWeek, endOfWeek } from 'date-fns';

export interface NotificationInsight {
  type: 'trend' | 'pattern' | 'suggestion';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action?: string;
  actionLink?: string;
  metric?: number;
  change?: number;
}

export function generateInsights(notifications: Notification[]): NotificationInsight[] {
  const insights: NotificationInsight[] = [];
  const now = new Date();
  const lastWeek = subDays(now, 7);
  const previousWeek = subDays(now, 14);

  // Trend Analysis: Compare this week vs last week
  const thisWeekNotifications = notifications.filter(
    n => new Date(n.createdAt) >= lastWeek
  );
  const lastWeekNotifications = notifications.filter(
    n => new Date(n.createdAt) >= previousWeek && new Date(n.createdAt) < lastWeek
  );

  const thisWeekCount = thisWeekNotifications.length;
  const lastWeekCount = lastWeekNotifications.length;
  
  if (lastWeekCount > 0) {
    const change = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
    
    if (Math.abs(change) > 50) {
      insights.push({
        type: 'trend',
        severity: change > 0 ? 'warning' : 'info',
        title: `${change > 0 ? 'Increase' : 'Decrease'} in Notifications`,
        description: `${Math.abs(change).toFixed(0)}% ${change > 0 ? 'more' : 'fewer'} notifications this week compared to last week`,
        metric: thisWeekCount,
        change: change,
      });
    }
  }

  // Pattern Detection: Overdue Payments
  const overduePayments = notifications.filter(
    n => n.type === 'OVERDUE_PAYMENT' && !n.read
  );
  if (overduePayments.length >= 3) {
    const multiplier = Math.floor(overduePayments.length / 3);
    insights.push({
      type: 'pattern',
      severity: 'critical',
      title: `${multiplier}x More Overdue Payments`,
      description: `You have ${overduePayments.length} overdue payment notifications requiring immediate attention`,
      action: 'Review Payments',
      actionLink: '/payment-analytics',
      metric: overduePayments.length,
    });
  }

  // Pattern Detection: Delivery Issues
  const deliveryIssues = notifications.filter(
    n => (n.type === 'DELIVERY_FAILED' || n.type === 'DELIVERY_DELAY_RISK') && !n.read
  );
  if (deliveryIssues.length >= 2) {
    insights.push({
      type: 'pattern',
      severity: 'warning',
      title: 'Delivery Issues Detected',
      description: `${deliveryIssues.length} orders have delivery problems. Consider reviewing logistics`,
      action: 'View Orders',
      actionLink: '/orders',
      metric: deliveryIssues.length,
    });
  }

  // Pattern Detection: Client Satisfaction
  const lowSatisfaction = notifications.filter(
    n => n.type === 'LOW_CLIENT_SATISFACTION' && !n.read
  );
  if (lowSatisfaction.length > 0) {
    insights.push({
      type: 'pattern',
      severity: 'warning',
      title: 'Client Satisfaction Alert',
      description: `${lowSatisfaction.length} client(s) showing low satisfaction scores`,
      action: 'Review Feedback',
      actionLink: '/feedback',
      metric: lowSatisfaction.length,
    });
  }

  // Suggestion: Unread Critical Notifications
  const unreadCritical = notifications.filter(
    n => n.priority === 'critical' && !n.read
  );
  if (unreadCritical.length > 0) {
    insights.push({
      type: 'suggestion',
      severity: 'critical',
      title: 'Action Required',
      description: `${unreadCritical.length} critical notification(s) need immediate attention`,
      action: 'Review Now',
      metric: unreadCritical.length,
    });
  }

  // Suggestion: Old Unread Notifications
  const oldUnread = notifications.filter(
    n => !n.read && differenceInDays(now, new Date(n.createdAt)) > 3
  );
  if (oldUnread.length >= 5) {
    insights.push({
      type: 'suggestion',
      severity: 'info',
      title: 'Clear Old Notifications',
      description: `You have ${oldUnread.length} unread notifications older than 3 days`,
      action: 'Mark All Read',
      metric: oldUnread.length,
    });
  }

  // Pattern Detection: Maintenance Delays
  const maintenanceDelays = notifications.filter(
    n => n.type === 'MAINTENANCE_DELAYED' && !n.read
  );
  if (maintenanceDelays.length >= 2) {
    insights.push({
      type: 'pattern',
      severity: 'warning',
      title: 'Maintenance Backlog',
      description: `${maintenanceDelays.length} maintenance visits are delayed`,
      action: 'View Schedule',
      actionLink: '/maintenance',
      metric: maintenanceDelays.length,
    });
  }

  // Suggestion: Stock Depletion
  const stockWarnings = notifications.filter(
    n => n.type === 'STOCK_DEPLETION_WARNING' && !n.read
  );
  if (stockWarnings.length > 0) {
    insights.push({
      type: 'suggestion',
      severity: 'warning',
      title: 'Inventory Alert',
      description: `${stockWarnings.length} product(s) running low on stock`,
      action: 'Review Inventory',
      actionLink: '/products',
      metric: stockWarnings.length,
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function getInsightIcon(type: NotificationInsight['type']): string {
  switch (type) {
    case 'trend':
      return 'TrendingUp';
    case 'pattern':
      return 'Target';
    case 'suggestion':
      return 'Lightbulb';
    default:
      return 'Info';
  }
}

export function getInsightColor(severity: NotificationInsight['severity']): string {
  switch (severity) {
    case 'critical':
      return 'text-destructive bg-destructive/10 border-destructive/20';
    case 'warning':
      return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
    case 'info':
      return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

