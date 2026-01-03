import { CacheKeyFactory } from './key-factory';
import { logger } from '@/lib/logger';

/**
 * Dependency Graph
 * 
 * Manages entity relationships for:
 * - Cascade invalidation
 * - Dependency-based prefetching
 * - Related entity loading
 */

interface EntityNode {
    name: string;
    dependsOn: string[];    // Entities this entity depends on
    dependedBy: string[];   // Entities that depend on this entity
}

/**
 * Relationship types for determining invalidation/prefetch behavior
 */
type RelationType = 'parent' | 'child' | 'sibling' | 'reference';

interface Relationship {
    from: string;
    to: string;
    type: RelationType;
    field?: string; // The field that links these entities
}

export class DependencyGraph {
    private nodes: Map<string, EntityNode> = new Map();
    private relationships: Relationship[] = [];

    constructor() {
        this.initializeDefaultRelationships();
    }

    /**
     * Initialize default entity relationships.
     */
    private initializeDefaultRelationships(): void {
        // Orders depend on companies and products
        this.addRelationship('orders', 'companies', 'parent', 'companyId');
        this.addRelationship('orders', 'products', 'reference', 'items.productId');
        this.addRelationship('orders', 'branches', 'parent', 'branchId');
        this.addRelationship('orders', 'sales-accounts', 'parent', 'salesAccountId');

        // Companies have branches
        this.addRelationship('companies', 'branches', 'child', 'companyId');
        this.addRelationship('companies', 'orders', 'child', 'companyId');

        // Branches belong to companies
        this.addRelationship('branches', 'companies', 'parent', 'companyId');
        this.addRelationship('branches', 'orders', 'child', 'branchId');

        // Products reference manufacturers
        this.addRelationship('products', 'manufacturers', 'parent', 'manufacturerId');
        this.addRelationship('products', 'orders', 'reference', 'items.productId');

        // Maintenance references products and companies
        this.addRelationship('maintenance', 'products', 'parent', 'productId');
        this.addRelationship('maintenance', 'companies', 'parent', 'companyId');

        // Feedback references companies and orders
        this.addRelationship('feedback', 'companies', 'parent', 'companyId');
        this.addRelationship('feedback', 'orders', 'reference', 'orderId');
    }

    /**
     * Add a relationship between entities.
     */
    addRelationship(
        from: string,
        to: string,
        type: RelationType,
        field?: string
    ): void {
        // Ensure nodes exist
        if (!this.nodes.has(from)) {
            this.nodes.set(from, { name: from, dependsOn: [], dependedBy: [] });
        }
        if (!this.nodes.has(to)) {
            this.nodes.set(to, { name: to, dependsOn: [], dependedBy: [] });
        }

        // Add relationship
        this.relationships.push({ from, to, type, field });

        // Update node links based on type
        const fromNode = this.nodes.get(from)!;
        const toNode = this.nodes.get(to)!;

        if (type === 'parent' || type === 'reference') {
            if (!fromNode.dependsOn.includes(to)) {
                fromNode.dependsOn.push(to);
            }
            if (!toNode.dependedBy.includes(from)) {
                toNode.dependedBy.push(from);
            }
        } else if (type === 'child') {
            if (!fromNode.dependedBy.includes(to)) {
                fromNode.dependedBy.push(to);
            }
            if (!toNode.dependsOn.includes(from)) {
                toNode.dependsOn.push(from);
            }
        }
    }

    /**
     * Get entities that depend on the given entity.
     * These should be invalidated when the entity changes.
     */
    getDependentEntities(entity: string, depth: number = 1): string[] {
        const node = this.nodes.get(entity);
        if (!node || depth <= 0) return [];

        const dependents = new Set<string>(node.dependedBy);

        if (depth > 1) {
            for (const dep of node.dependedBy) {
                const deeper = this.getDependentEntities(dep, depth - 1);
                deeper.forEach(d => dependents.add(d));
            }
        }

        return Array.from(dependents);
    }

    /**
     * Get entities that this entity depends on.
     * These should be prefetched when loading the entity.
     */
    getDependencies(entity: string, depth: number = 1): string[] {
        const node = this.nodes.get(entity);
        if (!node || depth <= 0) return [];

        const dependencies = new Set<string>(node.dependsOn);

        if (depth > 1) {
            for (const dep of node.dependsOn) {
                const deeper = this.getDependencies(dep, depth - 1);
                deeper.forEach(d => dependencies.add(d));
            }
        }

        return Array.from(dependencies);
    }

    /**
     * Get the invalidation cascade for an entity.
     * Returns all entities that should be invalidated when this entity changes.
     */
    getInvalidationCascade(entity: string): string[] {
        const cascade = new Set<string>();
        const visited = new Set<string>();

        const traverse = (current: string) => {
            if (visited.has(current)) return;
            visited.add(current);

            const dependents = this.getDependentEntities(current, 1);
            for (const dep of dependents) {
                cascade.add(dep);
                traverse(dep);
            }
        };

        traverse(entity);
        return Array.from(cascade);
    }

    /**
     * Get the prefetch list for an entity.
     * Returns entities that should be prefetched when viewing this entity.
     */
    getPrefetchList(entity: string, depth: number = 2): string[] {
        return this.getDependencies(entity, depth);
    }

    /**
     * Get the relationship between two entities.
     */
    getRelationship(from: string, to: string): Relationship | undefined {
        return this.relationships.find(r => r.from === from && r.to === to);
    }

    /**
     * Get all relationships for an entity.
     */
    getRelationships(entity: string): Relationship[] {
        return this.relationships.filter(r => r.from === entity || r.to === entity);
    }

    /**
     * Debug: Log the dependency graph.
     */
    debugGraph(): void {
        logger.debug('Dependency Graph', {
            component: 'DependencyGraph',
            nodes: Array.from(this.nodes.entries()).map(([name, node]) => ({
                name,
                dependsOn: node.dependsOn,
                dependedBy: node.dependedBy,
            })),
        });
    }
}

// Export singleton
export const dependencyGraph = new DependencyGraph();
