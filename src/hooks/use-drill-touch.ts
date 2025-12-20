import { useRef, useCallback, useEffect } from 'react';
import { useDrillDown } from '@/hooks/use-drilldown';
import { 
  DrillKind, 
  DrillPayload, 
  DATA_DRILL_KIND, 
  DATA_DRILL_PAYLOAD, 
  DATA_DRILL_DISABLED,
  DATA_DRILL_MODE
} from '@/lib/drilldown-types';
import { validateDrillPayload } from '@/lib/drilldown/validation';
import { isMobile } from 'react-device-detect';

export function useDrillTouch(isEnabled: boolean = true) {
  const { showPreview } = useDrillDown();
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Helper to extract drill data
  const extractDrillData = useCallback((element: HTMLElement): { kind: DrillKind, payload: DrillPayload, mode?: string } | null => {
    const kind = element.getAttribute(DATA_DRILL_KIND) as DrillKind;
    const payloadStr = element.getAttribute(DATA_DRILL_PAYLOAD);
    const disabled = element.hasAttribute(DATA_DRILL_DISABLED);
    
    if (!kind || !payloadStr || disabled) return null;

    try {
      const payload = JSON.parse(payloadStr);
      if (!validateDrillPayload(kind, payload)) return null;
      
      const mode = element.getAttribute(DATA_DRILL_MODE) || 'page';
      return { kind, payload, mode };
    } catch (e) {
      console.error('Invalid drill payload', e);
      return null;
    }
  }, []);

  const findDrillTarget = useCallback((element: HTMLElement): HTMLElement | null => {
      return element.closest(`[${DATA_DRILL_KIND}]:not([${DATA_DRILL_DISABLED}])`) as HTMLElement | null;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // Don't interfere with preview interactions on mobile
      if (
        isMobile &&
        (e.target as HTMLElement).closest(".drill-preview-mobile-enter")
      ) {
        return;
      }

      const target = findDrillTarget(e.target as HTMLElement);
      if (!target) return;

      const drillData = extractDrillData(target);
      if (!drillData) return;

      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      // Start 500ms timer for long press
      touchTimerRef.current = setTimeout(() => {
        showPreview(drillData.kind, drillData.payload, {
          x: touch.clientX,
          y: touch.clientY,
        });
      }, 500);
    },
    [findDrillTarget, extractDrillData, showPreview]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartPosRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // If user moved more than 10px, cancel the long-press
    if (deltaX > 10 || deltaY > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
      touchStartPosRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isEnabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {};
}
