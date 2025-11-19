import { create } from 'zustand';
import { indexedDBStorage, QueuedOperation } from '@/lib/indexeddb-storage';

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
    } catch (error) {
      console.error('Failed to load queue:', error);
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
    } catch (error) {
      console.error('Failed to add to queue:', error);
      throw error;
    }
  },

  removeFromQueue: async (id) => {
    try {
      await indexedDBStorage.removeFromQueue(id);
      set((state) => ({ queue: state.queue.filter((op) => op.id !== id) }));
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  },

  updateQueueItem: async (operation) => {
    try {
      await indexedDBStorage.updateQueueItem(operation);
      set((state) => ({
        queue: state.queue.map((op) => (op.id === operation.id ? operation : op)),
      }));
    } catch (error) {
      console.error('Failed to update queue item:', error);
    }
  },

  clearQueue: async () => {
    try {
      await indexedDBStorage.clearQueue();
      set({ queue: [] });
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  },

  setProcessing: (isProcessing) => set({ isProcessing }),
}));

