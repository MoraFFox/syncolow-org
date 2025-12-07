import { useEffect } from 'react';

export function useAppShellData(
  user: any,
  fetchInitialData: () => void,
  fetchOrders: (limit: number) => void
) {
  useEffect(() => {
    if (user) {
      fetchInitialData();
      fetchOrders(50);

      // Preload cache in background
      // import('@/lib/cache-manager').then(({ cacheManager }) => {
      //   cacheManager.preloadAll().catch(console.error);
      // });
    }
  }, [user, fetchInitialData, fetchOrders]);
}
