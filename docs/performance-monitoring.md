# Performance Monitoring Guide

## Overview
This guide explains how to monitor and optimize the application's performance, focusing on data loading and caching strategies.

## Key Performance Optimizations

### 1. Product Loading Strategy

#### Initial Load
- **First 50 products** loaded immediately
- **Remaining products** loaded in background
- **IndexedDB cache** checked first for instant loading

#### Cache Strategy
```typescript
// Cache Duration: 24 hours
// Storage: IndexedDB (5-10MB capacity)
// Fallback: Firestore query with limit(50)
```

### 2. Search & Filter Optimization

#### Product Search
```typescript
// Firestore query with prefix matching
searchProducts(searchTerm: string)
// Returns max 50 results
// Uses index: products.name (ASCENDING)
```

#### Category Filter
```typescript
// Firestore query with category filter
filterProductsByCategory(category: string)
// Returns max 100 results
// Uses index: products.category + products.name
```

### 3. Virtual Scrolling

For large product lists (100+ items):
```tsx
import { VirtualProductList } from '@/components/virtual-product-list';

<VirtualProductList
  products={products}
  renderProduct={(product) => <ProductCard product={product} />}
  estimateSize={100}
/>
```

**Benefits:**
- Only renders visible items
- Reduces DOM nodes by 90%+
- Smooth scrolling with 1000+ items

## Performance Metrics

### Before Optimization
- Initial load: 44MB data transfer
- Products loaded: 176+ (all at once)
- Time to interactive: 3-5 seconds
- Memory usage: 150-200MB

### After Optimization
- Initial load: 2-3MB data transfer
- Products loaded: 50 (initial) + background
- Time to interactive: <1 second
- Memory usage: 50-80MB

## Monitoring Tools

### 1. Browser DevTools

#### Network Tab
```bash
# Check data transfer size
Filter: firestore.googleapis.com
Look for: Large responses (>1MB)
```

#### Performance Tab
```bash
# Record page load
1. Open Performance tab
2. Click Record
3. Reload page
4. Stop recording
5. Analyze: Loading, Scripting, Rendering
```

#### Application Tab
```bash
# Check IndexedDB cache
1. Open Application tab
2. IndexedDB → synergyflow_cache
3. View products store
4. Check cache size and timestamp
```

### 2. Firestore Console

Monitor query performance:
```
Firebase Console → Firestore → Usage
- Read operations per day
- Query patterns
- Index usage
```

### 3. Chrome Lighthouse

Run performance audit:
```bash
1. Open DevTools
2. Lighthouse tab
3. Select "Performance"
4. Generate report
```

**Target Scores:**
- Performance: >90
- First Contentful Paint: <1.5s
- Time to Interactive: <2.5s
- Total Blocking Time: <200ms

## Cache Management

### IndexedDB Cache

#### Check Cache Status
```typescript
import { productCache } from '@/lib/product-cache';

// Get cache size
const size = await productCache.getCacheSize();
console.log(`Cached products: ${size}`);

// Get cached products
const products = await productCache.getProducts();
```

#### Clear Cache
```typescript
// Clear product cache
await productCache.clearProducts();

// Cache is auto-cleared after 24 hours
```

### Analytics Cache

#### SessionStorage Cache
```typescript
import { AnalyticsCache } from '@/lib/analytics-cache';

// Clear analytics cache
AnalyticsCache.clearAll();

// Clear expired entries
AnalyticsCache.clearExpired();
```

## Optimization Checklist

### Initial Setup
- [ ] Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] Enable IndexedDB in browser settings
- [ ] Clear old cache data

### Regular Monitoring
- [ ] Check Firestore read operations (daily)
- [ ] Monitor cache hit rate (weekly)
- [ ] Review slow queries (weekly)
- [ ] Analyze bundle size (monthly)

### Performance Testing
- [ ] Test with slow 3G network
- [ ] Test with 1000+ products
- [ ] Test cache expiration
- [ ] Test offline functionality

## Troubleshooting

### Slow Initial Load

**Symptoms:**
- Page takes >3 seconds to load
- Large network requests in DevTools

**Solutions:**
1. Check if IndexedDB cache is working
2. Verify Firestore indexes are deployed
3. Reduce initial product limit
4. Enable compression in Firebase hosting

### Cache Not Working

**Symptoms:**
- Products load from Firestore every time
- No data in IndexedDB

**Solutions:**
1. Check browser IndexedDB support
2. Verify cache initialization
3. Check for quota exceeded errors
4. Clear browser data and retry

### High Memory Usage

**Symptoms:**
- Browser tab uses >200MB RAM
- Page becomes sluggish

**Solutions:**
1. Implement virtual scrolling
2. Reduce cached product count
3. Clear unused data from state
4. Use React.memo for expensive components

## Best Practices

### Data Loading
1. **Load on demand**: Don't fetch all data upfront
2. **Use pagination**: Limit queries to 50-100 items
3. **Cache aggressively**: Store frequently accessed data
4. **Background loading**: Fetch non-critical data after initial render

### Query Optimization
1. **Use indexes**: Ensure all queries have indexes
2. **Limit results**: Always use limit() in queries
3. **Avoid OR queries**: Use multiple queries instead
4. **Cache query results**: Store in sessionStorage/IndexedDB

### Cache Strategy
1. **Short TTL for dynamic data**: 5 minutes for orders
2. **Long TTL for static data**: 24 hours for products
3. **Invalidate on mutation**: Clear cache when data changes
4. **Graceful degradation**: Fall back to Firestore if cache fails

## Performance Budget

### Network
- Initial bundle: <500KB (gzipped)
- Firestore queries: <10 per page load
- Data transfer: <5MB per session

### Runtime
- Time to Interactive: <2.5s
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1

### Memory
- Heap size: <100MB
- DOM nodes: <1500
- Event listeners: <500

## Monitoring Dashboard

Create a simple monitoring component:

```typescript
// components/performance-monitor.tsx
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    cacheSize: 0,
    productsLoaded: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    const updateMetrics = async () => {
      const cacheSize = await productCache.getCacheSize();
      const productsLoaded = useOrderStore.getState().products.length;
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

      setMetrics({
        cacheSize,
        productsLoaded,
        memoryUsage: Math.round(memoryUsage / 1024 / 1024)
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded text-xs">
      <div>Cache: {metrics.cacheSize} products</div>
      <div>Loaded: {metrics.productsLoaded} products</div>
      <div>Memory: {metrics.memoryUsage}MB</div>
    </div>
  );
}
```

## Resources

- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)
- [Web Vitals](https://web.dev/vitals/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [React Virtual](https://tanstack.com/virtual/latest)

---

**Last Updated:** 2024
**Version:** 1.0.0
