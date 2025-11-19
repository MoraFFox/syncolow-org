/**
 * Browser Push Notification Service
 * Implements Web Push API for desktop notifications
 */

import { useState, useEffect } from 'react';

export class PushNotificationService {
  private static vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  /**
   * Check if push notifications are supported
   */
  static isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Get current permission status
   */
  static getPermission(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Request push notification permission
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey) as BufferSource,
      });

      // Save subscription to Firestore
      await this.saveSubscription(userId, subscription);

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribe(userId: string): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscription(userId);
      }
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
    }
  }

  /**
   * Show local notification (fallback)
   */
  static async showNotification(title: string, options: NotificationOptions): Promise<void> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',

        ...options,
      });
    } catch (error) {
      console.error('Show notification failed:', error);
    }
  }

  /**
   * Save subscription to Firestore
   */
  private static async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    const { db } = await import('./firebase');
    const { doc, setDoc } = await import('firebase/firestore');

    await setDoc(doc(db, 'pushSubscriptions', userId), {
      subscription: subscription.toJSON(),
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  }

  /**
   * Remove subscription from Firestore
   */
  private static async removeSubscription(userId: string): Promise<void> {
    const { db } = await import('./firebase');
    const { doc, deleteDoc } = await import('firebase/firestore');

    await deleteDoc(doc(db, 'pushSubscriptions', userId));
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

/**
 * Hook for push notifications
 */
export function usePushNotifications(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (PushNotificationService.isSupported()) {
      setPermission(PushNotificationService.getPermission());
    }
  }, []);

  const requestPermission = async () => {
    const result = await PushNotificationService.requestPermission();
    setPermission(result);
    
    if (result === 'granted' && userId) {
      const subscription = await PushNotificationService.subscribe(userId);
      setIsSubscribed(!!subscription);
    }
  };

  const unsubscribe = async () => {
    if (userId) {
      await PushNotificationService.unsubscribe(userId);
      setIsSubscribed(false);
    }
  };

  return { permission, isSubscribed, requestPermission, unsubscribe };
}

