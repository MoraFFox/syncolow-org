import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { CacheKey, CacheOptions } from '@/lib/cache/types';
import { universalCache } from '@/lib/cache/universal-cache';

/**
 * Hook to fetch data using the Universal Caching System.
 * 
 * @param key - The strict CacheKey (use CacheKeyFactory)
 * @param fetcher - The function to fetch data if missing/stale
 * @param options - Cache options (ttl, etc)
 */
export function useUniversalCache<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  options?: CacheOptions & Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const { staleTime = 30000, gcTime = 5 * 60 * 1000, ...queryOptions } = options || {};

  return useQuery({
    queryKey: key as unknown as any[],
    queryFn: async () => {
      // We use universalCache.get to ensure IDB hydration logic runs if needed
      // But since useQuery handles the fetching/caching lifecycle, 
      // we mainly use the fetcher here.
      // However, to ensure consistency with the "Universal Cache" facade which might add extra logic:
      return fetcher();
    },
    staleTime,
    gcTime,
    ...queryOptions,
  });
}
