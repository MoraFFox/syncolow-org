import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

/**
 * Hook to handle authentication-based routing in app shell
 */
export function useAppShellAuth(
  authLoading: boolean,
  user: User | null,
  pathname: string,
  isPublicRoute: boolean
) {
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (user && isPublicRoute && pathname !== '/feedback/submit') {
        router.push('/dashboard');
      }
      if (!user && !isPublicRoute) {
        router.push('/login');
      }
    }
  }, [authLoading, user, router, pathname, isPublicRoute]);

  return { shouldShowLoader: authLoading || (!user && !isPublicRoute) };
}
