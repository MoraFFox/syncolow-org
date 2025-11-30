/** @format */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

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

  // 3. Offline Queue (Legacy Support)
  // We keep the existing sync handler for compatibility with OfflineQueueManager
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

// --- Legacy Helper Functions ---

async function syncOfflineQueue() {
  const db = await openIndexedDB();
  const queue = await getAllFromStore(db, 'queue');
  
  for (const item of queue) {
    try {
      await processQueueItem(item);
      await deleteFromStore(db, 'queue', item.id);
    } catch (error) {
      console.error('Sync failed for item:', item.id, error);
    }
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SynergyFlowDB', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function processQueueItem(item) {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  
  if (!response.ok) throw new Error('Sync failed');
}
