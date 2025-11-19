# Deployment Steps for Performance Optimizations

## Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in to Firebase: `firebase login`
- Project initialized: `firebase init`

## Step 1: Deploy Firestore Indexes

```bash
# Deploy indexes to Firestore
firebase deploy --only firestore:indexes

# Expected output:
# ✔ Deploy complete!
# Indexes created:
# - products (name ASC)
# - products (category ASC, name ASC)
# - products (manufacturerId ASC, name ASC)
```

**Verification:**
1. Go to Firebase Console
2. Navigate to Firestore Database → Indexes
3. Verify new product indexes are listed
4. Wait for indexes to build (may take a few minutes)

## Step 2: Test IndexedDB Cache

```bash
# Start development server
npm run dev

# Open browser DevTools
# Application tab → IndexedDB → synergyflow_cache
# Verify products store is created
```

**Test Steps:**
1. Load the application
2. Navigate to products page
3. Check IndexedDB for cached products
4. Reload page - should load from cache instantly
5. Wait 24 hours - cache should auto-expire

## Step 3: Verify Search Performance

```bash
# Test product search
1. Open products page
2. Use search input
3. Check Network tab - should see Firestore query with limit
4. Verify results load quickly (<500ms)
```

## Step 4: Monitor Performance

### Browser DevTools
```bash
# Network Tab
1. Reload page
2. Check total data transfer
3. Target: <5MB initial load
4. Verify: Only 50 products loaded initially

# Performance Tab
1. Record page load
2. Check Time to Interactive
3. Target: <2.5 seconds
```

### Firebase Console
```bash
# Firestore Usage
1. Go to Firebase Console → Firestore → Usage
2. Monitor read operations
3. Target: <10 reads per page load
4. Check index usage
```

## Step 5: Update Environment Variables

Add to `.env.local`:
```bash
# Performance Monitoring
NEXT_PUBLIC_ENABLE_CACHE=true
NEXT_PUBLIC_CACHE_DURATION=86400000
NEXT_PUBLIC_INITIAL_PRODUCT_LIMIT=50
```

## Step 6: Build and Test Production

```bash
# Build production bundle
npm run build

# Check bundle size
# Target: <500KB gzipped

# Start production server
npm run start

# Test performance
# Run Lighthouse audit
# Target: Performance score >90
```

## Rollback Plan

If issues occur:

### Rollback Indexes
```bash
# Remove new indexes from firestore.indexes.json
# Redeploy
firebase deploy --only firestore:indexes
```

### Disable Cache
```typescript
// In use-order-store.ts
// Comment out IndexedDB cache lines
// const cachedProducts = await productCache.getProducts();
```

### Revert to Full Load
```typescript
// Change limit(50) back to getDocs(collection(db, "products"))
```

## Monitoring Checklist

After deployment, monitor for 24 hours:

- [ ] Check error logs for IndexedDB issues
- [ ] Monitor Firestore read operations
- [ ] Verify cache hit rate
- [ ] Check page load times
- [ ] Monitor memory usage
- [ ] Test on mobile devices
- [ ] Test on slow networks

## Success Metrics

### Before vs After

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Initial Load | 44MB | 2-3MB | <5MB |
| Products Loaded | 176+ | 50 | 50 |
| Time to Interactive | 3-5s | <1s | <2.5s |
| Memory Usage | 150-200MB | 50-80MB | <100MB |
| Firestore Reads | 176+ | 50 | <100 |

## Troubleshooting

### Index Build Failed
```bash
# Check Firestore rules
# Ensure fields exist in documents
# Verify field types match index definition
```

### Cache Not Working
```bash
# Check browser console for errors
# Verify IndexedDB is enabled
# Check quota exceeded errors
# Clear browser data and retry
```

### Slow Queries
```bash
# Check if indexes are built
# Verify query uses indexed fields
# Add composite indexes if needed
```

## Next Steps

1. **Monitor for 1 week**: Check metrics daily
2. **Gather feedback**: Ask users about performance
3. **Optimize further**: Identify bottlenecks
4. **Document learnings**: Update this guide

## Support

If issues persist:
1. Check Firebase Status: https://status.firebase.google.com/
2. Review Firebase docs: https://firebase.google.com/docs
3. Check browser compatibility
4. Test in incognito mode

---

**Deployment Date:** [Add date]
**Deployed By:** [Add name]
**Status:** [Pending/Complete/Rolled Back]
