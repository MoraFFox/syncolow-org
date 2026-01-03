/** @format */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Database configuration - aligned with src/lib/indexeddb-storage.ts
const DB_NAME = 'synergyflow_offline';
const DB_VERSION = 2;
const QUEUE_STORE = 'offline_queue';

if (workbox) {
  console.log(`Workbox is loaded`);

  // 1. Static Assets (CacheFirst)
  // Images, Styles, Scripts, Fonts
  workbox.routing.registerRoute(
    ({request}) => ['image', 'style', 'script', 'font'].includes(request.destination),
    new workbox.strategies.CacheFirst({
      cacheName: 'static-assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // 2. API Reads (Supabase) - NetworkFirst
  // We use NetworkFirst to ensure fresh data, but fallback to cache if offline.
  // This complements the in-memory (L1) and IndexedDB (L2) caches by providing a network-level fallback.
  workbox.routing.registerRoute(
    ({url}) => url.hostname.includes('supabase.co'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 Hours
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // 3. Offline Queue Background Sync
  // Uses the same DB/store as src/lib/indexeddb-storage.ts
  self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-offline-queue') {
      event.waitUntil(syncOfflineQueue());
    }
  });

  // 4. Push Notifications
  self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'SynergyFlow', {
        body: data.message || 'New notification',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: data.id || 'default',
        data: data,
      })
    );
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
      clients.openWindow(event.notification.data?.link || '/')
    );
  });

} else {
  console.log(`Workbox failed to load`);
}

// --- Offline Queue Sync Functions ---

/**
 * Syncs all items in the offline queue to the server.
 * Uses the same DB (synergyflow_offline) and store (offline_queue) as the app.
 */
async function syncOfflineQueue() {
  try {
    const db = await openIndexedDB();
    const queue = await getAllFromStore(db, QUEUE_STORE);
    
    console.log(`[SW] Syncing ${queue.length} offline operations`);
    
    for (const item of queue) {
      try {
        await processQueueItem(item);
        await deleteFromStore(db, QUEUE_STORE, item.id);
        console.log(`[SW] Synced item: ${item.id}`);
      } catch (error) {
        console.error('[SW] Sync failed for item:', item.id, error);
        // Don't delete failed items - they'll be retried
      }
    }
    
    db.close();
  } catch (error) {
    console.error('[SW] Failed to sync offline queue:', error);
  }
}

/**
 * Opens the IndexedDB database used by the app.
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    // Handle upgrade in case SW runs before app initializes DB
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Gets all items from a store.
 */
function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes an item from a store.
 */
function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Processes a single queue item by sending it to the sync API.
 */
async function processQueueItem(item) {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: item.operation,
      collection: item.collection,
      data: item.data,
      docId: item.docId,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Sync failed with status ${response.status}`);
  }
}
