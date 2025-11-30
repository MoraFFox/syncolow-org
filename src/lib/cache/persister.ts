import { Persister } from '@tanstack/react-query-persist-client';
import { idbStorage } from './indexed-db';
import { CacheKey } from './types';

/**
 * Creates a Persister for React Query using our custom IndexedDB storage.
 */
export function createIDBPersister(idb = idbStorage): Persister {
  return {
    persistClient: async (client) => {
      // We don't persist the whole client state in one blob.
      // Instead, we rely on the individual query persistence.
      // However, the standard Persister interface expects full client persistence.
      
      // For the Universal Cache, we want granular control.
      // But to use the official 'persistQueryClient' utility, we need this interface.
      
      // OPTION A: Use the official experimental_createPersister (if available)
      // OPTION B: Implement a custom hydration logic in UniversalCache.
      
      // Given the requirements, we are building a custom UniversalCache facade.
      // We might not need the standard 'persistClient' method if we handle hydration manually.
      // But for compatibility, let's implement a basic one.
      
      // ACTUALLY: The standard Persister saves the *entire* cache to a single key.
      // That is bad for performance with large datasets.
      // We want *granular* persistence (per query).
      
      // Therefore, we will NOT use the standard `persistQueryClient` plugin which dumps everything to one JSON.
      // Instead, we will use `queryClient.getQueryCache().subscribe` to listen for updates
      // and write them to IDB individually.
      // And we will use `initialData` or `prefetch` to hydrate.
    },
    restoreClient: async () => {
      return undefined; // We handle restoration granularly
    },
    removeClient: async () => {
      await idb.clear();
    },
  } as unknown as Persister; // Casting because we are deviating from the standard full-dump pattern
}

/**
 * Custom Granular Persister Logic
 * 
 * This is the core logic that binds React Query events to IDB writes.
 */
import { QueryClient, QueryCache } from '@tanstack/react-query';

export class GranularPersister {
  constructor(private client: QueryClient) {
    this.subscribe();
  }

  private subscribe() {
    const cache = this.client.getQueryCache();
    
    cache.subscribe((event) => {
      if (event.type === 'updated' && event.action?.type === 'success') {
        const query = event.query;
        const key = query.queryKey as unknown as CacheKey;
        const data = query.state.data;
        
        // Only persist if data is valid
        if (data !== undefined && data !== null) {
          idbStorage.set(key, {
            key,
            value: data,
            metadata: {
              createdAt: query.state.dataUpdatedAt,
              updatedAt: Date.now(),
              staleAt: Date.now() + (query.options.staleTime || 0),
              expiresAt: Date.now() + (query.options.gcTime || 5 * 60 * 1000),
              version: 'v1', // TODO: Extract from key
            }
          });
        }
      }
    });
  }

  /**
   * Hydrates a specific query from IDB if it exists.
   */
  async hydrate(key: CacheKey): Promise<any | undefined> {
    const entry = await idbStorage.get(key);
    if (entry) {
      return entry.value;
    }
    return undefined;
  }
}
