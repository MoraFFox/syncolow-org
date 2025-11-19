/** @format */

import { db } from './firebase';
import { doc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { addToOfflineQueue } from './indexeddb-storage';

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

export async function optimisticCreate<T extends Record<string, any>>(
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
    const docRef = await addDoc(collection(db, collectionName), data);
    pendingUpdates.delete(updateId);
    onSuccess(docRef.id); // Update with real ID
    return docRef.id;
  } catch (error) {
    if (!navigator.onLine) {
      await addToOfflineQueue({ id: tempId, operation: 'create', collection: collectionName, data, timestamp: Date.now(), retries: 0, priority: 1 });
      return tempId;
    }
    // Rollback on error
    onRollback();
    pendingUpdates.delete(updateId);
    throw error;
  }
}

export async function optimisticUpdate<T extends Record<string, any>>(
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
    await updateDoc(doc(db, collectionName, docId), updates as any);
    pendingUpdates.delete(updateId);
  } catch (error) {
    if (!navigator.onLine) {
      await addToOfflineQueue({ id: `${collectionName}_${docId}`, operation: 'update', collection: collectionName, docId, data: updates, timestamp: Date.now(), retries: 0, priority: 1 });
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
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    pendingUpdates.delete(updateId);
  } catch (error) {
    if (!navigator.onLine) {
      await addToOfflineQueue({ id: `${collectionName}_${docId}`, operation: 'delete', collection: collectionName, docId, timestamp: Date.now(), retries: 0, priority: 1 });
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

