import { CacheKey, CacheKeyParams, CacheNamespace, CacheScope, CacheEntity } from './types';

/**
 * Cache Key Factory
 * 
 * Enforces a strict, deterministic format for all cache keys in the application.
 * Prevents key collisions and ensures consistency across modules.
 */
export class CacheKeyFactory {
  private static readonly DEFAULT_VERSION = 'v1';
  private static readonly DEFAULT_NAMESPACE = 'app';

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
