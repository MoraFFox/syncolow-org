
import { supabase } from '@/lib/supabase';
import { useOfflineQueueStore } from '@/store/use-offline-queue-store';
import { QueuedOperation } from './indexeddb-storage';
import { toast } from '@/hooks/use-toast';
import { logger } from './logger';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

class OfflineQueueManager {
  private isProcessing = false;

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    const { queue, removeFromQueue, updateQueueItem, setProcessing } = useOfflineQueueStore.getState();
    
    if (queue.length === 0) return;

    this.isProcessing = true;
    setProcessing(true);

    const sortedQueue = this.prioritizeQueue(queue);
    let successCount = 0;
    let failCount = 0;

    for (const operation of sortedQueue) {
      try {
        await this.processOperation(operation);
        await removeFromQueue(operation.id);
        successCount++;
      } catch (error: any) {
        failCount++;
        
        if (operation.retries >= MAX_RETRIES) {
          logger.error(error, { component: 'OfflineQueueManager', action: 'processQueue - max retries', operationId: operation.id });
          await updateQueueItem({
            ...operation,
            error: error.message || 'Max retries exceeded',
          });
        } else {
          await updateQueueItem({
            ...operation,
            retries: operation.retries + 1,
            error: error.message,
          });
          
          // Schedule retry with exponential backoff
          const delay = RETRY_DELAYS[operation.retries] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          setTimeout(() => this.processQueue(), delay);
        }
      }
    }

    this.isProcessing = false;
    setProcessing(false);

    if (successCount > 0) {
      toast({
        title: 'Sync Complete',
        description: `${successCount} operation(s) synced successfully.`,
      });
    }

    if (failCount > 0) {
      toast({
        title: 'Sync Issues',
        description: `${failCount} operation(s) failed. Will retry automatically.`,
        variant: 'destructive',
      });
    }
  }

  private prioritizeQueue(queue: QueuedOperation[]): QueuedOperation[] {
    const priority: Record<string, number> = {
      orders: 1,
      companies: 2,
      products: 3,
      maintenance: 4,
    };

    return [...queue].sort((a, b) => {
      const aPriority = priority[a.collection] || 999;
      const bPriority = priority[b.collection] || 999;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.timestamp - b.timestamp;
    });
  }

  private async processOperation(operation: QueuedOperation): Promise<void> {
    switch (operation.operation) {
      case 'create':
        const { error: createError } = await supabase
            .from(operation.collection)
            .insert(operation.data);
        if (createError) throw createError;
        break;

      case 'update':
        if (!operation.data.id) throw new Error('Update operation requires id');
        
        // Check for conflicts before updating
        const { conflictResolver } = await import('./conflict-resolver');
        const { useConflictStore } = await import('@/store/use-conflict-store');
        
        const conflict = await conflictResolver.detectConflict(
          operation.collection,
          operation.data.id,
          operation.data,
          operation.timestamp
        );
        
        if (conflict) {
          conflict.operationId = operation.id;
          useConflictStore.getState().addConflict(conflict);
          throw new Error('Conflict detected - requires manual resolution');
        }
        
        const { id, ...updateData } = operation.data;
        const { error: updateError } = await supabase
            .from(operation.collection)
            .update(updateData)
            .eq('id', operation.data.id);
            
        if (updateError) throw updateError;
        break;

      case 'delete':
        if (!operation.docId) throw new Error('Delete operation requires docId');
        const { error: deleteError } = await supabase
            .from(operation.collection)
            .delete()
            .eq('id', operation.docId);
            
        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.operation}`);
    }
  }

  async retryOperation(operationId: string): Promise<void> {
    const { queue } = useOfflineQueueStore.getState();
    const operation = queue.find((op) => op.id === operationId);

    if (!operation) {
      throw new Error('Operation not found in queue');
    }

    try {
      await this.processOperation(operation);
      await useOfflineQueueStore.getState().removeFromQueue(operationId);
      
      toast({
        title: 'Operation Synced',
        description: 'The operation was successfully synced.',
      });
    } catch (error: any) {
      await useOfflineQueueStore.getState().updateQueueItem({
        ...operation,
        retries: operation.retries + 1,
        error: error.message,
      });
      
      throw error;
    }
  }
}

export const offlineQueueManager = new OfflineQueueManager();
