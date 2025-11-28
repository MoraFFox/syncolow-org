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

// 3. Configuration
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

// 4. The Universal Cache Interface
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
