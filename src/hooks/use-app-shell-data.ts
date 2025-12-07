import { useEffect } from 'react';
import type { User } from '@/lib/types';

/**
 * Hook to handle app shell data loading based on authentication state
 */
export function useAppShellData(
  user: User | null,
  fetchInitialData: () => void,
  fetchOrders: (limit: number) => void
) {
  useEffect(() => {
    if (user) {
      fetchInitialData();
      fetchOrders(50);
    }
  }, [user, fetchInitialData, fetchOrders]);
}
