
import { supabase } from './supabase';
import type { Notification } from './types';
import { logger } from './logger';

const NOTIFICATIONS_COLLECTION = 'notifications';

export class NotificationService {
  /**
   * Subscribe to real-time notifications for a user
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    limitCount: number = 50
  ) {
    // Initial fetch
    (async () => {
      try {
        const { data } = await supabase
          .from(NOTIFICATIONS_COLLECTION)
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false })
          .limit(limitCount);
        
        if (data) {
          callback(data as Notification[]);
        }
      } catch (error) {
        logger.error(error, { component: 'NotificationService', action: 'subscribeToNotifications' });
      }
    })();

    // Realtime subscription
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: NOTIFICATIONS_COLLECTION,
          filter: `userId=eq.${userId}`,
        },
        async () => {
          // Re-fetch notifications on any change to ensure correct order and limit
          // Or we could optimistically update, but re-fetching is safer for now
          try {
            const { data } = await supabase
              .from(NOTIFICATIONS_COLLECTION)
              .select('*')
              .eq('userId', userId)
              .order('createdAt', { ascending: false })
              .limit(limitCount);
            
            if (data) {
              callback(data as Notification[]);
            }
          } catch (error) {
            logger.error(error, { component: 'NotificationService', action: 'realtime-callback' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Create a new notification
   */
  static async createNotification(notification: Omit<Notification, 'id'>): Promise<string> {
    const { data, error } = await supabase
      .from(NOTIFICATIONS_COLLECTION)
      .insert({
        ...notification,
        createdAt: notification.createdAt || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return (data as Notification).id;
  }

  /**
   * Bulk create notifications
   */
  static async createNotifications(notifications: Omit<Notification, 'id'>[]): Promise<void> {
    const { error } = await supabase
      .from(NOTIFICATIONS_COLLECTION)
      .insert(
        notifications.map(notification => ({
          ...notification,
          createdAt: notification.createdAt || new Date().toISOString(),
        }))
      );

    if (error) throw error;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from(NOTIFICATIONS_COLLECTION)
      .update({
        read: true,
        readAt: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
        logger.warn(`Error updating notification ${notificationId}`, { component: 'NotificationService' });
        logger.error(error, { component: 'NotificationService', action: 'markAsRead' });
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from(NOTIFICATIONS_COLLECTION)
      .update({
        read: true,
        readAt: new Date().toISOString(),
      })
      .eq('userId', userId)
      .eq('read', false);

    if (error) throw error;
  }

  /**
   * Snooze a notification
   */
  static async snoozeNotification(notificationId: string, snoozeUntil: Date): Promise<void> {
    const { error } = await supabase
      .from(NOTIFICATIONS_COLLECTION)
      .update({
        snoozedUntil: snoozeUntil.toISOString(),
        read: true,
      })
      .eq('id', notificationId);

    if (error) {
        logger.warn(`Error snoozing notification ${notificationId}`, { component: 'NotificationService' });
        logger.error(error, { component: 'NotificationService', action: 'snoozeNotification' });
    }
  }

  /**
   * Clear snooze from a notification
   */
  static async clearSnooze(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from(NOTIFICATIONS_COLLECTION)
      .update({
        snoozedUntil: null,
        read: false,
      })
      .eq('id', notificationId);

    if (error) {
        logger.warn(`Error clearing snooze for notification ${notificationId}`, { component: 'NotificationService' });
        logger.error(error, { component: 'NotificationService', action: 'clearSnooze' });
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(NOTIFICATIONS_COLLECTION)
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      logger.error(error, {
        component: 'NotificationService',
        action: 'deleteNotification',
        notificationId,
      });
      throw new Error('Failed to delete notification. Please try again.');
    }
  }

  /**
   * Delete old notifications (older than X days)
   */
  static async cleanupOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from(NOTIFICATIONS_COLLECTION)
        .delete()
        .eq('userId', userId)
        .lt('createdAt', cutoffDate.toISOString());

      if (error) throw error;
    } catch (error) {
      logger.error(error, {
        component: 'NotificationService',
        action: 'cleanupOldNotifications',
        userId,
        daysOld,
      });
      // Don't throw - cleanup is non-critical
      logger.warn('Notification cleanup failed but continuing', { component: 'NotificationService' });
    }
  }

  /**
   * Record action taken on notification
   */
  static async recordAction(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(NOTIFICATIONS_COLLECTION)
        .update({
          actionTakenAt: new Date().toISOString(),
          read: true,
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      logger.error(error, {
        component: 'NotificationService',
        action: 'recordAction',
        notificationId,
      });
      // Don't throw - action recording is non-critical
    }
  }
}
