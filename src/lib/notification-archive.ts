import type { Notification } from './types';
import { differenceInDays } from 'date-fns';

export interface ArchivedNotification extends Notification {
  archivedAt: string;
}

const ARCHIVE_KEY = 'notification_archive';
const ARCHIVE_DAYS_THRESHOLD = 30;

export class NotificationArchive {
  static shouldArchive(notification: Notification): boolean {
    const daysSinceCreated = differenceInDays(new Date(), new Date(notification.createdAt));
    return notification.read && daysSinceCreated > ARCHIVE_DAYS_THRESHOLD;
  }

  static archiveNotifications(notifications: Notification[]): ArchivedNotification[] {
    const toArchive = notifications.filter(this.shouldArchive);
    const archived: ArchivedNotification[] = toArchive.map(n => ({
      ...n,
      archivedAt: new Date().toISOString(),
    }));

    const existing = this.getArchived();
    const combined = [...existing, ...archived];
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(combined));
    }

    return archived;
  }

  static getArchived(): ArchivedNotification[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(ARCHIVE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static searchArchived(query: string): ArchivedNotification[] {
    const archived = this.getArchived();
    const lowerQuery = query.toLowerCase();
    
    return archived.filter(n =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.message.toLowerCase().includes(lowerQuery)
    );
  }

  static restoreFromArchive(notificationId: string): Notification | null {
    const archived = this.getArchived();
    const notification = archived.find(n => n.id === notificationId);
    
    if (notification) {
      const remaining = archived.filter(n => n.id !== notificationId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(remaining));
      }
      
      const { archivedAt, ...restored } = notification;
      return restored;
    }
    
    return null;
  }

  static exportToCSV(notifications: (Notification | ArchivedNotification)[]): string {
    const headers = ['ID', 'Type', 'Priority', 'Title', 'Message', 'Created At', 'Read', 'Source'];
    const rows = notifications.map(n => [
      n.id,
      n.type,
      n.priority,
      `"${n.title.replace(/"/g, '""')}"`,
      `"${n.message.replace(/"/g, '""')}"`,
      n.createdAt,
      n.read ? 'Yes' : 'No',
      n.source,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  static downloadCSV(notifications: (Notification | ArchivedNotification)[], filename: string = 'notifications.csv') {
    const csv = this.exportToCSV(notifications);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  static clearArchive() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ARCHIVE_KEY);
    }
  }
}

