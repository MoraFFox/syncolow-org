/** @format */

import { universalCache } from '@/lib/cache/universal-cache';
import { CacheKeyFactory } from '@/lib/cache/key-factory';
import { drilldownCacheInvalidator } from '@/lib/cache/drilldown-cache-invalidator';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { CacheKey } from '@/lib/cache/types';
import type { DrillKind } from '@/lib/drilldown-types';

/**
 * Metadata for drilldown cache invalidation.
 * Contains optional entity relationships for cascading invalidation.
 */
export interface DrilldownInvalidationMetadata {
  companyId?: string;
  branchId?: string;
  baristaId?: string;
  manufacturerId?: string;
  productId?: string;
  clientId?: string;
}

export async function createCachedFetcher<T>(
  cacheKey: CacheKey,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    return await universalCache.get(cacheKey, fetcher);
  } catch (error) {
    logger.error(error, { component: 'StoreHelpers', action: 'createCachedFetcher' });
    throw error;
  }
}

export function handleStoreError(error: unknown, context: { component: string; action: string }) {
  logger.error(error, context);
  
  // Safely extract error message with type narrowing
  const message = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : 'An unexpected error occurred';
  
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
}

export async function invalidateCacheAndRefresh(
  cacheKeys: Array<CacheKey | string>, 
  entityType?: DrillKind, 
  entityId?: string, 
  metadata?: DrilldownInvalidationMetadata
) {
  // Invalidate each key individually since universalCache.invalidate accepts CacheKey | string
  for (const key of cacheKeys) {
    await universalCache.invalidate(key);
  }
  
  if (entityType && entityId) {
    try {
      drilldownCacheInvalidator.invalidateRelatedPreviews(entityType, entityId, metadata);
    } catch (e) {
      logger.error(e, { component: 'StoreHelpers', action: 'invalidateCacheAndRefresh' });
    }
  }
}
