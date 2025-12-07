import { QueryClient, QueryKey } from '@tanstack/react-query';
import { IUniversalCache, CacheKey, CacheOptions, CacheMetrics } from './types';
import { GranularPersister } from './persister';
import { idbStorage } from './indexed-db';
import { logger } from '@/lib/logger';

/**
 * Universal Cache System
 * 
 * Orchestrates Layer 1 (Memory) and Layer 2 (IndexedDB).
 * Provides a simple API for data fetching with offline support.
 */
export class UniversalCache implements IUniversalCache {
  private queryClient: QueryClient;
  private persister: GranularPersister;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.persister = new GranularPersister(queryClient);
  }

  /**
   * Get data with Stale-While-Revalidate strategy.
   */
  async get<T>(
    key: CacheKey,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { staleTime = 30000, gcTime = 5 * 60 * 1000 } = options;
    const queryKey = key as unknown as QueryKey;

    // 1. Check if we have data in memory
    const state = this.queryClient.getQueryState(queryKey);
    if (state?.data) {
      // React Query handles staleness automatically if we use fetchQuery/ensureQueryData
      return this.queryClient.ensureQueryData({
        queryKey,
        queryFn: fetcher,
        staleTime,
        gcTime,
      });
    }

    // 2. Check Layer 2 (IndexedDB)
    // We try to hydrate from IDB before letting React Query fetch
    try {
      const cachedEntry = await idbStorage.get(key);
      if (cachedEntry) {
        // Hydrate into React Query
        // We set the data and the updated timestamp so RQ knows how old it is
        this.queryClient.setQueryData(queryKey, cachedEntry.value, {
          updatedAt: cachedEntry.metadata.createdAt
        });
      }
    } catch (err) {
      logger.warn('Failed to hydrate from cache', { component: 'UniversalCache', action: 'hydrateFromIndexedDB', key: String(key) });
    }

    // 3. Fetch (or return hydrated data if it was set)
    // ensureQueryData will:
    // - Return immediately if data exists and is fresh
    // - Return immediately if data exists and is stale (but trigger background refetch)
    // - Fetch if no data exists
    return this.queryClient.ensureQueryData({
      queryKey,
      queryFn: fetcher,
      staleTime,
      gcTime,
    });
  }

  /**
   * Manually set data into the cache.
   */
  set<T>(key: CacheKey, value: T, options?: CacheOptions): void {
    this.queryClient.setQueryData(key as unknown as QueryKey, value);
    // Persister will automatically pick this up and save to IDB
  }

  /**
   * Invalidate cache entries.
   */
  async invalidate(keyOrTag: CacheKey | string): Promise<void> {
    if (typeof keyOrTag === 'string') {
      // Invalidate by Tag/Namespace
      // We assume the tag is the first element of the key (namespace)
      await this.queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as unknown as CacheKey;
          return key[0] === keyOrTag;
        }
      });
    } else {
      await this.queryClient.invalidateQueries({ queryKey: keyOrTag as unknown as QueryKey });
    }
  }

  async prefetch<T>(key: CacheKey, fetcher: () => Promise<T>, options?: CacheOptions): Promise<void> {
    await this.queryClient.prefetchQuery({
      queryKey: key as unknown as QueryKey,
      queryFn: fetcher,
      staleTime: options?.staleTime
    });
  }

  getMetrics(): CacheMetrics {
    const cache = this.queryClient.getQueryCache();
    const all = cache.getAll();
    
    return {
      hits: { 
        memory: all.filter(q => q.state.dataUpdateCount > 0).length, // Proxy metric
        disk: 0 // Hard to track without hooking into IDB get
      },
      misses: 0,
      staleHits: all.filter(q => q.isStale()).length,
      writes: 0,
      errors: all.filter(q => q.state.status === 'error').length,
      storageSize: 0 // Would require IDB scan
    };
  }
}

// Export singleton
import { queryClient } from '../query-client';
export const universalCache = new UniversalCache(queryClient);
