# Advanced Notification System

## Overview

The SynergyFlow ERP notification system is an intelligent, real-time alert system that keeps users informed about critical business events, upcoming deadlines, and actionable items across all modules.

## Architecture

### Components

1. **Notification Generator** (`lib/notification-generator.ts`)
   - Pure function that analyzes business data
   - Generates notifications based on business rules
   - Configurable via user settings

2. **Notification Service** (`lib/notification-service.ts`)
   - Firestore persistence layer
   - Real-time subscriptions via `onSnapshot`
   - CRUD operations for notifications

3. **Notification Store** (`store/use-order-store.ts`)
   - Zustand state management
   - Integrates with Firestore service
   - Handles local state updates

4. **UI Components**
   - `NotificationCenter` - Header bell icon with popover
   - `NotificationsPage` - Full notification center with filtering
   - Toast notifications for urgent alerts

### Data Flow

```
Business Data (Orders, Clients, etc.)
    ↓
Notification Generator (analyzes & creates notifications)
    ↓
Firestore Collection (persistence)
    ↓
Real-time Subscription (onSnapshot)
    ↓
Zustand Store (local state)
    ↓
UI Components (display)
```

## Notification Types

### Payment Notifications
- **OVERDUE_PAYMENT** - Orders with overdue payments (Critical)
- **PAYMENT_DUE_SOON** - Payments due in 1-3 days (Warning)
- **BULK_PAYMENT_CYCLE_DUE** - Bulk payment cycles approaching (Warning/Info)

### Inventory Notifications
- **STOCK_DEPLETION_WARNING** - Products projected to run out (Warning)
- **SALES_VELOCITY_DROP** - Products with declining sales (Info)

### Client Notifications
- **CLIENT_AT_RISK** - Inactive or at-risk clients (Warning)
- **LOW_CLIENT_SATISFACTION** - Clients with low feedback scores (Warning)

### Order Notifications
- **ORDER_STATUS_CHANGED** - New orders and status updates (Info)
- **DELIVERY_DELAY_RISK** - Orders at risk of missing delivery (Warning)
- **DELIVERY_FAILED** - Failed delivery attempts (Critical)
- **HIGH_VALUE_ORDER** - Orders exceeding $10k threshold (Info)
- **ORDER_CANCELLED** - Recent cancellations (Info)

### Maintenance Notifications
- **MAINTENANCE_FOLLOW_UP_REQUIRED** - Cases needing follow-up (Warning)
- **MAINTENANCE_DUE_SOON** - Scheduled visits in next 3 days (Info)
- **MAINTENANCE_DELAYED** - Visits delayed >3 days (Warning)
- **SPARE_PARTS_NEEDED** - Cases waiting for parts (Warning)

### Feedback Notifications
- **NEW_FEEDBACK** - New customer feedback (Info/Warning)

## Features

### Real-time Updates
- Firestore `onSnapshot` subscriptions
- Automatic UI updates when data changes
- Multi-device synchronization

### Smart Grouping
- Related notifications grouped together
- Expandable accordion for grouped items
- Individual actions on grouped items

### Priority System
- **Critical** - Requires immediate attention (red)
- **Warning** - Important but not urgent (yellow)
- **Info** - Informational updates (blue)

### User Controls
- Mark as read/unread
- Snooze for 1 hour or 1 day
- Filter by priority, source, or read status
- Search notifications by title/message
- Bulk mark all as read

### Persistence
- Notifications stored in Firestore
- Survives page refreshes
- Historical notification log
- Auto-cleanup of old notifications (30 days)

## Configuration

### User Settings (`settings/page.tsx`)

Users can enable/disable each notification type:

```typescript
const notificationSettings = {
  OVERDUE_PAYMENT: { enabled: true },
  PAYMENT_DUE_SOON: { enabled: true },
  STOCK_DEPLETION_WARNING: { enabled: true },
  // ... etc
}
```

### Thresholds

Configurable thresholds in `notification-generator.ts`:

- Stock depletion: 14 days
- Payment due soon: 1-3 days
- High value order: $10,000
- Maintenance delay: 3 days
- Low satisfaction: <3/5 rating

## Usage

### Subscribe to Notifications

```typescript
import { useOrderStore } from '@/store/use-order-store';

function MyComponent() {
  const { notifications, subscribeToNotifications } = useOrderStore();
  
  useEffect(() => {
    const unsubscribe = subscribeToNotifications(userId);
    return unsubscribe;
  }, [userId]);
}
```

### Create Custom Notification

```typescript
import { NotificationService } from '@/lib/notification-service';

await NotificationService.createNotification({
  userId: 'user123',
  type: 'ORDER_STATUS_CHANGED',
  priority: 'info',
  title: 'Order Shipped',
  message: 'Your order has been shipped',
  icon: 'Truck',
  source: 'Orders',
  createdAt: new Date().toISOString(),
  isRead: false,
  isGroup: false,
  link: '/orders/123',
});
```

### Mark as Read

```typescript
const { markNotificationAsRead } = useOrderStore();
markNotificationAsRead(notificationId);
```

## Best Practices

1. **Keep notifications actionable** - Every notification should have a clear action
2. **Use appropriate priority** - Don't overuse critical priority
3. **Group related items** - Reduce notification fatigue
4. **Provide context** - Include relevant details in message
5. **Set expiration** - Auto-expire time-sensitive notifications
6. **Test thoroughly** - Verify notification logic with edge cases

## Future Enhancements

### Phase 2 (Planned)
- Email notifications for critical alerts
- Browser push notifications
- Notification analytics dashboard
- Custom notification rules builder
- AI-powered priority scoring

### Phase 3 (Future)
- SMS/WhatsApp integration
- Workflow automation triggers
- Mobile app notifications
- A/B testing framework
- Notification templates

## Firestore Schema

### Collection: `notifications`

```typescript
{
  id: string;
  userId: string;
  type: NotificationType;
  priority: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  icon: string;
  source: string;
  createdAt: string; // ISO 8601
  isRead: boolean;
  readAt?: string;
  snoozedUntil?: string;
  isGroup: boolean;
  items?: NotificationItem[];
  actionType?: NotificationActionType;
  entityId?: string;
  link?: string;
  metadata?: {
    amount?: number;
    daysUntil?: number;
    clientName?: string;
    orderCount?: number;
  };
}
```

## Troubleshooting

### Notifications not appearing
1. Check Firestore rules allow read/write
2. Verify user is authenticated
3. Check notification settings (not disabled)
4. Verify data exists (orders, products, etc.)

### Notifications not updating
1. Check Firestore subscription is active
2. Verify network connection
3. Check browser console for errors
4. Refresh page to re-establish connection

### Performance issues
1. Limit notification query (default: 50)
2. Enable auto-cleanup of old notifications
3. Optimize notification generation logic
4. Use pagination for large notification lists

## API Reference

### NotificationService

- `subscribeToNotifications(userId, callback, limit?)` - Subscribe to real-time updates
- `createNotification(notification)` - Create single notification
- `createNotifications(notifications)` - Bulk create notifications
- `markAsRead(notificationId)` - Mark notification as read
- `markAllAsRead(userId)` - Mark all user notifications as read
- `snoozeNotification(notificationId, snoozeUntil)` - Snooze notification
- `clearSnooze(notificationId)` - Clear snooze
- `deleteNotification(notificationId)` - Delete notification
- `cleanupOldNotifications(userId, daysOld)` - Delete old notifications
- `recordAction(notificationId)` - Record action taken

### Store Actions

- `markNotificationAsRead(id)` - Mark as read (syncs to Firestore)
- `markAllNotificationsAsRead()` - Mark all as read
- `snoozeNotification(id, date)` - Snooze notification
- `clearSnooze(id)` - Clear snooze
- `setNotifications(notifications)` - Set notifications array
- `subscribeToNotifications(userId)` - Subscribe to real-time updates
- `syncNotificationsToFirestore(userId)` - Sync local to Firestore
