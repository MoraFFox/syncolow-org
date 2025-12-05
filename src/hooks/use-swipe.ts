import { useRef, useState } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipe(handlers: SwipeHandlers) {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = 0;
    touchEndY.current = 0;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
    
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (Math.abs(distanceX) > 10) {
        setSwipeDirection(distanceX > 0 ? 'left' : 'right');
      }
    } else {
      if (Math.abs(distanceY) > 10) {
        setSwipeDirection(distanceY > 0 ? 'up' : 'down');
      }
    }
  };

  const onTouchEnd = () => {
    if (touchStartX.current === 0 && touchStartY.current === 0) return;
    
    const distanceX = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;


    if (isRightSwipe && handlers.onSwipeRight) {
      handlers.onSwipeRight();
    }

    const distanceY = touchStartY.current - touchEndY.current;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe
      if (isLeftSwipe && handlers.onSwipeLeft) handlers.onSwipeLeft();
      if (isRightSwipe && handlers.onSwipeRight) handlers.onSwipeRight();
    } else {
      // Vertical swipe
      if (isUpSwipe && handlers.onSwipeUp) handlers.onSwipeUp();
      if (isDownSwipe && handlers.onSwipeDown) handlers.onSwipeDown();
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
