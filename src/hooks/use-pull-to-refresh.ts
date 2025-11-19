import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;

      if (distance > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(distance, threshold * 1.5));
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      setIsPulling(false);

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isPulling, isRefreshing, pullDistance, threshold, onRefresh]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min((pullDistance / threshold) * 100, 100),
  };
}
