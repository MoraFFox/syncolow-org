import { QueryClient } from '@tanstack/react-query';
import { drilldownCacheInvalidator } from './cache/drilldown-cache-invalidator';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (documented fresh window)
      gcTime: 24 * 60 * 60 * 1000, // 24 hours (documented cleanup policy)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize cache invalidator with queryClient
drilldownCacheInvalidator.initialize(queryClient);

