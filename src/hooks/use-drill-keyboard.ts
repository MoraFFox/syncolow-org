import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { useDrillDown } from '@/hooks/use-drilldown';
import { DrillKind, DrillPayload, DATA_DRILL_KIND, DATA_DRILL_PAYLOAD, DATA_DRILL_DISABLED } from '@/lib/drilldown-types';
import { validateDrillPayload } from '@/lib/drilldown/validation';

/**
 * Hook to handle keyboard navigation for drilldown elements.
 * Optimized to cache drillable elements and avoid repeated DOM queries.
 */
export function useDrillKeyboard(isEnabled: boolean = true) {
  const router = useRouter();
  const { goToDetail, showPreview, hidePreview } = useDrillDown();
  const {
    goBack: historyBack,
    goForward: historyForward,
    openPeek
  } = useDrillDownStore();

  // Cache drillable elements to avoid querying DOM on every keypress
  const cachedElementsRef = useRef<HTMLElement[] | null>(null);
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Helper to get all drillable elements in the DOM
   * Caches the result for a short period to optimize rapid navigation
   */
  const getDrillableElements = useCallback(() => {
    if (cachedElementsRef.current) {
      // Re-verify that cached elements are still in the DOM and visible
      const validElements = cachedElementsRef.current.filter(el => document.body.contains(el));
      if (validElements.length === cachedElementsRef.current.length) {
        return validElements;
      }
    }

    // Query DOM if cache is empty or invalid
    const selector = `[${DATA_DRILL_KIND}]:not([${DATA_DRILL_DISABLED}])`;
    const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    
    // Sort elements by visual position (top-left to bottom-right)
    // This ensures natural navigation order regardless of DOM order
    elements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      
      // Tolerance for "same row" detection
      const ROW_TOLERANCE = 10;
      
      if (Math.abs(rectA.top - rectB.top) > ROW_TOLERANCE) {
        return rectA.top - rectB.top;
      }
      return rectA.left - rectB.left;
    });

    cachedElementsRef.current = elements;
    
    // Clear cache after inactivity to ensure we pick up new elements eventualy
    if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    cacheTimeoutRef.current = setTimeout(() => {
      cachedElementsRef.current = null;
    }, 2000); // 2 second cache duration

    return elements;
  }, []);

  // Clear cache on route change or when manually requested
  const clearCache = useCallback(() => {
    cachedElementsRef.current = null;
    if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (!isEnabled) return;

      const currentTarget = document.activeElement as HTMLElement;
      const isDrillTarget = currentTarget.hasAttribute(DATA_DRILL_KIND);

      switch (e.key) {
        case "Enter": {
          if (isDrillTarget) {
            e.preventDefault();
            const kind = currentTarget.getAttribute(DATA_DRILL_KIND) as DrillKind;
            const payloadStr = currentTarget.getAttribute(DATA_DRILL_PAYLOAD);
            
            if (kind && payloadStr) {
              try {
                const payload = JSON.parse(payloadStr) as DrillPayload;
                if (validateDrillPayload(kind, payload)) {
                  if (e.ctrlKey || e.metaKey) {
                    openPeek(kind, payload);
                  } else {
                    goToDetail(kind, payload);
                  }
                }
              } catch (err) {
                console.error("Failed to parse drill payload on Enter", err);
              }
            }
          }
          break;
        }

        // History Navigation (Alt+Left/Right)
        case "ArrowLeft": {
          if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            historyBack();
            return;
          }
           // Navigation (Navigation Mode)
           // Only navigate if we are on a drill target OR user holds Alt (to jump in)
           if (!isDrillTarget && !e.altKey) return;

          e.preventDefault();
          const elements = getDrillableElements();
          if (elements.length === 0) return;

          const currentIndex = elements.indexOf(currentTarget);
          // Handle wrapping correctly for negative index
          const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
          
          elements[prevIndex].focus();
          elements[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          break;
        }

        case "ArrowRight": {
          if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            historyForward();
            return;
          }
          
           if (!isDrillTarget && !e.altKey) return;

          e.preventDefault();
          const elements = getDrillableElements();
          if (elements.length === 0) return;

          const currentIndex = elements.indexOf(currentTarget);
          const nextIndex = (currentIndex + 1) % elements.length;
          
          elements[nextIndex].focus();
          elements[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          break;
        }

        case "ArrowUp": {
           if (!isDrillTarget && !e.altKey) return;
          
          e.preventDefault();
          const elements = getDrillableElements();
          if (elements.length === 0) return;

          const currentIndex = elements.indexOf(currentTarget);
          const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
          
          elements[prevIndex].focus();
          elements[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    };
  }, [isEnabled, goToDetail, openPeek, historyBack, historyForward, getDrillableElements]);

  return { clearCache };
}
