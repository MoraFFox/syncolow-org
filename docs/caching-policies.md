# Caching Policies Documentation

This document outlines the caching policies and strategies used in SynergyFlow ERP.

## Cache Architecture Overview

SynergyFlow uses a **three-layer caching system**:

| Layer | Technology | Purpose | Speed |
|-------|------------|---------|-------|
| L1 | React Query (Memory) | In-memory cache for instant access | < 1ms |
| L2 | IndexedDB | Persistent storage for offline support | < 10ms |
| L3 | Service Worker | Network-level caching for static assets | < 100ms |

## Cache Timing Policies

### Default Policy
- **Stale Time**: 5 minutes (data is "fresh" for 5 minutes)
- **GC Time**: 24 hours (data is kept in memory for 24 hours)
- **Max Age**: 24 hours (data expires in IndexedDB after 24 hours)

### Entity-Specific Policies

| Entity | Stale Time | GC Time | Prefetch Priority | Offline Support |
|--------|-----------|---------|-------------------|-----------------|
| `orders` | 2 min | 24 hrs | High | Full CRUD |
| `companies` | 15 min | 7 days | Medium | Full CRUD |
| `products` | 10 min | 7 days | Medium | Read + Update |
| `dashboard-stats` | 5 min | 1 hr | Critical | Read-only |
| `user-settings` | 30 min | 30 days | Low | Full CRUD |
| `notifications` | 1 min | 1 hr | High | Read-only |
| `maintenance` | 5 min | 24 hrs | Medium | Full CRUD |
| `feedback` | 10 min | 7 days | Low | Read + Create |

## Stale-While-Revalidate Strategy

The caching system implements the **Stale-While-Revalidate** pattern:

1. **Fresh Data** (< staleTime): Return immediately from cache, no refetch
2. **Stale Data** (staleTime < age < gcTime): Return from cache, trigger background refetch
3. **Expired Data** (> gcTime): Block until fresh data is fetched

```
Timeline:
[0]─────[staleTime]─────────[gcTime]────────>
        │                    │
        │ Fresh              │ Stale (refetch in BG)    Expired (block)
        ▼                    ▼                          ▼
```

## Cache Key Format

All cache keys follow a strict tuple format:

```typescript
type CacheKey = [namespace, scope, entity, params, version]
// Example: ['app', 'list', 'orders', { status: 'active' }, 'v1']
```

### Key Components
- **namespace**: `'app'` | `'user'` | `'system'`
- **scope**: `'list'` | `'detail'` | `'infinite'` | `'static'`
- **entity**: `'orders'` | `'companies'` | `'products'` | etc.
- **params**: Query parameters (sorted for determinism)
- **version**: Schema version for cache invalidation

## Cache Invalidation Rules

### Automatic Invalidation
- **On Mutation**: Related caches are invalidated when data is modified
- **On Entity Update**: Cascade invalidation to dependent entities
- **On Schema Change**: Version mismatch triggers full invalidation

### Relationship-Based Invalidation
When an order is updated:
```
order ──> company stats ──> dashboard metrics
      └──> branch stats
```

## Offline Support

### Queue Operations
Operations made while offline are queued in IndexedDB:
1. **Create**: Full data stored, synced on reconnection
2. **Update**: Delta changes stored, merged on sync
3. **Delete**: Marked for deletion, executed on sync

### Conflict Resolution
When sync conflicts occur:
1. **Server Wins**: Accept server version
2. **Client Wins**: Keep local changes
3. **Manual Merge**: User resolves conflicts

## Connection Quality Handling

The system adapts based on connection quality:

| Quality | Prefetch | Cache Policy |
|---------|----------|--------------|
| WiFi/4G | Full | Normal |
| 3G | Reduced | Extended stale times |
| 2G | Critical only | Maximum caching |
| Offline | None | Serve from cache only |

## Usage Examples

### Basic Cache Usage
```typescript
import { useUniversalCache } from '@/hooks/use-universal-cache';
import { CacheKeyFactory } from '@/lib/cache/key-factory';

const { data } = useUniversalCache(
  CacheKeyFactory.list('orders', { status: 'active' }),
  () => fetchOrders({ status: 'active' }),
  { staleTime: 2 * 60 * 1000 } // 2 minutes
);
```

### Entity-Aware Caching
```typescript
import { getCachePolicy } from '@/lib/cache/types';

const policy = getCachePolicy('orders');
// Returns: { staleTime: 120000, gcTime: 86400000, ... }
```

### Manual Invalidation
```typescript
import { universalCache } from '@/lib/cache/universal-cache';

// Invalidate specific key
await universalCache.invalidate(['app', 'detail', 'orders', { id: '123' }, 'v1']);

// Invalidate by tag (all orders)
await universalCache.invalidate('orders');
```

## Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| Cache Hit Rate | > 80% | For frequently accessed data |
| Offline Success Rate | > 95% | Queued operations sync successfully |
| Perceived Load Time | 50% reduction | Via intelligent prefetching |
| Storage Usage | < 100MB typical | Per user, < 500MB max |
| Sync Conflicts | < 1% | Operations requiring manual resolution |

## Debugging

### Cache Inspector
In development, use the browser DevTools Application tab to inspect IndexedDB:
- Database: `universal-cache-db`
- Store: `universal-cache`

### Cache Metrics
The `CacheIndicator` component shows:
- Cache hit status
- Data freshness timestamp
- Hit rate percentage
