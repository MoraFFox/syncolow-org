import { useEffect, useRef, useCallback } from 'react';
import { CacheKey, CacheKeyParams } from '@/lib/cache/types';
import { prefetchStrategy } from '@/lib/cache/prefetch-strategy';
import { routePredictor } from '@/lib/cache/route-predictor';
import { usePathname } from 'next/navigation';

/**
 * usePrefetch Hook
 * 
 * Provides prefetching capabilities to components:
 * - Route-based prefetching on navigation
 * - Link hover prefetching
 * - Entity prefetching with relationships
 */
export function usePrefetch() {
    const pathname = usePathname();
    const previousPathname = useRef<string | null>(null);

    // Record navigation and trigger route-based prefetch
    useEffect(() => {
        if (previousPathname.current && previousPathname.current !== pathname) {
            // Record navigation for learning
            routePredictor.recordNavigation(previousPathname.current, pathname);
        }
        previousPathname.current = pathname;

        // Prefetch entities for predicted next routes
        const predictedEntities = routePredictor.getPredictedEntities(pathname);
        for (const entity of predictedEntities) {
            prefetchStrategy.scheduleEntity(entity);
        }

        // Cleanup on route change
        return () => {
            prefetchStrategy.clearQueue();
        };
    }, [pathname]);

    /**
     * Prefetch data for a specific route.
     * Use this for link hover prefetching.
     */
    const prefetchRoute = useCallback((route: string) => {
        const entities = routePredictor.getEntitiesForRoute(route);
        for (const entity of entities) {
            prefetchStrategy.scheduleEntity(entity);
        }
    }, []);

    /**
     * Prefetch a specific entity list.
     */
    const prefetchEntity = useCallback((entity: string, params: CacheKeyParams = {}) => {
        prefetchStrategy.scheduleEntity(entity, params);
    }, []);

    /**
     * Prefetch an entity and its related entities.
     */
    const prefetchWithRelations = useCallback((
        entity: string,
        params: CacheKeyParams = {},
        depth: number = 1
    ) => {
        prefetchStrategy.scheduleWithRelations(entity, params, depth);
    }, []);

    /**
     * Schedule a custom prefetch.
     */
    const prefetch = useCallback((
        key: CacheKey,
        fetcher: () => Promise<unknown>,
        priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
    ) => {
        prefetchStrategy.schedule(key, fetcher, priority);
    }, []);

    return {
        prefetchRoute,
        prefetchEntity,
        prefetchWithRelations,
        prefetch,
    };
}

/**
 * useLinkPrefetch Hook
 * 
 * Attaches hover prefetching to link elements.
 * Returns event handlers to add to anchor/Link elements.
 */
export function useLinkPrefetch(route: string) {
    const { prefetchRoute } = usePrefetch();
    const hasPrefetched = useRef(false);

    const onMouseEnter = useCallback(() => {
        if (!hasPrefetched.current) {
            prefetchRoute(route);
            hasPrefetched.current = true;
        }
    }, [route, prefetchRoute]);

    const onFocus = useCallback(() => {
        if (!hasPrefetched.current) {
            prefetchRoute(route);
            hasPrefetched.current = true;
        }
    }, [route, prefetchRoute]);

    return {
        onMouseEnter,
        onFocus,
    };
}
