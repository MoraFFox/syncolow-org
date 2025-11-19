import { useEffect, useRef, useState } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe(handlers: SwipeHandlers) {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = 0;
    touchStartX.current = e.targetTouches[0].clientX;
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    const distance = touchStartX.current - touchEndX.current;
    
    if (Math.abs(distance) > 10) {
      setSwipeDirection(distance > 0 ? 'left' : 'right');
    }
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && handlers.onSwipeLeft) {
      handlers.onSwipeLeft();
    }
    if (isRightSwipe && handlers.onSwipeRight) {
      handlers.onSwipeRight();
    }

    setIsSwiping(false);
    setSwipeDirection(null);
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isSwiping,
    swipeDirection,
  };
}
