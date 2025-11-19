/**
 * IndexedDB Product Cache
 * Stores products locally for offline access and faster loading
 */

const DB_NAME = 'synergyflow_cache';
const DB_VERSION = 1;
const PRODUCTS_STORE = 'products';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedProduct {
  id: string;
  data: any;
  timestamp: number;
}

class ProductCacheDB {
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
        
        if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
          const store = db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getProducts(): Promise<any[] | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PRODUCTS_STORE], 'readonly');
      const store = transaction.objectStore(PRODUCTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const cached = request.result as CachedProduct[];
        
        if (cached.length === 0) {
          resolve(null);
          return;
        }

        // Check if cache is expired
        const now = Date.now();
        const isExpired = cached.some(item => now - item.timestamp > CACHE_DURATION);
        
        if (isExpired) {
          this.clearProducts();
          resolve(null);
          return;
        }

        resolve(cached.map(item => item.data));
      };

      request.onerror = () => reject(request.error);
    });
  }

  async setProducts(products: any[]): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PRODUCTS_STORE], 'readwrite');
      const store = transaction.objectStore(PRODUCTS_STORE);
      
      // Clear existing products
      store.clear();
      
      const timestamp = Date.now();
      products.forEach(product => {
        store.put({
          id: product.id,
          data: product,
          timestamp
        });
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearProducts(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PRODUCTS_STORE], 'readwrite');
      const store = transaction.objectStore(PRODUCTS_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PRODUCTS_STORE], 'readonly');
      const store = transaction.objectStore(PRODUCTS_STORE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const productCache = new ProductCacheDB();
