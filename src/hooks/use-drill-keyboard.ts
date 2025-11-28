import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDrillDownStore } from '@/store/use-drilldown-store';

export function useDrillKeyboard() {
  const router = useRouter();
  const { goBack, goForward, canGoBack, canGoForward } = useDrillDownStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft' && canGoBack()) {
        e.preventDefault();
        const item = goBack();
        if (item) router.push(item.route);
      }
      
      if (e.altKey && e.key === 'ArrowRight' && canGoForward()) {
        e.preventDefault();
        const item = goForward();
        if (item) router.push(item.route);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, goBack, goForward, canGoBack, canGoForward]);
}
