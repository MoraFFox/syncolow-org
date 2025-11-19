import { useEffect } from 'react';
import { useOnlineStatus } from './use-online-status';
import { useOfflineQueueStore } from '@/store/use-offline-queue-store';
import { offlineQueueManager } from '@/lib/offline-queue-manager';

export function useOfflineQueue() {
  const isOnline = useOnlineStatus();
  const { loadQueue, queue, isProcessing } = useOfflineQueueStore();

  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isProcessing) {
      offlineQueueManager.processQueue();
    }
  }, [isOnline, queue.length, isProcessing]);

  return {
    queue,
    isProcessing,
    pendingCount: queue.length,
  };
}
