/** @format */

import { useEffect, useState } from 'react';
import { registerServiceWorker, requestBackgroundSync } from '@/lib/service-worker-manager';

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      registerServiceWorker().then(setRegistration);
    }
  }, []);

  const syncQueue = async () => {
    if (registration) {
      await requestBackgroundSync();
    }
  };

  return { registration, isSupported, syncQueue };
}
