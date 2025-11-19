import { useState, useEffect } from 'react';
import { cacheManager } from '@/lib/cache-manager';
import { useOnlineStatus } from './use-online-status';

export function useCachedData<T>(collection: string, forceRefresh = false) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const result = await cacheManager.get<T>(collection, forceRefresh || isOnline);
        
        if (mounted) {
          setData(result);
          setIsFromCache(!isOnline);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [collection, forceRefresh, isOnline]);

  const refresh = async () => {
    try {
      setLoading(true);
      const result = await cacheManager.get<T>(collection, true);
      setData(result);
      setIsFromCache(false);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, isFromCache, refresh };
}
