# Notification System Migration Guide

## Overview

This guide helps you migrate from the old client-side notification system to the new Firestore-backed real-time notification system.

## What's Changed

### Before (Old System)
- Notifications generated client-side only
- Lost on page refresh
- No persistence
- No multi-device sync
- 5 notification types

### After (New System)
- Notifications persisted in Firestore
- Real-time updates via subscriptions
- Multi-device synchronization
- 17 notification types
- Enhanced filtering and search
- User preferences saved

## Migration Steps

### Step 1: Update Firestore Rules

Add the notification rules to your `firestore.rules`:

```javascript
match /notifications/{notificationId} {
  allow read: if request.auth != null && 
                 resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid;
  allow update: if request.auth != null && 
                   resource.data.userId == request.auth.uid;
  allow delete: if request.auth != null && 
                   resource.data.userId == request.auth.uid;
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### Step 2: Create Firestore Indexes

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isRead", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

### Step 3: Update Dependencies

No new dependencies required! The system uses existing Firebase SDK.

### Step 4: Test in Development

1. Start the development server:
```bash
npm run dev
```

2. Log in to the application
3. Navigate to `/notifications`
4. Verify notifications appear
5. Test marking as read, snoozing, filtering

### Step 5: Deploy to Production

```bash
npm run build
firebase deploy
```

## New Features to Explore

### 1. Enhanced Filtering

Users can now filter notifications by:
- Priority (Critical, Warning, Info)
- Source (Orders, Payments, Maintenance, etc.)
- Read status (All, Unread, Snoozed)
- Search by text

### 2. New Notification Types

12 new notification types added:
- Payment Due Soon
- Bulk Payment Cycle Due
- Delivery Delay Risk
- Delivery Failed
- High Value Order
- Order Cancelled
- Maintenance Due Soon
- Maintenance Delayed
- Spare Parts Needed
- New Feedback
- Low Client Satisfaction
- Sales Velocity Drop

### 3. User Preferences

Users can enable/disable notification types in Settings:
- Navigate to `/settings`
- Scroll to "Notification Preferences"
- Toggle notification types on/off

### 4. Real-time Updates

Notifications update automatically:
- No page refresh needed
- Multi-device synchronization
- Instant updates when data changes

## Troubleshooting

### Issue: Notifications not appearing

**Solution:**
1. Check Firestore rules are deployed
2. Verify user is authenticated
3. Check browser console for errors
4. Verify notification settings are enabled

### Issue: "Missing index" error

**Solution:**
1. Click the link in the error message
2. Firebase will create the index automatically
3. Wait 2-5 minutes for index to build
4. Refresh the page

### Issue: Notifications not updating in real-time

**Solution:**
1. Check network connection
2. Verify Firestore subscription is active
3. Check browser console for errors
4. Try refreshing the page

### Issue: Too many notifications

**Solution:**
1. Use filters to focus on important notifications
2. Mark old notifications as read
3. Disable notification types you don't need
4. System auto-cleans notifications older than 30 days

## Performance Optimization

### Limit Notification Count

By default, the system loads the 50 most recent notifications. To change:

```typescript
// In app-shell.tsx
subscribeToNotifications(userId, 100); // Load 100 notifications
```

### Auto-Cleanup

Enable automatic cleanup of old notifications:

```typescript
import { NotificationService } from '@/lib/notification-service';

// Delete notifications older than 30 days
await NotificationService.cleanupOldNotifications(userId, 30);
```

Run this periodically (e.g., weekly) via a scheduled Cloud Function.

## Rollback Plan

If you need to rollback to the old system:

1. Revert the following files:
   - `src/lib/types.ts`
   - `src/lib/notification-generator.ts`
   - `src/store/use-order-store.ts`
   - `src/components/layout/app-shell.tsx`
   - `src/app/notifications/page.tsx`

2. Remove new files:
   - `src/lib/notification-service.ts`
   - `docs/notification-*.md`

3. Redeploy:
```bash
npm run build
firebase deploy
```

## Support

For issues or questions:
1. Check the documentation: `docs/notification-system.md`
2. Review Firestore rules: `docs/firestore-rules-notifications.md`
3. Check browser console for errors
4. Review Firebase logs in Firebase Console

## Next Steps

After successful migration:

1. **Configure user preferences** - Set up notification preferences for your team
2. **Monitor performance** - Check Firestore usage in Firebase Console
3. **Customize thresholds** - Adjust notification thresholds in `notification-generator.ts`
4. **Add custom notifications** - Create custom notification types for your business needs
5. **Enable email notifications** - Set up email delivery for critical alerts (Phase 2)

## Feedback

We'd love to hear your feedback on the new notification system:
- What notification types are most useful?
- What additional notifications would you like?
- Any performance issues?
- Feature requests?

Document feedback in project issues or team discussions.
