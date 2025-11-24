# Supabase Migration Fixes for use-order-store.ts

## Summary
The file has been partially migrated from Firebase to Supabase. The following functions still need conversion:

## Completed Fixes
✅ Removed unused imports (format, addDays, differenceInDays, OrderItem, NotificationType)
✅ Added missing state properties (ordersOffset, productsOffset)
✅ Fixed fetchInitialData
✅ Fixed fetchOrders
✅ Fixed fetchOrdersWithFilters
✅ Fixed searchOrdersByText
✅ Fixed loadMoreOrders
✅ Fixed fetchOrdersByDateRange

## Remaining Functions to Migrate

### Update Operations (use supabase.from().update())
- updateOrderPaymentStatus
- markOrderAsPaid
- markBulkOrdersAsPaid
- markBulkCycleAsPaid
- updatePaymentScores
- updateProduct
- updateCategory
- updateTax
- updateVisit
- registerPotentialClient

### Delete Operations (use supabase.from().delete())
- deleteOrder
- deleteAllOrders
- deleteProduct
- deleteAllProducts
- deleteCategory
- deleteTax
- deleteVisit

### Insert Operations (use supabase.from().insert())
- addProduct
- addCategory
- addTax
- submitOrder
- addVisit

### Search/Filter Operations
- syncAllOrdersToSearch
- loadRemainingProducts
- searchProducts
- filterProductsByCategory

## Migration Pattern

### Firebase Pattern:
```typescript
await updateDoc(doc(db, "orders", orderId), { status });
```

### Supabase Pattern:
```typescript
await supabase.from("orders").update({ status }).eq("id", orderId);
```

### Firebase Batch Pattern:
```typescript
const batch = writeBatch(db);
items.forEach(item => {
  batch.update(doc(db, "collection", item.id), data);
});
await batch.commit();
```

### Supabase Batch Pattern:
```typescript
const updates = items.map(item => ({ id: item.id, ...data }));
await supabase.from("collection").upsert(updates);
```

## Quick Fix Commands

Run ESLint auto-fix:
```bash
npm run lint -- --fix
```

## Notes
- All Firebase imports (getDocs, collection, query, where, etc.) have been removed
- The `db` reference no longer exists - use `supabase` instead
- Firestore document snapshots are replaced with Supabase data arrays
- Batch operations need to be converted to bulk upsert/delete operations
