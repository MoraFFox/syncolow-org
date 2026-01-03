import { QueryClient } from '@tanstack/react-query';
import { dependencyGraph } from './dependency-graph';
import { idbStorage } from './indexed-db';
import { CacheKey } from './types';
import { logger } from '@/lib/logger';

/**
 * Invalidation Engine
 * 
 * Handles smart cache invalidation with:
 * - Dependency tracking (cascade invalidation)
 * - Batching to prevent cache thrashing
 * - Selective field invalidation
 * - Invalidation audit logging
 */

interface InvalidationEvent {
    id: string;
    timestamp: number;
    entity: string;
    entityId?: string;
    cascadedTo: string[];
    reason: string;
}

interface PendingInvalidation {
    entity: string;
    entityId?: string;
    reason: string;
    addedAt: number;
}

export class InvalidationEngine {
    private queryClient: QueryClient | null = null;
    private pendingInvalidations: PendingInvalidation[] = [];
    private batchTimer: NodeJS.Timeout | null = null;
    private readonly BATCH_DELAY_MS = 50; // Batch within 50ms
    private auditLog: InvalidationEvent[] = [];
    private readonly MAX_AUDIT_LOG = 100;

    /**
     * Initialize with QueryClient.
     */
    initialize(queryClient: QueryClient): void {
        this.queryClient = queryClient;
        logger.debug('InvalidationEngine initialized', { component: 'InvalidationEngine' });
    }

    /**
     * Invalidate an entity and its dependents.
     * Batches invalidations to prevent thrashing.
     */
    invalidate(entity: string, entityId?: string, reason: string = 'manual'): void {
        this.pendingInvalidations.push({
            entity,
            entityId,
            reason,
            addedAt: Date.now(),
        });

        // Schedule batch processing
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.processBatch(), this.BATCH_DELAY_MS);
        }
    }

    /**
     * Invalidate immediately (bypasses batching).
     */
    async invalidateNow(entity: string, entityId?: string, reason: string = 'immediate'): Promise<void> {
        await this.executeInvalidation(entity, entityId, reason);
    }

    /**
     * Process batched invalidations.
     */
    private async processBatch(): Promise<void> {
        this.batchTimer = null;

        if (this.pendingInvalidations.length === 0) return;

        // Deduplicate by entity+entityId
        const unique = new Map<string, PendingInvalidation>();
        for (const inv of this.pendingInvalidations) {
            const key = `${inv.entity}:${inv.entityId || 'all'}`;
            if (!unique.has(key)) {
                unique.set(key, inv);
            }
        }

        this.pendingInvalidations = [];

        // Execute invalidations
        for (const inv of unique.values()) {
            await this.executeInvalidation(inv.entity, inv.entityId, inv.reason);
        }
    }

    /**
     * Execute a single invalidation with cascade.
     */
    private async executeInvalidation(
        entity: string,
        entityId?: string,
        reason: string = ''
    ): Promise<void> {
        if (!this.queryClient) {
            logger.warn('QueryClient not initialized', { component: 'InvalidationEngine' });
            return;
        }

        const cascadedTo: string[] = [];

        // 1. Invalidate the entity itself
        if (entityId) {
            // Invalidate specific entity detail
            await this.queryClient.invalidateQueries({
                predicate: (query) => {
                    const key = query.queryKey as unknown as CacheKey;
                    return key[2] === entity && key[3]?.id === entityId;
                },
            });

            // Also invalidate lists that might contain this entity
            await this.queryClient.invalidateQueries({
                predicate: (query) => {
                    const key = query.queryKey as unknown as CacheKey;
                    return key[2] === entity && key[1] === 'list';
                },
            });
        } else {
            // Invalidate all caches for this entity
            await this.queryClient.invalidateQueries({
                predicate: (query) => {
                    const key = query.queryKey as unknown as CacheKey;
                    return key[2] === entity;
                },
            });
        }

        // 2. Cascade to dependent entities
        const dependents = dependencyGraph.getInvalidationCascade(entity);
        for (const dependent of dependents) {
            cascadedTo.push(dependent);

            // Invalidate dependent entity lists (not details, as they may not be affected)
            await this.queryClient.invalidateQueries({
                predicate: (query) => {
                    const key = query.queryKey as unknown as CacheKey;
                    return key[2] === dependent && key[1] === 'list';
                },
            });
        }

        // 3. Log the invalidation event
        this.logEvent({
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            entity,
            entityId,
            cascadedTo,
            reason,
        });

        logger.debug('Invalidation executed', {
            component: 'InvalidationEngine',
            entity,
            entityId,
            cascadedTo: cascadedTo.length,
            reason,
        });
    }

    /**
     * Invalidate by tag (matches namespace or entity).
     */
    async invalidateByTag(tag: string): Promise<void> {
        if (!this.queryClient) return;

        await this.queryClient.invalidateQueries({
            predicate: (query) => {
                const key = query.queryKey as unknown as CacheKey;
                return key[0] === tag || key[2] === tag;
            },
        });

        this.logEvent({
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            entity: tag,
            cascadedTo: [],
            reason: 'tag-based',
        });
    }

    /**
     * Full cache clear.
     */
    async clearAll(): Promise<void> {
        if (!this.queryClient) return;

        await this.queryClient.invalidateQueries();
        await idbStorage.clear();

        this.logEvent({
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            entity: 'all',
            cascadedTo: [],
            reason: 'full-clear',
        });
    }

    /**
     * Log an invalidation event.
     */
    private logEvent(event: InvalidationEvent): void {
        this.auditLog.push(event);

        // Trim log to max size
        if (this.auditLog.length > this.MAX_AUDIT_LOG) {
            this.auditLog = this.auditLog.slice(-this.MAX_AUDIT_LOG);
        }
    }

    /**
     * Get the audit log.
     */
    getAuditLog(): InvalidationEvent[] {
        return [...this.auditLog];
    }

    /**
     * Clear the audit log.
     */
    clearAuditLog(): void {
        this.auditLog = [];
    }

    /**
     * Get pending invalidations count.
     */
    getPendingCount(): number {
        return this.pendingInvalidations.length;
    }
}

// Export singleton
export const invalidationEngine = new InvalidationEngine();
