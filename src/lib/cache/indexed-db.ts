import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CacheEntry, CacheKey } from './types';
import { logger } from '../logger';

interface UniversalCacheDB extends DBSchema {
  'universal-cache': {
    key: string; // Serialized CacheKey
    value: CacheEntry;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'universal-cache-db';
const DB_VERSION = 2; // Bump version to force schema recreation
const STORE_NAME = 'universal-cache';

export class IndexedDBStorage {
  private dbPromise: Promise<IDBPDatabase<UniversalCacheDB>> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.dbPromise = openDB<UniversalCacheDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Robust handling: If store exists (e.g. from version 1), delete it to ensure clean state
          if (db.objectStoreNames.contains(STORE_NAME)) {
            db.deleteObjectStore(STORE_NAME);
          }
          
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('by-timestamp', 'metadata.updatedAt');
        },
      });
    }
  }

  /**
   * Serializes the complex CacheKey into a string for IDB storage.
   */
  private serializeKey(key: CacheKey): string {
    return JSON.stringify(key);
  }

  async get(key: CacheKey): Promise<CacheEntry | undefined> {
    if (!this.dbPromise) return undefined;
    const db = await this.dbPromise;
    return db.get(STORE_NAME, this.serializeKey(key));
  }

  async set(key: CacheKey, entry: CacheEntry): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const serializedKey = this.serializeKey(key);
    await db.put(STORE_NAME, {
      ...entry,
      key: serializedKey,
    } as any);
    
    // Trigger eviction check (fire and forget)
    this.prune().catch(err => logger.error(err, { component: 'IndexedDBStorage', action: 'prune' }));
  }

  async del(key: CacheKey): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, this.serializeKey(key));
  }

  async clear(): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    await db.clear(STORE_NAME);
  }

  /**
   * LRU Eviction Policy
   * Keeps the cache size within limits by removing oldest entries.
   */
  async prune(maxEntries = 1000, maxAge = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index('by-timestamp');
    
    // 1. Remove expired items (Time-based)
    const now = Date.now();
    const expiryRange = IDBKeyRange.upperBound(now - maxAge);
    
    let cursor = await index.openCursor(expiryRange);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    // 2. Remove items if count exceeds limit (Size-based)
    const count = await tx.store.count();
    if (count > maxEntries) {
      const deleteCount = count - maxEntries;
      // Iterate from oldest to newest
      let deleteCursor = await index.openCursor();
      let deleted = 0;
      while (deleteCursor && deleted < deleteCount) {
        await deleteCursor.delete();
        deleteCursor = await deleteCursor.continue();
        deleted++;
      }
    }
    
    await tx.done;
  }
}

export const idbStorage = new IndexedDBStorage();
