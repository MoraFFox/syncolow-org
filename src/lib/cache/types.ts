/**
 * Universal Caching System - Type Definitions
 * 
 * Defines the core interfaces for the multi-layer caching architecture.
 */

// 1. Cache Key Strategy
export type CacheNamespace = 'app' | 'user' | 'system' | string;
export type CacheScope = 'list' | 'detail' | 'infinite' | 'static' | string;
export type CacheEntity = 'products' | 'orders' | 'companies' | string;

export interface CacheKeyParams {
  [key: string]: string | number | boolean | undefined | null;
}

// The strict tuple format: [namespace, scope, entity, params, version]
export type CacheKey = [CacheNamespace, CacheScope, CacheEntity, CacheKeyParams, string];

// 2. Cache Entry Structure (Stored in L2/IndexedDB)
export interface CacheEntry<T = unknown> {
  key: CacheKey;
  value: T;
  metadata: {
    createdAt: number;
    updatedAt: number;
    staleAt: number; // When the data is considered stale (needs background refresh)
    expiresAt: number; // When the data is considered dead (needs blocking refresh)
    version: string;
    sizeBytes?: number;
  };
}

// 3. Cache Policy Configuration
// Per-entity cache timing policies for consistent freshness management
export interface CachePolicyConfig {
  staleTime: number;  // Time in ms until data is stale (triggers background refresh)
  gcTime: number;     // Time in ms until data is garbage collected from memory
  maxAge?: number;    // Time in ms until data expires in IndexedDB (optional, defaults to gcTime)
  prefetchPriority: 'critical' | 'high' | 'medium' | 'low';
  offlineSupport: 'full-crud' | 'read-update' | 'read-create' | 'read-only';
}

// Entity-specific cache policies matrix
export const CACHE_POLICIES: Record<string, CachePolicyConfig> = {
  orders: {
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 24 * 60 * 60 * 1000,   // 24 hours
    prefetchPriority: 'high',
    offlineSupport: 'full-crud',
  },
  companies: {
    staleTime: 15 * 60 * 1000,     // 15 minutes
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    prefetchPriority: 'medium',
    offlineSupport: 'full-crud',
  },
  products: {
    staleTime: 10 * 60 * 1000,     // 10 minutes
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    prefetchPriority: 'medium',
    offlineSupport: 'read-update',
  },
  'dashboard-stats': {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 60 * 60 * 1000,        // 1 hour
    prefetchPriority: 'critical',
    offlineSupport: 'read-only',
  },
  'user-settings': {
    staleTime: 30 * 60 * 1000,     // 30 minutes
    gcTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    prefetchPriority: 'low',
    offlineSupport: 'full-crud',
  },
  notifications: {
    staleTime: 1 * 60 * 1000,      // 1 minute
    gcTime: 60 * 60 * 1000,        // 1 hour
    prefetchPriority: 'high',
    offlineSupport: 'read-only',
  },
  maintenance: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 24 * 60 * 60 * 1000,   // 24 hours
    prefetchPriority: 'medium',
    offlineSupport: 'full-crud',
  },
  feedback: {
    staleTime: 10 * 60 * 1000,     // 10 minutes
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    prefetchPriority: 'low',
    offlineSupport: 'read-create',
  },
};

// Default cache policy for unknown entities
export const DEFAULT_CACHE_POLICY: CachePolicyConfig = {
  staleTime: 5 * 60 * 1000,        // 5 minutes (documented fresh window)
  gcTime: 24 * 60 * 60 * 1000,     // 24 hours (documented cleanup policy)
  prefetchPriority: 'medium',
  offlineSupport: 'read-only',
};

/**
 * Get the cache policy for an entity.
 * Falls back to DEFAULT_CACHE_POLICY if entity is not configured.
 */
export function getCachePolicy(entity: string): CachePolicyConfig {
  return CACHE_POLICIES[entity] || DEFAULT_CACHE_POLICY;
}

// 4. Cache Options (used by hooks and APIs)
export interface CacheOptions {
  /** Time in ms until data is stale (stale-while-revalidate) */
  staleTime?: number;
  /** Time in ms until data is garbage collected from memory */
  gcTime?: number;
  /** Time in ms until data is invalid and must be refetched (blocking) */
  ttl?: number;
  /** Tags for invalidation */
  tags?: string[];
  /** Whether to persist to IndexedDB */
  persist?: boolean;
}

// 5. The Universal Cache Interface
export interface IUniversalCache {
  /**
   * Get data from cache or fetch it.
   * Implements Stale-While-Revalidate.
   */
  get<T>(
    key: CacheKey,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>;

  /**
   * Manually set data in cache (L1 + L2).
   */
  set<T>(key: CacheKey, value: T, options?: CacheOptions): void;

  /**
   * Invalidate data by key or tag.
   */
  invalidate(keyOrTag: CacheKey | string): Promise<void>;

  /**
   * Preload data for future use.
   */
  prefetch<T>(key: CacheKey, fetcher: () => Promise<T>, options?: CacheOptions): Promise<void>;

  /**
   * Get metrics for observability.
   */
  getMetrics(): CacheMetrics;
}

// 6. Cache Metrics for Observability
export interface CacheMetrics {
  hits: {
    memory: number;
    disk: number;
  };
  misses: number;
  staleHits: number;
  writes: number;
  errors: number;
  storageSize: number;
}

// 7. Connection Quality Types
export type ConnectionQuality = 'offline' | 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';

export interface ConnectionInfo {
  isOnline: boolean;
  quality: ConnectionQuality;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

// 8. Prefetch Priority Levels
export type PrefetchPriority = 'critical' | 'high' | 'medium' | 'low';

export interface PrefetchConfig {
  priority: PrefetchPriority;
  maxAge?: number;
  condition?: () => boolean;
}
