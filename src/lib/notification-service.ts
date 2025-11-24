
import { supabase } from './supabase';
import type { Notification } from './types';

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
    supabase
      .from(NOTIFICATIONS_COLLECTION)
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(limitCount)
      .then(({ data }) => {
        if (data) callback(data as Notification[]);
      });

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
        (payload) => {
          // Re-fetch notifications on any change to ensure correct order and limit
          // Or we could optimistically update, but re-fetching is safer for now
          supabase
            .from(NOTIFICATIONS_COLLECTION)
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false })
            .limit(limitCount)
            .then(({ data }) => {
              if (data) callback(data as Notification[]);
            });
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
        console.warn(`Error updating notification ${notificationId}:`, error);
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
        console.warn(`Error snoozing notification ${notificationId}:`, error);
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
        console.warn(`Error clearing snooze for notification ${notificationId}:`, error);
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    await supabase.from(NOTIFICATIONS_COLLECTION).delete().eq('id', notificationId);
  }

  /**
   * Delete old notifications (older than X days)
   */
  static async cleanupOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await supabase
      .from(NOTIFICATIONS_COLLECTION)
      .delete()
      .eq('userId', userId)
      .lt('createdAt', cutoffDate.toISOString());
  }

  /**
   * Record action taken on notification
   */
  static async recordAction(notificationId: string): Promise<void> {
    await supabase
      .from(NOTIFICATIONS_COLLECTION)
      .update({
        actionTakenAt: new Date().toISOString(),
        read: true,
      })
      .eq('id', notificationId);
  }
}
