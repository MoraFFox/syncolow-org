import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { optimisticUIManager } from '@/lib/optimistic-ui-manager';
import { invalidationEngine } from '@/lib/cache/invalidation-engine';
import { CacheKey } from '@/lib/cache/types';

/**
 * useOptimisticMutation Hook
 * 
 * Wraps React Query mutations with optimistic update support:
 * - Automatic optimistic state application
 * - Transaction tracking for UI indicators
 * - Automatic rollback on failure
 * - Cache invalidation on success
 */

interface OptimisticMutationOptions<TData, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'mutationFn'> {
  /** The async mutation function */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Entity name for cache invalidation */
  entity: string;
  /** Get the optimistic data from variables */
  getOptimisticData: (variables: TVariables) => TData;
  /** Cache key to update optimistically */
  cacheKey?: CacheKey;
  /** Get previous data for rollback (from cache) */
  getPreviousData?: () => TData | null;
  /** Called when optimistic update is applied */
  onOptimistic?: (data: TData, variables: TVariables) => void;
  /** Whether to invalidate related entities */
  invalidateRelated?: boolean;
}

export function useOptimisticMutation<
  TData = unknown,
  TVariables = void,
  TContext = unknown
>(options: OptimisticMutationOptions<TData, TVariables, TContext>) {
  const {
    mutationFn,
    entity,
    getOptimisticData,
    cacheKey,
    getPreviousData,
    onOptimistic,
    invalidateRelated = true,
    onSuccess,
    onError,
    ...restOptions
  } = options;

  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, TContext & { transactionId?: string }>({
    ...restOptions,
    mutationFn,
    onMutate: async (variables) => {
      const optimisticData = getOptimisticData(variables);
      const previousData = getPreviousData?.() ?? null;

      // Cancel any outgoing refetches
      if (cacheKey) {
        await queryClient.cancelQueries({
          queryKey: cacheKey as unknown as readonly unknown[]
        });
      }

      // Start optimistic transaction
      const transactionId = optimisticUIManager.startTransaction(
        entity,
        'update',
        optimisticData,
        previousData,
        {
          onOptimistic: (data) => {
            // Update cache optimistically
            if (cacheKey) {
              queryClient.setQueryData(
                cacheKey as unknown as readonly unknown[],
                data
              );
            }
            onOptimistic?.(data as TData, variables);
          },
          onRollback: (prevData) => {
            // Restore previous cache state
            if (cacheKey && prevData) {
              queryClient.setQueryData(
                cacheKey as unknown as readonly unknown[],
                prevData
              );
            }
          },
        }
      );

      // Return context with transaction ID
      return { transactionId } as TContext & { transactionId: string };
    },
    onSuccess: (data, variables, context) => {
      // Confirm the transaction
      if (context?.transactionId) {
        optimisticUIManager.confirmTransaction(context.transactionId, data);
      }

      // Invalidate caches
      if (invalidateRelated) {
        invalidationEngine.invalidate(entity, undefined, 'mutation-success');
      } else if (cacheKey) {
        queryClient.invalidateQueries({
          queryKey: cacheKey as unknown as readonly unknown[]
        });
      }

      // Call original onSuccess
      (onSuccess as any)?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Fail the transaction (triggers rollback)
      if (context?.transactionId) {
        optimisticUIManager.failTransaction(context.transactionId, error);
      }

      // Call original onError
      (onError as any)?.(error, variables, context);
    },
  });
}

/**
 * useOptimisticCreate Hook
 * 
 * Specialized mutation for create operations.
 */
export function useOptimisticCreate<TData, TVariables>(
  options: Omit<OptimisticMutationOptions<TData, TVariables, unknown>, 'getPreviousData'>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, { transactionId?: string }>({
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      const optimisticData = options.getOptimisticData(variables);

      // Cancel outgoing refetches
      if (options.cacheKey) {
        await queryClient.cancelQueries({
          queryKey: options.cacheKey as unknown as readonly unknown[]
        });
      }

      // Start transaction
      const transactionId = optimisticUIManager.startTransaction(
        options.entity,
        'create',
        optimisticData,
        null,
        {
          onOptimistic: (data) => {
            // Add to list cache if applicable
            if (options.cacheKey) {
              queryClient.setQueryData<TData[]>(
                options.cacheKey as unknown as readonly unknown[],
                (old) => old ? [...old, data as TData] : [data as TData]
              );
            }
            options.onOptimistic?.(data as TData, variables);
          },
          onRollback: () => {
            // Remove from list cache
            if (options.cacheKey) {
              queryClient.setQueryData<TData[]>(
                options.cacheKey as unknown as readonly unknown[],
                (old) => old?.filter(item => item !== optimisticData) ?? []
              );
            }
          },
        }
      );

      return { transactionId };
    },
    onSuccess: (data, variables, context) => {
      if (context?.transactionId) {
        optimisticUIManager.confirmTransaction(context.transactionId, data);
      }
      invalidationEngine.invalidate(options.entity, undefined, 'create-success');
      (options.onSuccess as any)?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (context?.transactionId) {
        optimisticUIManager.failTransaction(context.transactionId, error);
      }
      (options.onError as any)?.(error, variables, context);
    },
  });
}

/**
 * useOptimisticDelete Hook
 * 
 * Specialized mutation for delete operations.
 */
export function useOptimisticDelete<TData>(options: {
  mutationFn: (id: string) => Promise<void>;
  entity: string;
  cacheKey?: CacheKey;
  getItemToDelete?: (id: string) => TData | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { transactionId?: string; deletedItem: TData | null }>({
    mutationFn: options.mutationFn,
    onMutate: async (id) => {
      const deletedItem = options.getItemToDelete?.(id) ?? null;

      if (options.cacheKey) {
        await queryClient.cancelQueries({
          queryKey: options.cacheKey as unknown as readonly unknown[]
        });
      }

      const transactionId = optimisticUIManager.startTransaction(
        options.entity,
        'delete',
        { id } as any,
        deletedItem,
        {
          onOptimistic: () => {
            // Remove from list cache
            if (options.cacheKey) {
              queryClient.setQueryData<TData[]>(
                options.cacheKey as unknown as readonly unknown[],
                (old) => old?.filter((item: any) => item.id !== id) ?? []
              );
            }
          },
          onRollback: (prevItem) => {
            // Restore to list cache
            if (options.cacheKey && prevItem) {
              queryClient.setQueryData<TData[]>(
                options.cacheKey as unknown as readonly unknown[],
                (old) => old ? [...old, prevItem] : [prevItem]
              );
            }
          },
        }
      );

      return { transactionId, deletedItem };
    },
    onSuccess: (_data, _id, context) => {
      if (context?.transactionId) {
        optimisticUIManager.confirmTransaction(context.transactionId);
      }
      invalidationEngine.invalidate(options.entity, undefined, 'delete-success');
      options.onSuccess?.();
    },
    onError: (error, _id, context) => {
      if (context?.transactionId) {
        optimisticUIManager.failTransaction(context.transactionId, error);
      }
      options.onError?.(error);
    },
  });
}
