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
    const { staleTime = 5 * 60 * 1000, gcTime = 24 * 60 * 60 * 1000 } = options;
    const queryKey = key as unknown as QueryKey;

    // 1. Check if we have fresh data in memory
    const state = this.queryClient.getQueryState(queryKey);
    const isStale = !state?.dataUpdatedAt || Date.now() - state.dataUpdatedAt > staleTime;

    if (state?.data && !isStale) {
      // Data exists and is fresh, return it
      return state.data as T;
    }

    // 2. Try to hydrate from Layer 2 (IndexedDB) if no data in memory
    if (!state?.data) {
      try {
        const cachedEntry = await idbStorage.get(key);
        if (cachedEntry) {
          // Hydrate into React Query
          this.queryClient.setQueryData(queryKey, cachedEntry.value, {
            updatedAt: cachedEntry.metadata.createdAt
          });

          // Check if hydrated data is still fresh
          if (Date.now() - cachedEntry.metadata.createdAt < staleTime) {
            return cachedEntry.value as T;
          }
        }
      } catch (_err) {
        logger.warn('Failed to hydrate from cache', { component: 'UniversalCache', action: 'hydrateFromIndexedDB' });
      }
    }

    // 3. Data is stale or missing - fetch fresh data
    return this.queryClient.fetchQuery({
      queryKey,
      queryFn: fetcher,
      staleTime,
      gcTime,
    });
  }

  /**
   * Manually set data into the cache.
   */
  set<T>(key: CacheKey, value: T, _options?: CacheOptions): void {
    this.queryClient.setQueryData(key as unknown as QueryKey, value);
    // Persister will automatically pick this up and save to IDB
  }

  /**
   * Invalidate cache entries.
   * When a string is passed, it will match against both the namespace (key[0])
   * and the entity name (key[2]) to allow invalidating all queries for an entity type.
   */
  async invalidate(keyOrTag: CacheKey | string): Promise<void> {
    if (typeof keyOrTag === 'string') {
      // Invalidate by Tag - matches against namespace (key[0]) or entity (key[2])
      await this.queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as unknown as CacheKey;
          // Match against namespace (first element) or entity name (third element)
          return key[0] === keyOrTag || key[2] === keyOrTag;
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
