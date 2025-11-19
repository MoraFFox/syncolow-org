import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, orderBy, limit, writeBatch, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
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
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      callback(notifications);
    });
  }

  /**
   * Create a new notification
   */
  static async createNotification(notification: Omit<Notification, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString(),
    });
    return docRef.id;
  }

  /**
   * Bulk create notifications
   */
  static async createNotifications(notifications: Omit<Notification, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    const collectionRef = collection(db, NOTIFICATIONS_COLLECTION);

    notifications.forEach(notification => {
      const docRef = doc(collectionRef);
      batch.set(docRef, {
        ...notification,
        createdAt: notification.createdAt || new Date().toISOString(),
      });
    });

    await batch.commit();
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
        isRead: true,
        readAt: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.code === 'not-found') {
        console.warn(`Notification ${notificationId} not found, skipping update`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(docSnapshot => {
      batch.update(docSnapshot.ref, {
        isRead: true,
        readAt: new Date().toISOString(),
      });
    });

    await batch.commit();
  }

  /**
   * Snooze a notification
   */
  static async snoozeNotification(notificationId: string, snoozeUntil: Date): Promise<void> {
    try {
      await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
        snoozedUntil: snoozeUntil.toISOString(),
        isRead: true,
      });
    } catch (error: any) {
      if (error.code === 'not-found') {
        console.warn(`Notification ${notificationId} not found, skipping snooze`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Clear snooze from a notification
   */
  static async clearSnooze(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
        snoozedUntil: null,
        isRead: false,
      });
    } catch (error: any) {
      if (error.code === 'not-found') {
        console.warn(`Notification ${notificationId} not found, skipping clear snooze`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
  }

  /**
   * Delete old notifications (older than X days)
   */
  static async cleanupOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('createdAt', '<', cutoffDate.toISOString())
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });

    await batch.commit();
  }

  /**
   * Record action taken on notification
   */
  static async recordAction(notificationId: string): Promise<void> {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      actionTakenAt: new Date().toISOString(),
      isRead: true,
    });
  }
}

