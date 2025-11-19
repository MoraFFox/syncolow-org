import { indexedDBStorage } from './indexeddb-storage';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const COLLECTIONS_TO_CACHE = ['orders', 'companies', 'products', 'maintenance', 'manufacturers', 'categories', 'taxes'];

export class CacheManager {
  async get<T>(collectionName: string, forceRefresh = false): Promise<T[] | null> {
    if (forceRefresh) {
      return await this.fetchAndCache<T>(collectionName);
    }

    // Try cache first
    const cached = await indexedDBStorage.getCache(collectionName);
    const cacheTimestamp = await indexedDBStorage.getCacheTimestamp(collectionName);

    if (cached && cacheTimestamp) {
      const age = Date.now() - cacheTimestamp;
      
      // If cache is fresh, return it
      if (age < CACHE_DURATION) {
        return cached as T[];
      }
      
      // Cache is stale, fetch in background and return stale data
      this.fetchAndCache<T>(collectionName).catch(console.error);
      return cached as T[];
    }

    // No cache, fetch from Firestore
    return await this.fetchAndCache<T>(collectionName);
  }

  private async fetchAndCache<T>(collectionName: string): Promise<T[]> {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
      
      await indexedDBStorage.setCache(collectionName, data);
      return data;
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      
      // If offline, return stale cache if available
      const cached = await indexedDBStorage.getCache(collectionName);
      if (cached) return cached as T[];
      
      throw error;
    }
  }

  async invalidate(collectionName: string): Promise<void> {
    await indexedDBStorage.clearCache(collectionName);
  }

  async invalidateAll(): Promise<void> {
    await indexedDBStorage.clearCache();
  }

  async preloadAll(): Promise<void> {
    const promises = COLLECTIONS_TO_CACHE.map(col => 
      this.get(col, true).catch(err => console.error(`Failed to preload ${col}:`, err))
    );
    await Promise.all(promises);
  }

  async cleanupOldCache(): Promise<void> {
    await indexedDBStorage.clearOldCache(24 * 60 * 60 * 1000); // 24 hours
  }
}

export const cacheManager = new CacheManager();

