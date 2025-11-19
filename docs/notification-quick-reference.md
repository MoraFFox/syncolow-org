# Notification System - Quick Reference

## 🚀 Quick Start

### Subscribe to Notifications
```typescript
import { useOrderStore } from '@/store/use-order-store';

const { notifications, subscribeToNotifications } = useOrderStore();

useEffect(() => {
  const unsubscribe = subscribeToNotifications(userId);
  return unsubscribe;
}, [userId]);
```

### Create Notification
```typescript
import { NotificationService } from '@/lib/notification-service';

await NotificationService.createNotification({
  userId: 'user123',
  type: 'ORDER_STATUS_CHANGED',
  priority: 'info',
  title: 'Order Shipped',
  message: 'Order #12345 has been shipped',
  icon: 'Truck',
  source: 'Orders',
  createdAt: new Date().toISOString(),
  isRead: false,
  isGroup: false,
  link: '/orders/12345',
});
```

### Mark as Read
```typescript
const { markNotificationAsRead } = useOrderStore();
await markNotificationAsRead(notificationId);
```

## 📋 Notification Types

| Type | Priority | Icon | Description |
|------|----------|------|-------------|
| `OVERDUE_PAYMENT` | Critical | CreditCard | Overdue payments |
| `PAYMENT_DUE_SOON` | Warning | Clock | Payments due in 1-3 days |
| `BULK_PAYMENT_CYCLE_DUE` | Warning | DollarSign | Bulk payment cycles |
| `STOCK_DEPLETION_WARNING` | Warning | Package | Low stock alerts |
| `CLIENT_AT_RISK` | Warning | UserX | Inactive clients |
| `ORDER_STATUS_CHANGED` | Info | ShoppingCart | Order updates |
| `DELIVERY_DELAY_RISK` | Warning | AlertTriangle | Delivery delays |
| `DELIVERY_FAILED` | Critical | XCircle | Failed deliveries |
| `HIGH_VALUE_ORDER` | Info | TrendingUp | High value orders |
| `ORDER_CANCELLED` | Info | Ban | Cancelled orders |
| `MAINTENANCE_FOLLOW_UP_REQUIRED` | Warning | Wrench | Follow-up needed |
| `MAINTENANCE_DUE_SOON` | Info | Calendar | Upcoming maintenance |
| `MAINTENANCE_DELAYED` | Warning | AlertCircle | Delayed maintenance |
| `SPARE_PARTS_NEEDED` | Warning | Package | Parts needed |
| `NEW_FEEDBACK` | Info | MessageSquare | New feedback |
| `LOW_CLIENT_SATISFACTION` | Warning | Frown | Low satisfaction |
| `SALES_VELOCITY_DROP` | Info | TrendingDown | Declining sales |

## 🎨 Priority Levels

```typescript
type Priority = 'critical' | 'warning' | 'info';

// Critical - Red, requires immediate action
// Warning - Yellow, important but not urgent
// Info - Blue, informational updates
```

## 🔧 Common Operations

### Filter Notifications
```typescript
const unreadNotifications = notifications.filter(n => !n.isRead);
const criticalNotifications = notifications.filter(n => n.priority === 'critical');
const orderNotifications = notifications.filter(n => n.source === 'Orders');
```

### Snooze Notification
```typescript
const { snoozeNotification } = useOrderStore();
const snoozeUntil = addHours(new Date(), 1); // 1 hour
await snoozeNotification(notificationId, snoozeUntil);
```

### Clear Snooze
```typescript
const { clearSnooze } = useOrderStore();
await clearSnooze(notificationId);
```

### Mark All as Read
```typescript
const { markAllNotificationsAsRead } = useOrderStore();
await markAllNotificationsAsRead();
```

### Delete Notification
```typescript
import { NotificationService } from '@/lib/notification-service';
await NotificationService.deleteNotification(notificationId);
```

### Cleanup Old Notifications
```typescript
import { NotificationService } from '@/lib/notification-service';
await NotificationService.cleanupOldNotifications(userId, 30); // 30 days
```

## 📊 Notification Structure

```typescript
interface Notification {
  id: string;
  userId?: string;
  type: NotificationType;
  priority: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  icon: string; // Lucide icon name
  source: string; // Orders, Payments, Maintenance, etc.
  createdAt: string; // ISO 8601
  isRead: boolean;
  snoozedUntil?: string;
  isGroup: boolean;
  items?: NotificationItem[]; // For grouped notifications
  actionType?: NotificationActionType;
  entityId?: string;
  link?: string;
  data?: any;
  readAt?: string;
  actionTakenAt?: string;
  metadata?: {
    amount?: number;
    daysUntil?: number;
    clientName?: string;
    orderCount?: number;
  };
}
```

## 🎯 Action Types

```typescript
type NotificationActionType =
  | 'VIEW_ORDER'
  | 'VIEW_CLIENT'
  | 'SCHEDULE_FOLLOW_UP'
  | 'MARK_AS_PAID'
  | 'CONTACT_CLIENT'
  | 'RESCHEDULE_DELIVERY'
  | 'VIEW_MAINTENANCE'
  | 'VIEW_FEEDBACK'
  | 'REORDER_STOCK';
```

## 🔍 Queries

### Get Unread Count
```typescript
const unreadCount = notifications.filter(n => {
  const now = new Date();
  return !n.isRead && (!n.snoozedUntil || new Date(n.snoozedUntil) <= now);
}).length;
```

### Get Critical Notifications
```typescript
const criticalNotifications = notifications.filter(n => 
  n.priority === 'critical' && !n.isRead
);
```

### Get Notifications by Source
```typescript
const orderNotifications = notifications.filter(n => 
  n.source === 'Orders'
);
```

### Search Notifications
```typescript
const searchResults = notifications.filter(n => 
  n.title.toLowerCase().includes(query.toLowerCase()) ||
  n.message.toLowerCase().includes(query.toLowerCase())
);
```

## ⚙️ Configuration

### Enable/Disable Notification Types
```typescript
import { useSettingsStore } from '@/store/use-settings-store';

const { toggleNotificationType } = useSettingsStore();
toggleNotificationType('OVERDUE_PAYMENT'); // Toggle on/off
```

### Adjust Thresholds
Edit `src/lib/notification-generator.ts`:

```typescript
// Stock depletion threshold
if (stockDepletionDays < 14) { // Change 14 to desired days

// High value order threshold
const HIGH_VALUE_THRESHOLD = 10000; // Change to desired amount

// Payment due soon threshold
return daysUntilDue >= 0 && daysUntilDue <= 3; // Change 3 to desired days
```

## 🐛 Debugging

### Check Subscription Status
```typescript
console.log('Notifications:', notifications);
console.log('Unread count:', unreadCount);
```

### Test Notification Creation
```typescript
await NotificationService.createNotification({
  userId: 'test-user',
  type: 'ORDER_STATUS_CHANGED',
  priority: 'info',
  title: 'Test Notification',
  message: 'This is a test',
  icon: 'Bell',
  source: 'System',
  createdAt: new Date().toISOString(),
  isRead: false,
  isGroup: false,
});
```

### Check Firestore Rules
```bash
firebase emulators:start
# Test rules in Firestore Emulator UI
```

## 📱 UI Components

### Notification Bell (Header)
```typescript
import { NotificationCenter } from '@/components/layout/notification-center';

<NotificationCenter />
```

### Full Notification Page
```typescript
// Navigate to /notifications
router.push('/notifications');
```

### Custom Notification Display
```typescript
import { useOrderStore } from '@/store/use-order-store';

const { notifications } = useOrderStore();

{notifications.map(notification => (
  <div key={notification.id}>
    <h3>{notification.title}</h3>
    <p>{notification.message}</p>
  </div>
))}
```

## 🔐 Security

### Firestore Rules
```javascript
match /notifications/{notificationId} {
  allow read: if request.auth != null && 
                 resource.data.userId == request.auth.uid;
  allow write: if request.auth != null && 
                  request.resource.data.userId == request.auth.uid;
}
```

### User Isolation
All notifications are scoped by `userId` - users can only see their own notifications.

## 📈 Performance Tips

1. **Limit queries** - Use `limit(50)` to prevent large reads
2. **Index properly** - Ensure Firestore indexes exist
3. **Clean up regularly** - Delete old notifications (30+ days)
4. **Use local state** - Zustand caches notifications client-side
5. **Unsubscribe** - Always return unsubscribe function from useEffect

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Notifications not appearing | Check Firestore rules, verify auth |
| "Missing index" error | Click error link to create index |
| Not updating in real-time | Check subscription, refresh page |
| Too many notifications | Use filters, mark as read, disable types |
| Performance slow | Limit query, clean up old data |

## 📚 Resources

- Full Documentation: `docs/notification-system.md`
- Migration Guide: `docs/notification-migration-guide.md`
- Firestore Rules: `docs/firestore-rules-notifications.md`
- Code: `src/lib/notification-generator.ts`
- Service: `src/lib/notification-service.ts`
