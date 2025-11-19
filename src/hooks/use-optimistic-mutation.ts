/** @format */

import { useState } from 'react';
import { optimisticCreate, optimisticUpdate, optimisticDelete } from '@/lib/optimistic-update-manager';
import { useToast } from './use-toast';

interface UseMutationOptions<T> {
  onSuccess?: (data?: T) => void;
  onError?: (error: Error) => void;
}

export function useOptimisticMutation<T = any>(collection: string, options?: UseMutationOptions<T>) {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const create = async (
    data: Record<string, any>,
    onOptimistic: (id: string) => void,
    onRollback: () => void
  ) => {
    setIsPending(true);
    try {
      const id = await optimisticCreate(
        collection,
        data,
        onOptimistic,
        () => {
          onRollback();
          toast({ title: 'Update failed', description: 'Changes reverted', variant: 'destructive' });
        }
      );
      options?.onSuccess?.(id as T);
      return id;
    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const update = async (
    docId: string,
    updates: Partial<T>,
    getCurrentState: () => Record<string, any>,
    onUpdate: (data: Partial<Record<string, any>>) => void
  ) => {
    setIsPending(true);
    try {
      await optimisticUpdate(
        collection,
        docId,
        updates as Partial<Record<string, any>>,
        getCurrentState,
        (data) => {
          onUpdate(data);
          if (data === getCurrentState()) {
            toast({ title: 'Update failed', description: 'Changes reverted', variant: 'destructive' });
          }
        }
      );
      options?.onSuccess?.();
    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const remove = async (
    docId: string,
    onDelete: () => void,
    onRestore: () => void
  ) => {
    setIsPending(true);
    try {
      await optimisticDelete(
        collection,
        docId,
        onDelete,
        () => {
          onRestore();
          toast({ title: 'Delete failed', description: 'Item restored', variant: 'destructive' });
        }
      );
      options?.onSuccess?.();
    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return { create, update, remove, isPending };
}
