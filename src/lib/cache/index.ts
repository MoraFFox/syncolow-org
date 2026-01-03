// Cache System - Barrel Export
// Re-exports all cache-related modules for convenient importing

// Core types
export * from './types';

// Cache key utilities
export { CacheKeyFactory } from './key-factory';

// Storage layers
export { idbStorage, IndexedDBStorage } from './indexed-db';

// Universal cache
export { universalCache, UniversalCache } from './universal-cache';

// Persister
export { GranularPersister, createIDBPersister } from './persister';

// Prefetching & Warming
export { prefetchStrategy, PrefetchStrategy } from './prefetch-strategy';
export { routePredictor, RoutePredictor } from './route-predictor';
export { behaviorTracker, BehaviorTracker } from './behavior-tracker';
export { warmingScheduler, WarmingScheduler } from './warming-scheduler';
export { patternAnalyzer, PatternAnalyzer } from './pattern-analyzer';

// Dependency management
export { dependencyGraph, DependencyGraph } from './dependency-graph';

// Invalidation
export { invalidationEngine, InvalidationEngine } from './invalidation-engine';
export { invalidationScheduler, InvalidationScheduler } from './invalidation-scheduler';
export { backgroundRefresher, BackgroundRefresher } from './background-refresher';
export { drilldownCacheInvalidator } from './drilldown-cache-invalidator';

// Observability
export { cacheAnalytics, CacheAnalyticsTracker } from './analytics';
export { quotaManager, QuotaManager } from './quota-manager';

// Tab synchronization
export { tabSyncManager, TabSyncManager } from './tab-sync-manager';
