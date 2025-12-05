import { QueryClient } from '@tanstack/react-query';
import { drilldownCacheInvalidator } from './cache/drilldown-cache-invalidator';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize cache invalidator with queryClient
drilldownCacheInvalidator.initialize(queryClient);
