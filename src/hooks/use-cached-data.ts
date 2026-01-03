import { useUniversalCache } from './use-universal-cache';
import { useOnlineStatus } from './use-online-status';
import { CacheKey } from '@/lib/cache/types';
import { supabase } from '@/lib/supabase';

/**
 * Hook to fetch cached data for a collection with offline support.
 * 
 * Uses the Universal Caching System which provides:
 * - L1 (Memory) + L2 (IndexedDB) caching
 * - Stale-while-revalidate strategy
 * - Automatic offline data serving from cache
 * 
 * @param collection - The Supabase table/collection name
 * @param forceRefresh - If true, bypasses stale data and forces a network fetch
 */
export function useCachedData<T>(collection: string, forceRefresh = false) {
  const { isOnline } = useOnlineStatus();

  // Build a proper CacheKey
  const cacheKey: CacheKey = ['app', 'list', collection, {}, 'v1'];

  // Default fetcher - fetches from Supabase
  const fetcher = async (): Promise<T[]> => {
    const { data, error } = await supabase
      .from(collection)
      .select('*');

    if (error) throw error;
    return (data || []) as T[];
  };

  const {
    data,
    isLoading: loading,
    error,
    refetch,
    isStale,
  } = useUniversalCache<T[]>(
    cacheKey,
    fetcher,
    {
      // Force refetch if requested
      staleTime: forceRefresh ? 0 : undefined,
      // Enable/disable background refetch based on online status
      enabled: !!isOnline || !forceRefresh,
    }
  );

  const refresh = async () => {
    await refetch();
  };

  return {
    data: data ?? null,
    loading,
    error: error as Error | null,
    isFromCache: isStale || !isOnline,
    refresh
  };
}

