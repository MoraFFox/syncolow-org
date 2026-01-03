import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

/**
 * Optimistic UI Manager
 * 
 * Provides optimistic updates with rollback support:
 * - Transaction-based updates with unique IDs
 * - Automatic rollback on failure
 * - Visual state tracking (pending/synced/failed)
 * - Update history for debugging
 */

type UpdateStatus = 'pending' | 'synced' | 'failed' | 'rolled-back';

interface OptimisticTransaction<T = unknown> {
    id: string;
    entity: string;
    operation: 'create' | 'update' | 'delete';
    optimisticData: T;
    previousData: T | null;
    status: UpdateStatus;
    createdAt: number;
    syncedAt?: number;
    error?: string;
    rollbackFn?: () => void;
}

type TransactionCallback<T> = {
    onOptimistic?: (data: T) => void;
    onSuccess?: (data: T) => void;
    onError?: (error: Error, data: T) => void;
    onRollback?: (previousData: T | null) => void;
};

export class OptimisticUIManager {
    private transactions: Map<string, OptimisticTransaction> = new Map();
    private history: OptimisticTransaction[] = [];
    private readonly MAX_HISTORY = 50;
    private listeners: Set<() => void> = new Set();

    /**
     * Start an optimistic transaction.
     * Returns the transaction ID for tracking.
     */
    startTransaction<T>(
        entity: string,
        operation: 'create' | 'update' | 'delete',
        optimisticData: T,
        previousData: T | null,
        callbacks: TransactionCallback<T>
    ): string {
        const id = uuidv4();

        const transaction: OptimisticTransaction<T> = {
            id,
            entity,
            operation,
            optimisticData,
            previousData,
            status: 'pending',
            createdAt: Date.now(),
            rollbackFn: callbacks.onRollback
                ? () => callbacks.onRollback?.(previousData)
                : undefined,
        };

        this.transactions.set(id, transaction as OptimisticTransaction);

        // Apply optimistic update
        callbacks.onOptimistic?.(optimisticData);

        this.notifyListeners();

        return id;
    }

    /**
     * Mark a transaction as successfully synced.
     */
    confirmTransaction<T>(id: string, syncedData?: T): void {
        const transaction = this.transactions.get(id);
        if (!transaction) {
            logger.warn(`Transaction not found: ${id}`, { component: 'OptimisticUIManager' });
            return;
        }

        transaction.status = 'synced';
        transaction.syncedAt = Date.now();

        if (syncedData) {
            transaction.optimisticData = syncedData;
        }

        // Move to history
        this.archiveTransaction(id);
        this.notifyListeners();
    }

    /**
     * Mark a transaction as failed and trigger rollback.
     */
    failTransaction(id: string, error: Error): void {
        const transaction = this.transactions.get(id);
        if (!transaction) {
            logger.warn(`Transaction not found: ${id}`, { component: 'OptimisticUIManager' });
            return;
        }

        transaction.status = 'failed';
        transaction.error = error.message;

        // Execute rollback if available
        if (transaction.rollbackFn) {
            try {
                transaction.rollbackFn();
                transaction.status = 'rolled-back';
            } catch (rollbackError) {
                logger.error(rollbackError, {
                    component: 'OptimisticUIManager',
                    action: 'rollback',
                    transactionId: id,
                });
            }
        }

        // Move to history
        this.archiveTransaction(id);
        this.notifyListeners();
    }

    /**
     * Rollback a specific transaction.
     */
    rollback(id: string): boolean {
        const transaction = this.transactions.get(id);
        if (!transaction) return false;

        if (transaction.rollbackFn) {
            try {
                transaction.rollbackFn();
                transaction.status = 'rolled-back';
                this.archiveTransaction(id);
                this.notifyListeners();
                return true;
            } catch (error) {
                logger.error(error, {
                    component: 'OptimisticUIManager',
                    action: 'manualRollback',
                    transactionId: id,
                });
            }
        }

        return false;
    }

    /**
     * Rollback all pending transactions.
     */
    rollbackAll(): void {
        for (const [id, transaction] of this.transactions) {
            if (transaction.status === 'pending' && transaction.rollbackFn) {
                try {
                    transaction.rollbackFn();
                    transaction.status = 'rolled-back';
                } catch (error) {
                    logger.error(error, {
                        component: 'OptimisticUIManager',
                        action: 'rollbackAll',
                        transactionId: id,
                    });
                }
            }
        }

        this.transactions.clear();
        this.notifyListeners();
    }

    /**
     * Get all pending transactions.
     */
    getPendingTransactions(): OptimisticTransaction[] {
        return Array.from(this.transactions.values())
            .filter(t => t.status === 'pending');
    }

    /**
     * Get transaction by ID.
     */
    getTransaction(id: string): OptimisticTransaction | undefined {
        return this.transactions.get(id);
    }

    /**
     * Get transaction history.
     */
    getHistory(): OptimisticTransaction[] {
        return [...this.history];
    }

    /**
     * Get statistics.
     */
    getStats(): {
        pending: number;
        synced: number;
        failed: number;
        rolledBack: number;
    } {
        const all = [...this.transactions.values(), ...this.history];
        return {
            pending: all.filter(t => t.status === 'pending').length,
            synced: all.filter(t => t.status === 'synced').length,
            failed: all.filter(t => t.status === 'failed').length,
            rolledBack: all.filter(t => t.status === 'rolled-back').length,
        };
    }

    /**
     * Subscribe to transaction changes.
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Move transaction to history.
     */
    private archiveTransaction(id: string): void {
        const transaction = this.transactions.get(id);
        if (transaction) {
            this.history.push(transaction);
            this.transactions.delete(id);

            // Trim history
            if (this.history.length > this.MAX_HISTORY) {
                this.history = this.history.slice(-this.MAX_HISTORY);
            }
        }
    }

    /**
     * Notify all listeners of changes.
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    /**
     * Clear all data (for testing/debugging).
     */
    clear(): void {
        this.transactions.clear();
        this.history = [];
        this.notifyListeners();
    }
}

// Export singleton
export const optimisticUIManager = new OptimisticUIManager();
