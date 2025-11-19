# Offline Mode - Phase 3 Implementation

## Status: ✅ Complete

## Overview
Phase 3 implements conflict detection and resolution for handling concurrent modifications when syncing offline changes.

---

## Implemented Features

### 1. Conflict Resolver
**File**: `src/lib/conflict-resolver.ts`

**Conflict Interface**:
```typescript
{
  id: string;
  operationId: string;
  collection: string;
  documentId: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
  conflictingFields: string[];
  resolved: boolean;
  resolution?: 'server' | 'client' | 'manual';
  resolvedData?: any;
  createdAt: number;
}
```

**Methods**:
- `detectConflict()`: Compares local and server data, detects conflicts
- `resolveConflict()`: Applies resolution strategy
- `mergeNonConflictingFields()`: Merges non-conflicting fields automatically
- `getFieldDiff()`: Gets local vs server values for a field

**Detection Logic**:
1. Fetch current server document
2. Compare server timestamp with local timestamp
3. If server is newer, compare field values
4. Identify conflicting fields (different values)
5. Return conflict object if conflicts found

---

### 2. Conflict Store
**File**: `src/store/use-conflict-store.ts`

**State**:
- `conflicts`: Array of detected conflicts

**Actions**:
- `addConflict()`: Add new conflict
- `removeConflict()`: Remove conflict by ID
- `markResolved()`: Mark conflict as resolved
- `clearResolved()`: Remove all resolved conflicts

---

### 3. Conflict Resolution Dialog
**File**: `src/components/conflict-resolution-dialog.tsx`

**Features**:
- **Two-Tab Interface**:
  - **Field-by-Field**: Select local or server version per field
  - **Full Comparison**: Side-by-side JSON view

- **Field Selection**:
  - Click to toggle between local/server version
  - Visual indication of selected version
  - Checkmark on selected side
  - Highlighted border on selection

- **Resolution Strategies**:
  - **Use Server Version**: Accept all server changes
  - **Use My Version**: Keep all local changes
  - **Apply Selected Fields**: Use field-by-field selections
  - **Discard My Changes**: Remove from queue

- **Visual Design**:
  - Yellow warning alert for conflict count
  - Side-by-side comparison cards
  - Syntax-highlighted JSON
  - Responsive layout

---

### 4. Conflict Notification Badge
**File**: `src/components/layout/conflict-notification-badge.tsx`

**Features**:
- Red destructive badge with AlertTriangle icon
- Shows count of unresolved conflicts
- Click to open resolution dialog
- Auto-shows next conflict after resolving one
- Tooltip with conflict count
- Hidden when no conflicts

**Placement**: Header (next to pending operations badge)

---

### 5. Queue Manager Integration
**File**: `src/lib/offline-queue-manager.ts` (modified)

**Enhanced UPDATE Operation**:
1. Before updating, check for conflicts
2. If conflict detected:
   - Add to conflict store
   - Throw error to stop operation
   - Keep in queue for retry after resolution
3. If no conflict, proceed with update

**Conflict Detection Trigger**:
- Only for UPDATE operations
- Compares local timestamp with server timestamp
- Checks all fields for differences

---

## Resolution Strategies

### 1. Server Wins (Default)
- **Use Case**: When server data is more reliable
- **Action**: Discard all local changes, use server version
- **Result**: Document updated with server data

### 2. Client Wins
- **Use Case**: When local changes are more important
- **Action**: Overwrite server with all local changes
- **Result**: Document updated with local data

### 3. Manual (Field-by-Field)
- **Use Case**: When both versions have valuable changes
- **Action**: User selects local or server per field
- **Result**: Document updated with mixed data
- **Default**: Server version selected for each field

### 4. Discard Local
- **Use Case**: When local changes are no longer needed
- **Action**: Remove from queue, keep server version
- **Result**: No update, conflict removed

---

## User Experience Flow

### Conflict Detection
1. User edits document while offline
2. Change queued in IndexedDB
3. User comes back online
4. Queue manager processes UPDATE operation
5. Conflict resolver detects server was modified
6. Conflict added to store
7. Red conflict badge appears in header
8. Operation remains in queue

### Conflict Resolution
1. User clicks conflict badge
2. Dialog opens showing first conflict
3. User sees:
   - Conflict count alert
   - Field-by-field comparison
   - Full JSON comparison (optional tab)
4. User selects resolution strategy:
   - Quick: "Use Server" or "Use My Version"
   - Careful: Toggle fields, then "Apply Selected"
   - Abort: "Discard My Changes"
5. Dialog closes
6. If more conflicts exist, next one auto-opens
7. Resolved operation removed from queue
8. Badge updates count

---

## Conflict Detection Algorithm

```typescript
1. Get server document
2. Compare timestamps:
   - If server.updatedAt > local.timestamp → potential conflict
   - If server.updatedAt <= local.timestamp → no conflict
3. Compare field values:
   - For each field in local and server data
   - Skip: id, createdAt, updatedAt
   - If JSON.stringify(local) !== JSON.stringify(server) → conflict
4. Return conflicting fields array
5. If array.length > 0 → conflict exists
```

---

## Testing Instructions

### Test Conflict Detection
1. Open app in two browser tabs (Tab A, Tab B)
2. Go offline in Tab A
3. Edit an order in Tab A (change status)
4. In Tab B (online), edit same order (change different field)
5. Go online in Tab A
6. Verify conflict badge appears
7. Verify conflict shows both changes

### Test Server Wins
1. Create conflict (as above)
2. Click conflict badge
3. Click "Use Server Version"
4. Verify server changes kept
5. Verify local changes discarded
6. Verify badge disappears

### Test Client Wins
1. Create conflict
2. Click conflict badge
3. Click "Use My Version"
4. Verify local changes kept
5. Verify server changes overwritten
6. Check Firestore to confirm

### Test Manual Resolution
1. Create conflict with multiple field changes
2. Click conflict badge
3. Toggle field selections (mix local and server)
4. Click "Apply Selected Fields"
5. Verify mixed data saved
6. Check Firestore to confirm merge

### Test Discard
1. Create conflict
2. Click conflict badge
3. Click "Discard My Changes"
4. Verify operation removed from queue
5. Verify server data unchanged
6. Verify badge disappears

### Test Multiple Conflicts
1. Create 3 conflicts (edit 3 different documents offline)
2. Go online
3. Verify badge shows "3"
4. Resolve first conflict
5. Verify next conflict auto-opens
6. Resolve all conflicts
7. Verify badge disappears

---

## Edge Cases Handled

### No Server Document
- If document deleted on server, no conflict
- CREATE operation proceeds normally

### Identical Changes
- If local and server have same values, no conflict
- UPDATE proceeds without dialog

### Non-Conflicting Fields
- Only fields with different values shown as conflicts
- Other fields merged automatically

### Timestamp Edge Cases
- If timestamps equal, no conflict (same edit)
- If local newer, no conflict (offline edit was first)

---

## Performance Considerations

### Conflict Detection
- Only runs for UPDATE operations
- Single Firestore read per operation
- Lightweight field comparison (JSON.stringify)
- No impact on CREATE/DELETE operations

### Dialog Rendering
- Lazy loaded (only when conflict exists)
- Virtualized for large objects
- Syntax highlighting for readability
- Responsive design for mobile

---

## Security Considerations

### Data Validation
- Resolved data validated before write
- Server-side rules still enforced
- No bypass of Firestore security rules

### Conflict Integrity
- Conflicts stored in memory only (not persisted)
- Cleared on page refresh
- No sensitive data exposed in UI

---

## Next Steps (Phase 4)

1. **Enhanced Caching**:
   - Cache full datasets in IndexedDB
   - Implement cache-first read strategy
   - Background sync for large datasets

2. **Optimistic Updates**:
   - Update UI immediately
   - Show "pending sync" indicators
   - Revert on failure

3. **Service Worker Enhancement**:
   - Cache static assets
   - Implement stale-while-revalidate
   - Background sync API

---

## Files Created/Modified

```
src/
├── lib/
│   ├── conflict-resolver.ts              [NEW]
│   └── offline-queue-manager.ts          [MODIFIED]
├── store/
│   └── use-conflict-store.ts             [NEW]
├── components/
│   ├── conflict-resolution-dialog.tsx    [NEW]
│   └── layout/
│       ├── conflict-notification-badge.tsx [NEW]
│       └── app-shell.tsx                 [MODIFIED]
└── docs/
    └── OFFLINE_MODE_PHASE3.md            [NEW]
```

---

## Summary

Phase 3 successfully implements:
- ✅ Conflict detection on UPDATE operations
- ✅ Three resolution strategies (server, client, manual)
- ✅ Field-by-field selection UI
- ✅ Side-by-side comparison view
- ✅ Conflict notification badge
- ✅ Auto-show next conflict
- ✅ Discard local changes option
- ✅ Conflict store management
- ✅ Integration with queue manager

**Result**: Users can now safely resolve conflicts when offline changes clash with server updates, with full control over which version to keep.
