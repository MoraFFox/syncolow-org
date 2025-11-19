import type { Notification } from './types';
import { differenceInHours } from 'date-fns';

export function suggestSnoozeDuration(notification: Notification): 'hour' | 'day' | 'week' {
  switch (notification.type) {
    case 'PAYMENT_DUE_SOON':
      return 'day';
    case 'MAINTENANCE_DUE_SOON':
      return 'day';
    case 'STOCK_DEPLETION_WARNING':
      return 'week';
    case 'DELIVERY_DELAY_RISK':
      return 'hour';
    case 'HIGH_VALUE_ORDER':
      return 'hour';
    default:
      return 'day';
  }
}

export function shouldAutoDismiss(notification: Notification): boolean {
  const hoursSinceCreated = differenceInHours(new Date(), new Date(notification.createdAt));
  
  if (notification.read && hoursSinceCreated > 24) {
    return true;
  }
  
  if (notification.priority === 'info' && hoursSinceCreated > 72) {
    return true;
  }
  
  return false;
}

export function findDuplicateNotifications(notifications: Notification[]): Map<string, string[]> {
  const duplicates = new Map<string, string[]>();
  const seen = new Map<string, string>();
  
  notifications.forEach(notification => {
    const key = `${notification.type}-${notification.entityId || notification.title}`;
    
    if (seen.has(key)) {
      const originalId = seen.get(key)!;
      if (!duplicates.has(originalId)) {
        duplicates.set(originalId, []);
      }
      duplicates.get(originalId)!.push(notification.id);
    } else {
      seen.set(key, notification.id);
    }
  });
  
  return duplicates;
}

export function getRelatedPagePath(notification: Notification): string | null {
  if (notification.link) return notification.link;
  
  switch (notification.type) {
    case 'OVERDUE_PAYMENT':
    case 'PAYMENT_DUE_SOON':
    case 'BULK_PAYMENT_CYCLE_DUE':
      return '/payment-analytics';
    case 'ORDER_STATUS_CHANGED':
    case 'HIGH_VALUE_ORDER':
    case 'ORDER_CANCELLED':
    case 'DELIVERY_DELAY_RISK':
    case 'DELIVERY_FAILED':
      return '/orders';
    case 'STOCK_DEPLETION_WARNING':
      return '/products';
    case 'CLIENT_AT_RISK':
    case 'LOW_CLIENT_SATISFACTION':
      return '/clients';
    case 'MAINTENANCE_FOLLOW_UP_REQUIRED':
    case 'MAINTENANCE_DUE_SOON':
    case 'MAINTENANCE_DELAYED':
    case 'SPARE_PARTS_NEEDED':
      return '/maintenance';
    case 'NEW_FEEDBACK':
      return '/feedback';
    default:
      return null;
  }
}

export function shouldAutoMarkAsRead(notification: Notification, currentPath: string): boolean {
  const relatedPath = getRelatedPagePath(notification);
  
  if (!relatedPath) return false;
  
  if (currentPath.startsWith(relatedPath)) {
    if (notification.entityId && currentPath.includes(notification.entityId)) {
      return true;
    }
    
    if (notification.priority === 'info') {
      return true;
    }
  }
  
  return false;
}

