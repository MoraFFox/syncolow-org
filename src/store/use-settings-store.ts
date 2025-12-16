
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NotificationType } from '@/lib/types';

export type ViewMode = 'Comfortable' | 'Compact' | 'Geospatial';
export type ThemeStyle = 'sleek' | 'flat' | 'high-contrast' | 'neumorphic' | 'bold';

// Defines the settings for each notification type
export type NotificationSettings = {
  [key in NotificationType]: {
    label: string;
    description: string;
    enabled: boolean;
  };
};

interface SettingsState {
  viewMode: ViewMode;
  ordersViewMode: 'list' | 'grid';
  paginationLimit: number;
  notificationSettings: NotificationSettings;
  setPaginationLimit: (limit: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setOrdersViewMode: (mode: 'list' | 'grid') => void;
  toggleNotificationType: (type: NotificationType) => void;
}

const defaultNotificationSettings: NotificationSettings = {
  OVERDUE_PAYMENT: { label: 'Overdue Payments', description: 'Alerts for orders with overdue payments.', enabled: true },
  PAYMENT_DUE_SOON: { label: 'Payment Due Soon', description: 'Early warning for payments due in 1-3 days.', enabled: true },
  BULK_PAYMENT_CYCLE_DUE: { label: 'Bulk Payment Cycle Due', description: 'Bulk payment cycles approaching due date.', enabled: true },
  STOCK_DEPLETION_WARNING: { label: 'Stock Depletion', description: 'Predictive alerts for items likely to run out of stock.', enabled: true },
  CLIENT_AT_RISK: { label: 'Clients at Risk', description: 'Notifications for clients who become inactive or at risk.', enabled: true },
  ORDER_STATUS_CHANGED: { label: 'Order Status Updates', description: 'Notifications for new orders and when orders are shipped.', enabled: true },
  DELIVERY_DELAY_RISK: { label: 'Delivery Delay Risk', description: 'Orders at risk of missing delivery date.', enabled: true },
  DELIVERY_FAILED: { label: 'Delivery Failed', description: 'Failed delivery attempts requiring action.', enabled: true },
  HIGH_VALUE_ORDER: { label: 'High Value Orders', description: 'Orders exceeding value threshold.', enabled: true },
  ORDER_CANCELLED: { label: 'Order Cancellations', description: 'Recent order cancellations.', enabled: false },
  MAINTENANCE_FOLLOW_UP_REQUIRED: { label: 'Maintenance Follow-ups', description: 'Action items for maintenance cases needing a follow-up visit.', enabled: true },
  MAINTENANCE_DUE_SOON: { label: 'Maintenance Due Soon', description: 'Periodic maintenance approaching.', enabled: true },
  MAINTENANCE_DELAYED: { label: 'Maintenance Delayed', description: 'Maintenance visits delayed more than 3 days.', enabled: true },
  SPARE_PARTS_NEEDED: { label: 'Spare Parts Needed', description: 'Maintenance waiting for spare parts.', enabled: true },
  NEW_FEEDBACK: { label: 'New Feedback', description: 'New customer feedback submitted.', enabled: true },
  LOW_CLIENT_SATISFACTION: { label: 'Low Client Satisfaction', description: 'Clients with declining feedback scores.', enabled: true },
  SALES_VELOCITY_DROP: { label: 'Sales Velocity Drop', description: 'Products with declining sales trends.', enabled: false },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      viewMode: 'Comfortable',
      ordersViewMode: 'list',
      paginationLimit: 20,
      notificationSettings: defaultNotificationSettings,
      setPaginationLimit: (limit) => set({ paginationLimit: limit }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setOrdersViewMode: (mode) => set({ ordersViewMode: mode }),
      toggleNotificationType: (type: NotificationType) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            [type]: {
              ...state.notificationSettings[type],
              enabled: !state.notificationSettings[type].enabled,
            },
          },
        })),
    }),
    {
      name: 'synergyflow-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

