# Firestore Security Rules for Notifications

Add these rules to your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Notifications collection
    match /notifications/{notificationId} {
      // Users can only read their own notifications
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      
      // Users can create notifications for themselves
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      
      // Users can update their own notifications (mark as read, snooze, etc.)
      allow update: if request.auth != null && 
                       resource.data.userId == request.auth.uid;
      
      // Users can delete their own notifications
      allow delete: if request.auth != null && 
                       resource.data.userId == request.auth.uid;
    }
    
    // System/Admin can create notifications for any user
    match /notifications/{notificationId} {
      allow create: if request.auth != null && 
                       request.auth.token.admin == true;
    }
  }
}
```

## Rule Explanation

### Read Access
- Users can only read notifications where `userId` matches their authenticated user ID
- Prevents users from seeing other users' notifications

### Create Access
- Users can create notifications for themselves
- Admin users can create notifications for any user
- Useful for system-generated notifications

### Update Access
- Users can update their own notifications
- Allows marking as read, snoozing, etc.
- Cannot modify other users' notifications

### Delete Access
- Users can delete their own notifications
- Useful for dismissing or archiving notifications

## Testing Rules

Use the Firebase Emulator Suite to test rules:

```bash
firebase emulators:start
```

Test cases:

1. **User reads own notification** ✅ Allow
2. **User reads another user's notification** ❌ Deny
3. **User marks own notification as read** ✅ Allow
4. **User marks another user's notification as read** ❌ Deny
5. **Admin creates notification for any user** ✅ Allow
6. **User creates notification for another user** ❌ Deny

## Indexes

Add these indexes to `firestore.indexes.json`:

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
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Performance Considerations

1. **Limit queries** - Use `limit()` to prevent large reads
2. **Index properly** - Ensure composite indexes exist
3. **Clean up old data** - Regularly delete old notifications
4. **Use pagination** - For large notification lists
5. **Cache locally** - Use Zustand store for client-side caching
