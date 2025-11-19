const DB_NAME = 'synergyflow_offline';
const DB_VERSION = 2;
const QUEUE_STORE = 'offline_queue';
const CACHE_STORE = 'data_cache';

export interface QueuedOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  data?: any;
  docId?: string;
  timestamp: number;
  retries: number;
  priority: number;
  error?: string;
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
          cacheStore.createIndex('collection', 'collection', { unique: false });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addToQueue(operation: QueuedOperation): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.add(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getQueue(): Promise<QueuedOperation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateQueueItem(operation: QueuedOperation): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.put(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearQueue(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldItems(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const queue = await this.getQueue();
    const now = Date.now();
    
    for (const item of queue) {
      if (now - item.timestamp > maxAge) {
        await this.removeFromQueue(item.id);
      }
    }
  }

  // Cache methods
  async setCache(collection: string, data: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      
      const cacheEntry = {
        key: collection,
        collection,
        data,
        timestamp: Date.now(),
      };
      
      const request = store.put(cacheEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(collection: string): Promise<any[] | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(collection);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheTimestamp(collection: string): Promise<number | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(collection);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.timestamp : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(collection?: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      
      if (collection) {
        const request = store.delete(collection);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } else {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }
    });
  }

  async clearOldCache(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const index = store.index('timestamp');
      const now = Date.now();
      const cutoff = now - maxAge;
      
      const request = index.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.timestamp < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBStorage = new IndexedDBStorage();

export async function addToOfflineQueue(operation: QueuedOperation): Promise<void> {
  return indexedDBStorage.addToQueue(operation);
}

