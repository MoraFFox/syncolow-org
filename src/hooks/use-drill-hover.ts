import { useRef, useCallback, useEffect, useState } from 'react';
import { useDrillSettings } from '@/store/use-drill-settings';
import { useDrillUserData } from '@/store/use-drill-user-data';
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
import { drillAnalytics } from '@/lib/drill-analytics';

export const DATA_DRILL_HIT_PADDING = "data-drill-hit-padding";

interface ExpandedBounds {
  original: DOMRect;
  expanded: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  padding: number;
  timestamp: number;
}

const MAX_CACHE_SIZE = 100;

export function useDrillHover(isEnabled: boolean = true) {
  const { settings } = useDrillSettings();
  const { showPreview, hidePreview } = useDrillDown();
  const { onboarding } = useDrillUserData();
  const hasSeenFirstInteractionHint = onboarding.hasSeenFirstInteractionHint;

  // Hint State
  const [showHint, setShowHint] = useState(false);
  const [hintTarget, setHintTarget] = useState<HTMLElement | null>(null);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const firstHoverRef = useRef(true);

  const settingsRef = useRef(settings);

  // Refs for tracking state
  const currentHoverTargetRef = useRef<HTMLElement | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const velocityRef = useRef<number>(0);
  const lastMousePosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastVelocityCalcRef = useRef<number>(0);

  // Element bounds cache
  const elementBoundsCache = useRef<WeakMap<HTMLElement, ExpandedBounds>>(new WeakMap());
  const cacheSizeRef = useRef<number>(0);
  const cacheKeysRef = useRef<HTMLElement[]>([]);

  // Update settings ref
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  // Window resize handler to clear bounds cache
  useEffect(() => {
    const handleResize = () => {
      elementBoundsCache.current = new WeakMap();
      cacheSizeRef.current = 0;
      cacheKeysRef.current = [];
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Helper to extract drill data from an element
   */
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

  /**
   * Add element bounds to cache with LRU eviction
   */
  const addToCache = useCallback((element: HTMLElement, bounds: ExpandedBounds) => {
    const existingIndex = cacheKeysRef.current.indexOf(element);
    if (existingIndex > -1) {
      cacheKeysRef.current.splice(existingIndex, 1);
    } else {
      cacheSizeRef.current++;
    }

    // LRU elimination
    while (cacheSizeRef.current > MAX_CACHE_SIZE && cacheKeysRef.current.length > 0) {
      const oldest = cacheKeysRef.current.shift();
      if (oldest) {
        elementBoundsCache.current.delete(oldest);
        cacheSizeRef.current--;
      }
    }

    elementBoundsCache.current.set(element, bounds);
    cacheKeysRef.current.push(element);
  }, []);

  /**
   * Get expanded bounds for an element
   */
  const getExpandedBounds = useCallback((element: HTMLElement, padding: number): ExpandedBounds => {
    const cached = elementBoundsCache.current.get(element);
    if (cached && cached.padding === padding) {
      // Refresh LRU
      const index = cacheKeysRef.current.indexOf(element);
      if (index > -1) {
        cacheKeysRef.current.splice(index, 1);
        cacheKeysRef.current.push(element);
      }
      return cached;
    }

    const rect = element.getBoundingClientRect();
    const bounds: ExpandedBounds = {
      original: rect,
      expanded: {
        top: rect.top - padding,
        right: rect.right + padding,
        bottom: rect.bottom + padding,
        left: rect.left - padding,
      },
      padding,
      timestamp: Date.now(),
    };

    addToCache(element, bounds);
    return bounds;
  }, [addToCache]);

  const isPointInExpandedBounds = useCallback((
    x: number,
    y: number,
    bounds: ExpandedBounds
  ): { isInside: boolean; isInOriginal: boolean; distance: number } => {
    const { original, expanded } = bounds;

    const isInOriginal = (
      x >= original.left && x <= original.right &&
      y >= original.top && y <= original.bottom
    );

    const isInside = (
      x >= expanded.left && x <= expanded.right &&
      y >= expanded.top && y <= expanded.bottom
    );

    let distance = 0;
    if (!isInOriginal) {
      const dx = Math.max(original.left - x, 0, x - original.right);
      const dy = Math.max(original.top - y, 0, y - original.bottom);
      distance = Math.sqrt(dx * dx + dy * dy);
    }

    return { isInside, isInOriginal, distance };
  }, []);

  const calculateProximityDelay = useCallback((
    baseDelay: number,
    distance: number,
    proximityThreshold: number
  ): number => {
    if (distance <= 0) return baseDelay;
    if (distance >= proximityThreshold) return baseDelay;

    const ratio = distance / proximityThreshold;
    return baseDelay * (0.5 + 0.5 * ratio);
  }, []);

  // Mouse Move Handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isEnabled) return;
    const now = Date.now();

    // Track Velocity
    if (lastMousePosRef.current) {
      const dt = now - lastMousePosRef.current.time;
      if (dt > 10) { // Throttle velocity calc
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const velocity = (dist / dt) * 1000; // px/sec
        
        // Smooth velocity
        velocityRef.current = velocityRef.current * 0.7 + velocity * 0.3;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY, time: now };
        lastVelocityCalcRef.current = now;
      }
    } else {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY, time: now };
    }

    // Hit Testing
    const { hitAreaPadding, expandedHitArea, proximityThreshold, hoverDelay, previewsEnabled } = settingsRef.current;
    
    if (!previewsEnabled) return;

    // Find target
    const target = (e.target as HTMLElement).closest(`[${DATA_DRILL_KIND}]:not([${DATA_DRILL_DISABLED}])`) as HTMLElement | null;
    let proximityDistance = 0;

    // Enhanced Hit Area Logic
    if (!target && expandedHitArea) {
      // Fallback: If we were hovering something recently, check if we are still close?
      // For now, let's skip the expensive global proximity scan and assume standard DOM event bubbling 
    }

    if (target && expandedHitArea) {
       // We are over a target, check if we are in extended bounds vs original
       const customPadding = target.getAttribute(DATA_DRILL_HIT_PADDING);
       const padding = customPadding ? parseInt(customPadding, 10) : hitAreaPadding;
       const bounds = getExpandedBounds(target, padding);
       const res = isPointInExpandedBounds(e.clientX, e.clientY, bounds);
       proximityDistance = res.distance;
    }

    // Handle Target Change
    if (target !== currentHoverTargetRef.current) {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      currentHoverTargetRef.current = target;
      
      // Clear pending hint timer
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }

      // Hide preview if we left a target completely
      if (!target) {
        hidePreview();
        return;
      }
    }

    if (!target) return;

    // Check Drill Data
    const drillData = extractDrillData(target);
    if (!drillData) return;

    // Handle Analytics for Hit Area
    if (Math.random() > 0.9) { // Sampled analytics
         const customPadding = target.getAttribute(DATA_DRILL_HIT_PADDING);
         const hitPadding = customPadding ? parseInt(customPadding, 10) : settingsRef.current.hitAreaPadding;
         const entityId = (drillData.payload as any).id || 'unknown';
         
         const rect = target.getBoundingClientRect();
         const isOutsideOriginal =
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom;

         drillAnalytics.trackHitAreaInteraction(
            drillData.kind,
            entityId,
            isOutsideOriginal,
            proximityDistance,
            hitPadding
         );
    }

    // Dismiss hint if we are about to show preview
    if (showHint) {
       setShowHint(false);
       if (hintTimerRef.current) {
         clearTimeout(hintTimerRef.current);
         hintTimerRef.current = null;
       }
    }

    // Check for first interaction hint
    if (!hasSeenFirstInteractionHint && firstHoverRef.current) {
      if (!hintTimerRef.current) {
        hintTimerRef.current = setTimeout(() => {
           setShowHint(true);
           setHintTarget(target);
        }, 200);
      }
      firstHoverRef.current = false;
    }

    // Schedule Preview
    if (!hoverTimerRef.current) {
      const isHighVelocity = velocityRef.current > 800;
      let effectiveDelay = isHighVelocity ? hoverDelay + 300 : hoverDelay;
      
      if (expandedHitArea && proximityDistance > 0) {
        effectiveDelay = calculateProximityDelay(effectiveDelay, proximityDistance, proximityThreshold);
      }

      hoverTimerRef.current = setTimeout(() => {
        if (velocityRef.current > 800) return; // Still moving fast, skip
        
        showPreview(drillData.kind, drillData.payload, {
          x: e.clientX,
          y: e.clientY
        });
      }, effectiveDelay);
    }

  }, [isEnabled, settings, extractDrillData, getExpandedBounds, isPointInExpandedBounds, calculateProximityDelay, showPreview, hidePreview, showHint, hasSeenFirstInteractionHint]);

  // Mouse Out Handler (to clear if we leave window or container)
  const handleMouseOut = useCallback((e: MouseEvent) => {
    if (!e.relatedTarget) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      currentHoverTargetRef.current = null;
      hidePreview();
    }
  }, [hidePreview]);

  // Attach listeners
  useEffect(() => {
    if (!isEnabled) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseout', handleMouseOut);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [isEnabled, handleMouseMove, handleMouseOut]);

  return { showHint, setShowHint, hintTarget };
}
