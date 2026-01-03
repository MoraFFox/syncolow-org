import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { CacheKey, CacheOptions } from '@/lib/cache/types';
import { universalCache } from '@/lib/cache/universal-cache';

/**
 * Hook to fetch data using the Universal Caching System.
 * 
 * Delegates to universalCache.get which handles:
 * - L1 (Memory) cache check via React Query
 * - L2 (IndexedDB) hydration before network fetch
 * - Stale-while-revalidate strategy
 * 
 * @param key - The strict CacheKey (use CacheKeyFactory)
 * @param fetcher - The function to fetch data if missing/stale
 * @param options - Cache options (staleTime, gcTime, etc)
 */
export function useUniversalCache<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  options?: CacheOptions & Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  // Use documented cache times: 5 min stale, 24 hour gc
  const {
    staleTime = 5 * 60 * 1000,  // 5 minutes (documented fresh window)
    gcTime = 24 * 60 * 60 * 1000, // 24 hours (documented cleanup policy)
    ...queryOptions
  } = options || {};

  return useQuery({
    queryKey: key as unknown as unknown[],
    queryFn: async () => {
      // Delegate to universalCache.get which handles IDB hydration
      return universalCache.get(key, fetcher, { staleTime, gcTime });
    },
    staleTime,
    gcTime,
    ...queryOptions,
  });
}

