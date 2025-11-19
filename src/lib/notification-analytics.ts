import type { Notification } from './types';
import { differenceInDays, differenceInHours, startOfDay, endOfDay, subDays } from 'date-fns';

export interface NotificationMetrics {
  total: number;
  unread: number;
  byPriority: { critical: number; warning: number; info: number };
  bySource: Record<string, number>;
  byType: Record<string, number>;
  avgResponseTime: number; // hours
  actionRate: number; // percentage
  dismissalRate: number; // percentage
  snoozedCount: number;
}

export interface TrendData {
  date: string;
  count: number;
  critical: number;
  warning: number;
  info: number;
}

export interface EngagementMetrics {
  openRate: number;
  actionCompletionRate: number;
  avgTimeToAction: number; // hours
  mostEngagedTypes: Array<{ type: string; rate: number }>;
  leastEngagedTypes: Array<{ type: string; rate: number }>;
}

/**
 * Calculate notification metrics
 */
export function calculateNotificationMetrics(notifications: Notification[]): NotificationMetrics {
  const now = new Date();
  
  const unread = notifications.filter(n => !n.read && (!n.snoozedUntil || new Date(n.snoozedUntil) <= now));
  const snoozed = notifications.filter(n => n.snoozedUntil && new Date(n.snoozedUntil) > now);
  
  const byPriority = {
    critical: notifications.filter(n => n.priority === 'critical').length,
    warning: notifications.filter(n => n.priority === 'warning').length,
    info: notifications.filter(n => n.priority === 'info').length,
  };

  const bySource: Record<string, number> = {};
  const byType: Record<string, number> = {};

  notifications.forEach(n => {
    bySource[n.source] = (bySource[n.source] || 0) + 1;
    byType[n.type] = (byType[n.type] || 0) + 1;
  });

  // Calculate response time
  const readNotifications = notifications.filter(n => n.read && n.readAt);
  const responseTimes = readNotifications.map(n => 
    differenceInHours(new Date(n.readAt!), new Date(n.createdAt))
  );
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;

  // Calculate action rate
  const withActions = notifications.filter(n => n.actionTakenAt).length;
  const actionRate = notifications.length > 0 ? (withActions / notifications.length) * 100 : 0;

  // Calculate dismissal rate (read but no action)
  const dismissed = notifications.filter(n => n.read && !n.actionTakenAt).length;
  const dismissalRate = notifications.length > 0 ? (dismissed / notifications.length) * 100 : 0;

  return {
    total: notifications.length,
    unread: unread.length,
    byPriority,
    bySource,
    byType,
    avgResponseTime,
    actionRate,
    dismissalRate,
    snoozedCount: snoozed.length,
  };
}

/**
 * Calculate trend data for charts
 */
export function calculateTrendData(notifications: Notification[], days: number = 7): TrendData[] {
  const trends: TrendData[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayNotifications = notifications.filter(n => {
      const created = new Date(n.createdAt);
      return created >= dayStart && created <= dayEnd;
    });

    trends.push({
      date: date.toISOString().split('T')[0],
      count: dayNotifications.length,
      critical: dayNotifications.filter(n => n.priority === 'critical').length,
      warning: dayNotifications.filter(n => n.priority === 'warning').length,
      info: dayNotifications.filter(n => n.priority === 'info').length,
    });
  }

  return trends;
}

/**
 * Calculate engagement metrics
 */
export function calculateEngagementMetrics(notifications: Notification[]): EngagementMetrics {
  const read = notifications.filter(n => n.read);
  const openRate = notifications.length > 0 ? (read.length / notifications.length) * 100 : 0;

  const withActions = notifications.filter(n => n.actionTakenAt);
  const actionCompletionRate = read.length > 0 ? (withActions.length / read.length) * 100 : 0;

  const actionTimes = withActions
    .filter(n => n.actionTakenAt)
    .map(n => differenceInHours(new Date(n.actionTakenAt!), new Date(n.createdAt)));
  const avgTimeToAction = actionTimes.length > 0 
    ? actionTimes.reduce((a, b) => a + b, 0) / actionTimes.length 
    : 0;

  // Calculate engagement by type
  const typeEngagement: Record<string, { total: number; actions: number }> = {};
  notifications.forEach(n => {
    if (!typeEngagement[n.type]) {
      typeEngagement[n.type] = { total: 0, actions: 0 };
    }
    typeEngagement[n.type].total++;
    if (n.actionTakenAt) {
      typeEngagement[n.type].actions++;
    }
  });

  const typeRates = Object.entries(typeEngagement).map(([type, data]) => ({
    type,
    rate: data.total > 0 ? (data.actions / data.total) * 100 : 0,
  }));

  const mostEngagedTypes = typeRates.sort((a, b) => b.rate - a.rate).slice(0, 5);
  const leastEngagedTypes = typeRates.sort((a, b) => a.rate - b.rate).slice(0, 5);

  return {
    openRate,
    actionCompletionRate,
    avgTimeToAction,
    mostEngagedTypes,
    leastEngagedTypes,
  };
}

/**
 * Identify notification patterns and anomalies
 */
export function analyzeNotificationPatterns(notifications: Notification[]): {
  patterns: string[];
  anomalies: string[];
  recommendations: string[];
} {
  const patterns: string[] = [];
  const anomalies: string[] = [];
  const recommendations: string[] = [];

  const metrics = calculateNotificationMetrics(notifications);
  const engagement = calculateEngagementMetrics(notifications);

  // Pattern: High critical notifications
  if (metrics.byPriority.critical > metrics.total * 0.3) {
    patterns.push('High volume of critical notifications (>30%)');
    recommendations.push('Review critical notification triggers to reduce alert fatigue');
  }

  // Pattern: Low action rate
  if (metrics.actionRate < 30) {
    patterns.push('Low action completion rate (<30%)');
    recommendations.push('Review notification relevance and action clarity');
  }

  // Pattern: High dismissal rate
  if (metrics.dismissalRate > 60) {
    patterns.push('High dismissal rate (>60%)');
    recommendations.push('Consider disabling low-value notification types');
  }

  // Anomaly: Slow response time
  if (metrics.avgResponseTime > 24) {
    anomalies.push('Average response time exceeds 24 hours');
    recommendations.push('Increase notification visibility or urgency indicators');
  }

  // Anomaly: Many snoozed notifications
  if (metrics.snoozedCount > metrics.total * 0.2) {
    anomalies.push('High snooze rate (>20%)');
    recommendations.push('Review notification timing and quiet hours settings');
  }

  // Pattern: Unbalanced sources
  const maxSource = Math.max(...Object.values(metrics.bySource));
  const minSource = Math.min(...Object.values(metrics.bySource));
  if (maxSource > minSource * 5) {
    patterns.push('Unbalanced notification sources');
    recommendations.push('Review notification distribution across modules');
  }

  return { patterns, anomalies, recommendations };
}

/**
 * Generate analytics report
 */
export function generateAnalyticsReport(notifications: Notification[], days: number = 30) {
  const recentNotifications = notifications.filter(n => 
    differenceInDays(new Date(), new Date(n.createdAt)) <= days
  );

  return {
    period: `Last ${days} days`,
    metrics: calculateNotificationMetrics(recentNotifications),
    trends: calculateTrendData(recentNotifications, Math.min(days, 30)),
    engagement: calculateEngagementMetrics(recentNotifications),
    analysis: analyzeNotificationPatterns(recentNotifications),
  };
}

