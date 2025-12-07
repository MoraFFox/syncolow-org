/** @format */

import { universalCache } from '@/lib/cache/universal-cache';
import { CacheKeyFactory } from '@/lib/cache/key-factory';
import { drilldownCacheInvalidator } from '@/lib/cache/drilldown-cache-invalidator';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export async function createCachedFetcher<T>(
  cacheKey: any,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    return await universalCache.get(cacheKey, fetcher);
  } catch (error) {
    logger.error(error, { component: 'StoreHelpers', action: 'createCachedFetcher' });
    throw error;
  }
}

export function handleStoreError(error: any, context: { component: string; action: string }) {
  logger.error(error, context);
  toast({
    title: 'Error',
    description: error.message || 'An unexpected error occurred',
    variant: 'destructive',
  });
}

export async function invalidateCacheAndRefresh(cacheKeys: string[], entityType?: string, entityId?: string, metadata?: Record<string, any>) {
  await universalCache.invalidate(cacheKeys as any);
  
  if (entityType && entityId) {
    try {
      drilldownCacheInvalidator.invalidateRelatedPreviews(entityType, entityId, metadata);
    } catch (e) {
      logger.error(e, { component: 'StoreHelpers', action: 'invalidateCacheAndRefresh' });
    }
  }
}
