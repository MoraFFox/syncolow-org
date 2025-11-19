import type { Notification } from './types';
import { differenceInMinutes, startOfHour, format, startOfDay, differenceInDays } from 'date-fns';

export interface NotificationMetrics {
  totalNotifications: number;
  averageResponseTime: number;
  actionCompletionRate: number;
  dismissalRate: number;
  mostCommonTypes: Array<{ type: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  priorityDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
}

export function calculateAdvancedMetrics(notifications: Notification[]): NotificationMetrics {
  const totalNotifications = notifications.length;
  
  // Average response time (time to mark as read)
  const responseTimes = notifications
    .filter(n => n.read && n.readAt)
    .map(n => differenceInMinutes(new Date(n.readAt!), new Date(n.createdAt)));
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  // Action completion rate
  const withActions = notifications.filter(n => n.actionType);
  const actionsCompleted = notifications.filter(n => n.actionTakenAt);
  const actionCompletionRate = withActions.length > 0
    ? (actionsCompleted.length / withActions.length) * 100
    : 0;

  // Dismissal rate (marked as read without action)
  const dismissed = notifications.filter(n => n.read && !n.actionTakenAt);
  const dismissalRate = totalNotifications > 0
    ? (dismissed.length / totalNotifications) * 100
    : 0;

  // Most common types
  const typeCounts = new Map<string, number>();
  notifications.forEach(n => {
    typeCounts.set(n.type, (typeCounts.get(n.type) || 0) + 1);
  });
  const mostCommonTypes = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Peak hours
  const hourCounts = new Map<number, number>();
  notifications.forEach(n => {
    const hour = new Date(n.createdAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  const peakHours = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Priority distribution
  const priorityDistribution: Record<string, number> = {};
  notifications.forEach(n => {
    priorityDistribution[n.priority] = (priorityDistribution[n.priority] || 0) + 1;
  });

  // Source distribution
  const sourceDistribution: Record<string, number> = {};
  notifications.forEach(n => {
    sourceDistribution[n.source] = (sourceDistribution[n.source] || 0) + 1;
  });

  return {
    totalNotifications,
    averageResponseTime,
    actionCompletionRate,
    dismissalRate,
    mostCommonTypes,
    peakHours,
    priorityDistribution,
    sourceDistribution,
  };
}

export function generateHeatmapData(notifications: Notification[]): Array<{ day: number; hour: number; count: number }> {
  const heatmap = new Map<string, number>();
  
  notifications.forEach(n => {
    const date = new Date(n.createdAt);
    const day = date.getDay();
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    heatmap.set(key, (heatmap.get(key) || 0) + 1);
  });

  return Array.from(heatmap.entries()).map(([key, count]) => {
    const [day, hour] = key.split('-').map(Number);
    return { day, hour, count };
  });
}

export function calculateEngagementScore(notifications: Notification[]): number {
  if (notifications.length === 0) return 0;

  const readRate = (notifications.filter(n => n.read).length / notifications.length) * 100;
  const actionRate = (notifications.filter(n => n.actionTakenAt).length / notifications.length) * 100;
  const avgResponseTime = calculateAdvancedMetrics(notifications).averageResponseTime;
  
  // Lower response time is better (max 60 minutes for full score)
  const responseScore = Math.max(0, 100 - (avgResponseTime / 60) * 100);
  
  // Weighted average
  return (readRate * 0.3 + actionRate * 0.4 + responseScore * 0.3);
}

