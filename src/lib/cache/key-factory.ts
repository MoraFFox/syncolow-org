import { CacheKey, CacheKeyParams, CacheNamespace, CacheScope, CacheEntity, getCachePolicy, CachePolicyConfig } from './types';

/**
 * Cache Key Factory
 * 
 * Enforces a strict, deterministic format for all cache keys in the application.
 * Prevents key collisions and ensures consistency across modules.
 * 
 * Enhanced with:
 * - Entity relationship mapping for dependency-based prefetching
 * - Access to cache policies for automatic timing configuration
 */
export class CacheKeyFactory {
  private static readonly DEFAULT_VERSION = 'v1';
  private static readonly DEFAULT_NAMESPACE = 'app';

  /**
   * Entity relationship graph for dependency-based prefetching.
   * Maps an entity to its related entities for cascade operations.
   */
  private static readonly ENTITY_RELATIONSHIPS: Record<string, string[]> = {
    orders: ['companies', 'products', 'branches', 'sales-accounts'],
    companies: ['branches', 'orders', 'sales-accounts'],
    branches: ['companies', 'orders'],
    products: ['orders', 'manufacturers'],
    manufacturers: ['products'],
    'sales-accounts': ['orders', 'companies'],
    maintenance: ['products', 'companies'],
    feedback: ['companies', 'orders'],
  };

  /**
   * Generates a standard cache key.
   * Format: [namespace, scope, entity, sortedParams, version]
   */
  static create(
    entity: CacheEntity,
    scope: CacheScope,
    params: CacheKeyParams = {},
    namespace: CacheNamespace = this.DEFAULT_NAMESPACE,
    version: string = this.DEFAULT_VERSION
  ): CacheKey {
    // Sort params to ensure determinism: {a:1, b:2} === {b:2, a:1}
    const sortedParams = this.sortParams(params);

    return [namespace, scope, entity, sortedParams, version];
  }

  /**
   * Helper for List resources
   * e.g. ['app', 'list', 'products', { page: 1 }]
   */
  static list(entity: string, params: CacheKeyParams = {}): CacheKey {
    return this.create(entity, 'list', params);
  }

  /**
   * Helper for Detail resources
   * e.g. ['app', 'detail', 'products', { id: '123' }]
   */
  static detail(entity: string, id: string | number): CacheKey {
    return this.create(entity, 'detail', { id });
  }

  /**
   * Helper for Infinite/Paginated resources
   */
  static infinite(entity: string, params: CacheKeyParams = {}): CacheKey {
    return this.create(entity, 'infinite', params);
  }

  /**
   * Get the cache policy for an entity.
   * Useful for configuring React Query options.
   */
  static getPolicy(entity: string): CachePolicyConfig {
    return getCachePolicy(entity);
  }

  /**
   * Get related entities for a given entity.
   * Used for dependency-based prefetching and cascade invalidation.
   * 
   * @param entity - The entity to get relationships for
   * @param depth - How deep to traverse relationships (default: 1)
   */
  static getRelatedEntities(entity: string, depth: number = 1): string[] {
    if (depth <= 0) return [];

    const directRelations = this.ENTITY_RELATIONSHIPS[entity] || [];
    if (depth === 1) return directRelations;

    // Recursively gather deeper relations
    const allRelations = new Set(directRelations);
    for (const related of directRelations) {
      const deeperRelations = this.getRelatedEntities(related, depth - 1);
      deeperRelations.forEach(r => allRelations.add(r));
    }

    // Remove the original entity from results
    allRelations.delete(entity);
    return Array.from(allRelations);
  }

  /**
   * Generate prefetch keys for an entity and its related entities.
   * 
   * @param entity - Primary entity
   * @param params - Parameters to include in related keys
   * @param depth - Relationship depth (default: 1)
   */
  static getPrefetchKeys(
    entity: string,
    params: CacheKeyParams = {},
    depth: number = 1
  ): CacheKey[] {
    const keys: CacheKey[] = [this.list(entity, params)];

    const relatedEntities = this.getRelatedEntities(entity, depth);
    for (const related of relatedEntities) {
      // Extract relevant params for related entities
      const relatedParams = this.extractRelatedParams(params, related);
      keys.push(this.list(related, relatedParams));
    }

    return keys;
  }

  /**
   * Extract relevant parameters for a related entity.
   * For example, if viewing an order, extract companyId for company fetch.
   */
  private static extractRelatedParams(
    params: CacheKeyParams,
    relatedEntity: string
  ): CacheKeyParams {
    const result: CacheKeyParams = {};

    // Map common relationship fields
    if (relatedEntity === 'companies' && params.companyId) {
      result.id = params.companyId;
    }
    if (relatedEntity === 'branches' && params.branchId) {
      result.id = params.branchId;
    }
    if (relatedEntity === 'products' && params.productId) {
      result.id = params.productId;
    }

    return result;
  }

  /**
   * Recursively sorts object keys to ensure deterministic serialization.
   */
  private static sortParams(params: CacheKeyParams): CacheKeyParams {
    if (!params || typeof params !== 'object') return params;

    return Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as CacheKeyParams);
  }
}
