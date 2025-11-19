/** @format */

import { create } from "zustand";
import type { Notification } from "@/lib/types";
import { NotificationService } from "@/lib/notification-service";

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  toastQueue: Notification[];
  
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  snoozeNotification: (notificationId: string, snoozeUntil: Date) => Promise<void>;
  clearSnooze: (notificationId: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => () => void;
  addToastNotification: (notification: Notification) => void;
  removeToastNotification: (notificationId: string) => void;
  autoMarkAsReadByPath: (currentPath: string) => Promise<void>;
  cleanupOldNotifications: () => Promise<void>;
  mergeDuplicates: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  toastQueue: [],

  setNotifications: (notifications) => set({ notifications }),

  markAsRead: async (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
    }));
    await NotificationService.markAsRead(notificationId);
  },

  markAllAsRead: async (userId) => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }));
    await NotificationService.markAllAsRead(userId);
  },

  snoozeNotification: async (notificationId, snoozeUntil) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId
          ? { ...n, snoozedUntil: snoozeUntil.toISOString(), isRead: true }
          : n
      ),
    }));
    await NotificationService.snoozeNotification(notificationId, snoozeUntil);
  },

  clearSnooze: async (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId
          ? { ...n, snoozedUntil: undefined, isRead: false }
          : n
      ),
    }));
    await NotificationService.clearSnooze(notificationId);
  },

  subscribeToNotifications: (userId: string) => {
    set({ loading: true });
    const unsubscribe = NotificationService.subscribeToNotifications(
      userId,
      (notifications) => {
        const prevNotifications = get().notifications;
        const newNotifications = notifications.filter(
          (n) => !prevNotifications.some((prev) => prev.id === n.id)
        );
        
        newNotifications.forEach((notification) => {
          if ((notification.priority === 'critical' || notification.priority === 'warning') && !notification.read) {
            get().addToastNotification(notification);
          }
        });
        
        set({ notifications, loading: false });
      }
    );
    return unsubscribe;
  },

  addToastNotification: (notification) => {
    set((state) => ({
      toastQueue: [...state.toastQueue, notification].slice(-3),
    }));
  },

  removeToastNotification: (notificationId) => {
    set((state) => ({
      toastQueue: state.toastQueue.filter((n) => n.id !== notificationId),
    }));
  },

  autoMarkAsReadByPath: async (currentPath: string) => {
    const { shouldAutoMarkAsRead } = await import('@/lib/smart-notifications');
    const { notifications, markAsRead } = get();
    
    const toMarkAsRead = notifications.filter(
      (n) => !n.read && shouldAutoMarkAsRead(n, currentPath)
    );
    
    await Promise.all(toMarkAsRead.map((n) => markAsRead(n.id)));
  },

  cleanupOldNotifications: async () => {
    const { shouldAutoDismiss } = await import('@/lib/smart-notifications');
    const { notifications, markAsRead } = get();
    
    const toDismiss = notifications.filter(shouldAutoDismiss);
    await Promise.all(toDismiss.map((n) => markAsRead(n.id)));
  },

  mergeDuplicates: () => {
    const { findDuplicateNotifications } = require('@/lib/smart-notifications');
    const { notifications } = get();
    
    const duplicates = findDuplicateNotifications(notifications);
    
    if (duplicates.size > 0) {
      const filtered = notifications.filter((n) => {
        for (const [, dupIds] of duplicates) {
          if (dupIds.includes(n.id)) return false;
        }
        return true;
      });
      
      set({ notifications: filtered });
    }
  },
}));

