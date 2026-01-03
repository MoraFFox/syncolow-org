import { logger } from '@/lib/logger';

/**
 * Route Predictor
 * 
 * Predicts likely next navigation targets based on:
 * - Current route context
 * - Historical navigation patterns
 * - Route hierarchy
 * 
 * Used to intelligently prefetch data for predicted routes.
 */

interface NavigationEvent {
    from: string;
    to: string;
    timestamp: number;
}

interface RouteTransition {
    from: string;
    to: string;
    count: number;
    lastSeen: number;
}

/**
 * Static route hierarchy for Next.js App Router.
 * Maps parent routes to their likely child routes.
 */
const ROUTE_HIERARCHY: Record<string, string[]> = {
    '/': ['/orders', '/clients', '/analytics', '/products'],
    '/orders': ['/orders/[id]', '/orders/new'],
    '/clients': ['/clients/[id]'],
    '/products': ['/products/[id]'],
    '/analytics': ['/analytics/sales', '/analytics/categories'],
    '/settings': ['/settings/profile', '/settings/notifications', '/settings/cache'],
};

/**
 * Entity context from routes.
 * Maps route patterns to entities they display.
 */
const ROUTE_ENTITIES: Record<string, string[]> = {
    '/orders': ['orders'],
    '/orders/[id]': ['orders', 'companies'],
    '/clients': ['companies'],
    '/clients/[id]': ['companies', 'orders', 'branches'],
    '/products': ['products'],
    '/products/[id]': ['products', 'manufacturers'],
    '/analytics': ['dashboard-stats', 'orders', 'companies'],
    '/maintenance': ['maintenance', 'products'],
};

export class RoutePredictor {
    private readonly transitions: Map<string, RouteTransition[]> = new Map();
    private readonly maxTransitionsPerRoute = 10;
    private readonly storage_key = 'route_predictions';

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Record a navigation event.
     * Updates transition probabilities.
     */
    recordNavigation(from: string, to: string): void {
        // Normalize routes by removing dynamic segments values
        const normalizedFrom = this.normalizeRoute(from);
        const normalizedTo = this.normalizeRoute(to);

        const existing = this.transitions.get(normalizedFrom) || [];
        const transition = existing.find(t => t.to === normalizedTo);

        if (transition) {
            transition.count++;
            transition.lastSeen = Date.now();
        } else {
            existing.push({
                from: normalizedFrom,
                to: normalizedTo,
                count: 1,
                lastSeen: Date.now(),
            });
        }

        // Keep only top N transitions per route
        existing.sort((a, b) => b.count - a.count);
        this.transitions.set(normalizedFrom, existing.slice(0, this.maxTransitionsPerRoute));

        // Persist to localStorage
        this.saveToStorage();
    }

    /**
     * Predict the most likely next routes from current route.
     * Returns routes sorted by probability.
     */
    predictNextRoutes(currentRoute: string, limit: number = 3): string[] {
        const normalized = this.normalizeRoute(currentRoute);
        const transitions = this.transitions.get(normalized) || [];

        // Combine learned transitions with static hierarchy
        const staticRoutes = ROUTE_HIERARCHY[normalized] || [];
        const learnedRoutes = transitions.map(t => t.to);

        // Merge, prioritizing learned routes
        const combined = [...new Set([...learnedRoutes, ...staticRoutes])];

        return combined.slice(0, limit);
    }

    /**
     * Get entities that should be prefetched for a route.
     */
    getEntitiesForRoute(route: string): string[] {
        const normalized = this.normalizeRoute(route);
        return ROUTE_ENTITIES[normalized] || [];
    }

    /**
     * Get entities for predicted next routes.
     */
    getPredictedEntities(currentRoute: string): string[] {
        const predictedRoutes = this.predictNextRoutes(currentRoute);
        const entities = new Set<string>();

        for (const route of predictedRoutes) {
            const routeEntities = this.getEntitiesForRoute(route);
            routeEntities.forEach(e => entities.add(e));
        }

        return Array.from(entities);
    }

    /**
     * Normalize a route by replacing dynamic segment values with placeholders.
     * e.g., '/orders/123' -> '/orders/[id]'
     */
    private normalizeRoute(route: string): string {
        return route
            // UUID pattern
            .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/[id]')
            // Numeric ID pattern
            .replace(/\/\d+/g, '/[id]')
            // Any alphanumeric ID after known parent routes
            .replace(/\/(orders|clients|products|companies|branches|maintenance)\/[^/]+/g, '/$1/[id]');
    }

    /**
     * Load transition data from localStorage.
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storage_key);
            if (stored) {
                const data = JSON.parse(stored) as [string, RouteTransition[]][];
                data.forEach(([key, value]) => this.transitions.set(key, value));
            }
        } catch (err) {
            logger.warn('Failed to load route predictions from storage', {
                component: 'RoutePredictor',
            });
        }
    }

    /**
     * Save transition data to localStorage.
     */
    private saveToStorage(): void {
        try {
            const data = Array.from(this.transitions.entries());
            localStorage.setItem(this.storage_key, JSON.stringify(data));
        } catch (err) {
            logger.warn('Failed to save route predictions to storage', {
                component: 'RoutePredictor',
            });
        }
    }

    /**
     * Clear all learned patterns.
     */
    clear(): void {
        this.transitions.clear();
        try {
            localStorage.removeItem(this.storage_key);
        } catch {
            // Ignore storage errors
        }
    }

    /**
     * Get prediction statistics for debugging.
     */
    getStats(): { totalRoutes: number; totalTransitions: number } {
        let totalTransitions = 0;
        this.transitions.forEach(t => totalTransitions += t.length);

        return {
            totalRoutes: this.transitions.size,
            totalTransitions,
        };
    }
}

// Export singleton
export const routePredictor = new RoutePredictor();
