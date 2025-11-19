/** @format */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered');
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function requestBackgroundSync(tag: string = 'sync-offline-queue'): Promise<void> {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    console.warn('Background Sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
    console.log('Background sync registered');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  
  return await Notification.requestPermission();
}

export async function subscribeToPushNotifications(vapidPublicKey: string): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.unregister();
    console.log('Service Worker unregistered');
  }
}

