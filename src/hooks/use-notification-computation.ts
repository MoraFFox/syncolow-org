import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useProductsStore } from '@/store/use-products-store';
import { useCompanyStore } from '@/store/use-company-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useSettingsStore } from '@/store/use-settings-store';
import { useNotificationStore } from '@/store/use-notification-store';
import { generateNotifications } from '@/lib/notification-generator';

export function useNotificationComputation(userId: string | undefined) {
  const { orders } = useOrderStore();
  const { products } = useProductsStore();
  const { companies, feedback } = useCompanyStore();
  const { maintenanceVisits } = useMaintenanceStore();
  const { notificationSettings } = useSettingsStore();
  const {
    subscribeToNotifications,
    setNotifications,
    notifications,
    toastQueue,
    removeToastNotification,
    markAsRead,
    autoMarkAsReadByPath,
    cleanupOldNotifications,
    mergeDuplicates,
  } = useNotificationStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId);
    return () => unsubscribe();
  }, [userId, subscribeToNotifications]);

  useEffect(() => {
    if (
      orders?.length &&
      products?.length &&
      companies?.length &&
      userId &&
      notifications.length === 0
    ) {
      const newNotifications = generateNotifications({
        orders,
        products,
        companies,
        maintenanceVisits,
        feedback,
        settings: notificationSettings,
      });

      const notificationsWithUser = newNotifications.map((n) => ({
        ...n,
        userId,
      }));
      setNotifications(notificationsWithUser);
    }
  }, [
    orders,
    products,
    companies,
    maintenanceVisits,
    feedback,
    notificationSettings,
    setNotifications,
    userId,
    notifications.length,
  ]);

  const handleToastView = (notification: any) => {
    markAsRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  useEffect(() => {
    if (pathname && userId) {
      autoMarkAsReadByPath(pathname);
    }
  }, [pathname, userId, autoMarkAsReadByPath]);

  useEffect(() => {
    if (userId) {
      const interval = setInterval(() => {
        cleanupOldNotifications();
        mergeDuplicates();
      }, 24 * 60 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [userId, cleanupOldNotifications, mergeDuplicates]);

  return { toastQueue, removeToastNotification, handleToastView };
}
