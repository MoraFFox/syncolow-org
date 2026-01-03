
/** @format */

import { supabase } from './supabase';
import { useOfflineQueueStore } from '@/store/use-offline-queue-store';
import { requestBackgroundSync } from './service-worker-manager';

type Operation = 'create' | 'update' | 'delete';
type RollbackFn = () => void;

interface OptimisticUpdate {
  id: string;
  operation: Operation;
  collection: string;
  rollback: RollbackFn;
  timestamp: number;
}

const pendingUpdates = new Map<string, OptimisticUpdate>();

/**
 * Helper to add operation to offline queue and trigger background sync
 */
async function enqueueOfflineOperation(
  operation: 'create' | 'update' | 'delete',
  collection: string,
  data?: Record<string, unknown>,
  docId?: string
): Promise<void> {
  const { addToQueue } = useOfflineQueueStore.getState();

  await addToQueue({
    operation,
    collection,
    data,
    docId,
    priority: 1,
  });

  // Request background sync to process the queue when online
  await requestBackgroundSync();
}

export async function optimisticCreate<T extends Record<string, unknown>>(
  collectionName: string,
  data: T,
  onSuccess: (id: string) => void,
  onRollback: () => void
): Promise<string> {
  const tempId = `temp_${Date.now()}_${Math.random()}`;

  // Apply optimistic update
  onSuccess(tempId);

  const updateId = `${collectionName}_${tempId}`;
  pendingUpdates.set(updateId, {
    id: updateId,
    operation: 'create',
    collection: collectionName,
    rollback: onRollback,
    timestamp: Date.now()
  });

  try {
    const { data: insertedData, error } = await supabase
      .from(collectionName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    pendingUpdates.delete(updateId);
    onSuccess(insertedData.id); // Update with real ID
    return insertedData.id;
  } catch (error) {
    if (!navigator.onLine) {
      await enqueueOfflineOperation('create', collectionName, data);
      return tempId;
    }
    // Rollback on error
    onRollback();
    pendingUpdates.delete(updateId);
    throw error;
  }
}

export async function optimisticUpdate<T extends Record<string, unknown>>(
  collectionName: string,
  docId: string,
  updates: Partial<T>,
  getCurrentState: () => T,
  onUpdate: (data: Partial<T>) => void
): Promise<void> {
  const previousState = getCurrentState();

  // Apply optimistic update
  onUpdate(updates);

  const updateId = `${collectionName}_${docId}`;
  pendingUpdates.set(updateId, {
    id: updateId,
    operation: 'update',
    collection: collectionName,
    rollback: () => onUpdate(previousState),
    timestamp: Date.now()
  });

  try {
    const { error } = await supabase
      .from(collectionName)
      .update(updates)
      .eq('id', docId);

    if (error) throw error;
    pendingUpdates.delete(updateId);
  } catch (error) {
    if (!navigator.onLine) {
      await enqueueOfflineOperation('update', collectionName, { id: docId, ...updates }, docId);
      return;
    }
    // Rollback on error
    onUpdate(previousState);
    pendingUpdates.delete(updateId);
    throw error;
  }
}

export async function optimisticDelete(
  collectionName: string,
  docId: string,
  onDelete: () => void,
  onRestore: () => void
): Promise<void> {
  // Apply optimistic delete
  onDelete();

  const updateId = `${collectionName}_${docId}`;
  pendingUpdates.set(updateId, {
    id: updateId,
    operation: 'delete',
    collection: collectionName,
    rollback: onRestore,
    timestamp: Date.now()
  });

  try {
    const { error } = await supabase
      .from(collectionName)
      .delete()
      .eq('id', docId);

    if (error) throw error;
    pendingUpdates.delete(updateId);
  } catch (error) {
    if (!navigator.onLine) {
      await enqueueOfflineOperation('delete', collectionName, undefined, docId);
      return;
    }
    // Rollback on error
    onRestore();
    pendingUpdates.delete(updateId);
    throw error;
  }
}

export function rollbackAll(): void {
  pendingUpdates.forEach(update => update.rollback());
  pendingUpdates.clear();
}

export function getPendingCount(): number {
  return pendingUpdates.size;
}
