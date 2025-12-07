import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAppShellAuth(
  authLoading: boolean,
  user: any,
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
