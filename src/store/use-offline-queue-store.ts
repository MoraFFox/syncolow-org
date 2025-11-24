import { create } from 'zustand';
import { indexedDBStorage, QueuedOperation } from '@/lib/indexeddb-storage';
import { logError } from '@/lib/error-logger';

interface OfflineQueueState {
  queue: QueuedOperation[];
  isProcessing: boolean;
  
  loadQueue: () => Promise<void>;
  addToQueue: (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  updateQueueItem: (operation: QueuedOperation) => Promise<void>;
  clearQueue: () => Promise<void>;
  setProcessing: (isProcessing: boolean) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  queue: [],
  isProcessing: false,

  loadQueue: async () => {
    try {
      const queue = await indexedDBStorage.getQueue();
      set({ queue: queue.sort((a, b) => a.timestamp - b.timestamp) });
    } catch (error: any) {
      logError(error, {
        component: 'useOfflineQueueStore',
        action: 'loadQueue'
      });
    }
  },

  addToQueue: async (operation) => {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: `${operation.collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };

    try {
      await indexedDBStorage.addToQueue(queuedOp);
      set((state) => ({ queue: [...state.queue, queuedOp] }));
    } catch (error: any) {
      logError(error, {
        component: 'useOfflineQueueStore',
        action: 'addToQueue',
        data: { operation }
      });
      throw error;
    }
  },

  removeFromQueue: async (id) => {
    try {
      await indexedDBStorage.removeFromQueue(id);
      set((state) => ({ queue: state.queue.filter((op) => op.id !== id) }));
    } catch (error: any) {
      logError(error, {
        component: 'useOfflineQueueStore',
        action: 'removeFromQueue',
        data: { id }
      });
    }
  },

  updateQueueItem: async (operation) => {
    try {
      await indexedDBStorage.updateQueueItem(operation);
      set((state) => ({
        queue: state.queue.map((op) => (op.id === operation.id ? operation : op)),
      }));
    } catch (error: any) {
      logError(error, {
        component: 'useOfflineQueueStore',
        action: 'updateQueueItem',
        data: { operationId: operation.id }
      });
    }
  },

  clearQueue: async () => {
    try {
      await indexedDBStorage.clearQueue();
      set({ queue: [] });
    } catch (error: any) {
      logError(error, {
        component: 'useOfflineQueueStore',
        action: 'clearQueue'
      });
    }
  },

  setProcessing: (isProcessing) => set({ isProcessing }),
}));

