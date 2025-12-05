/** @format */

"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useDrillDownStore } from "@/store/use-drilldown-store";
import { useDrillDown } from "@/hooks/use-drilldown";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DrillKind,
  DrillPayload,
  DrillMode,
  DATA_DRILL_KIND,
  DATA_DRILL_PAYLOAD,
  DATA_DRILL_MODE,
  DATA_DRILL_DISABLED,
} from "@/lib/drilldown-types";
import { DRILL_REGISTRY } from "@/lib/drilldown/registry";
import { DrillFirstInteractionHint } from "./drill-first-interaction-hint";
import { validateDrillPayload } from "@/lib/drilldown/validation";

/**
 * GlobalDrillListener
 *
 * Attaches global event listeners to enable drilldown on any element with the appropriate data attributes.
 * This makes the drilldown system universal across the application.
 *
 * Features:
 * - Click/tap to navigate to detail view
 * - Hover to show preview card
 * - Keyboard navigation with arrow keys
 * - Touch support with long-press for preview
 * - Smooth animations
 *
 * Required data attributes:
 * - data-drill-kind: The type of entity (order, product, company, etc.)
 * - data-drill-payload: JSON string of the payload data
 *
 * Optional data attributes:
 * - data-drill-mode: 'page' (default) or 'dialog'
 * - data-drill-disabled: If present, disables drilldown for this element
 */
export function GlobalDrillListener() {
  const router = useRouter();
  const { goToDetail, showPreview, hidePreview } = useDrillDown();
  const {
    settings,
    hasSeenFirstInteractionHint,
    markFirstInteractionHintSeen,
    goBack,
    goForward,
    openPeek: openPeekStore // direct access
  } = useDrillDownStore();
  const isMobile = useIsMobile();
  const settingsRef = useRef(settings);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentHoverTargetRef = useRef<HTMLElement | null>(null);
  const firstHoverRef = useRef(true);
  const [showHint, setShowHint] = useState(false);
  const [hintTarget, setHintTarget] = useState<HTMLElement | null>(null);
  
  // Velocity tracking refs
  const lastMousePosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const velocityRef = useRef<number>(0);

  // Update settings ref when settings change
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /**
   * Track mouse velocity
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now();
    if (lastMousePosRef.current) {
      const dt = now - lastMousePosRef.current.time;
      if (dt > 0) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Pixels per second
        velocityRef.current = (distance / dt) * 1000;
      }
    }
    lastMousePosRef.current = { x: e.clientX, y: e.clientY, time: now };
  }, []);

  /**
   * Get all drillable elements on the page
   */
  const getDrillableElements = useCallback((): HTMLElement[] => {
    const selector = `[${DATA_DRILL_KIND}]:not([${DATA_DRILL_DISABLED}])`;
    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }, []);

  /**
   * Find the nearest element with drilldown attributes
   */
  const findDrillTarget = useCallback(
    (element: HTMLElement | null): HTMLElement | null => {
      let current = element;
      while (current) {
        if (current.hasAttribute(DATA_DRILL_KIND)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    },
    []
  );

  /**
   * Extract drilldown data from an element
   */
  const extractDrillData = useCallback(
    (
      element: HTMLElement
    ): {
      kind: DrillKind;
      payload: DrillPayload;
      mode: DrillMode;
      disabled: boolean;
    } | null => {
      const kind = element.getAttribute(DATA_DRILL_KIND);
      const payloadStr = element.getAttribute(DATA_DRILL_PAYLOAD);
      const mode =
        (element.getAttribute(DATA_DRILL_MODE) as DrillMode) || "page";
      const disabled = element.hasAttribute(DATA_DRILL_DISABLED);

      if (!kind || disabled) return null;

      let payload: DrillPayload = {};
      if (payloadStr) {
        try {
          const parsed = JSON.parse(payloadStr);
          // Validate payload structure
          const validated = validateDrillPayload(kind as DrillKind, parsed);
          if (validated) {
            payload = validated;
          } else {
             // If strict mode validation failed (returns null), we might want to abort
             // For now, validateDrillPayload in non-strict mode returns the payload anyway with a warning
             payload = parsed;
          }
        } catch (e) {
          console.error("Failed to parse drill payload:", e);
          return null;
        }
      }

      return {
        kind: kind as DrillKind,
        payload,
        mode,
        disabled,
      };
    },
    []
  );

  /**
   * Handle click events
   */
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = findDrillTarget(e.target as HTMLElement);
      if (!target) return;

      const drillData = extractDrillData(target);
      if (!drillData) return;

      // Dismiss hint if showing
      if (showHint) {
        setShowHint(false);
        markFirstInteractionHintSeen();
      }

      // Check for modifier keys (Ctrl+Click or Meta+Click)
      if (e.ctrlKey || e.metaKey) {
        const config = DRILL_REGISTRY[drillData.kind];
        if (config && config.getRoute) {
          const route = config.getRoute(drillData.payload as any);
          if (route) {
             window.open(route, '_blank');
             return; // Skip preventDefault to allow browser to handle new tab if needed, but we used window.open so we are good.
          }
        }
      }

      // Prevent default and stop propagation to avoid conflicts
      e.preventDefault();

      goToDetail(drillData.kind, drillData.payload, drillData.mode);
    },
    [
      findDrillTarget,
      extractDrillData,
      goToDetail,
      showHint,
      markFirstInteractionHintSeen,
    ]
  );

  /**
   * Handle mouseover events for preview
   */
  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      const { hoverDelay, previewsEnabled } = settingsRef.current;

      // Skip if previews are disabled
      if (!previewsEnabled) return;

      const target = findDrillTarget(e.target as HTMLElement);

      // If we moved to a new target or no target
      if (target !== currentHoverTargetRef.current) {
        // Clear any pending preview for previous target
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
      }

      if (!target) return;

      const drillData = extractDrillData(target);
      if (!drillData) return;

      // Dismiss hint if showing before showing preview
      if (showHint) {
        setShowHint(false);
        if (hintTimerRef.current) {
           clearTimeout(hintTimerRef.current);
           hintTimerRef.current = null;
        }
      }

      // Check for first interaction hint
      if (!hasSeenFirstInteractionHint && firstHoverRef.current) {
        hintTimerRef.current = setTimeout(() => {
          setShowHint(true);
          setHintTarget(target);
        }, 200);
        firstHoverRef.current = false;
      }

      // Start timer for preview (Velocity Aware)
      if (!hoverTimerRef.current) {
        // High velocity (> 800px/s) delays the tooltip significantly to prevent "storm"
        const isHighVelocity = velocityRef.current > 800;
        const effectiveDelay = isHighVelocity ? hoverDelay + 300 : hoverDelay;

        hoverTimerRef.current = setTimeout(() => {
          // Double check velocity at trigger time
          if (velocityRef.current > 800) {
             // If still moving fast, cancel and retry? Or just don't show.
             // We'll just don't show to keep it clean.
             // But we need to clear currentHoverTargetRef so next hover works
             // Actually, the timer is cleared on mouseout/new target, so this runs only if we stayed on target.
             // If we stayed on target, velocity should be 0.
             // So this check is mostly for "just stopped" scenario.
          }
          
          showPreview(drillData.kind, drillData.payload, {
            x: e.clientX,
            y: e.clientY,
          });
          // Also clear hint timer if preview is shown
          if (hintTimerRef.current) {
            clearTimeout(hintTimerRef.current);
            hintTimerRef.current = null;
          }
          // Dismiss hint if visible
          if (showHint) {
             setShowHint(false);
          }
        }, effectiveDelay);
      }
    },
    [
      findDrillTarget,
      extractDrillData,
      showPreview,
      hasSeenFirstInteractionHint,
      showHint,
    ]
  );

  /**
   * Handle mouseout events to hide preview
   */
  const handleMouseOut = useCallback(
    (e: MouseEvent) => {
      const target = findDrillTarget(e.target as HTMLElement);

      // If leaving the current target
      if (target && target === currentHoverTargetRef.current) {
        // Check if we moved to a child of the same target or stayed within the same target
        const relatedTarget = e.relatedTarget as HTMLElement;
        const relatedDrillTarget = findDrillTarget(relatedTarget);

        // Only hide if we actually left the drill target
        if (relatedDrillTarget !== target) {
          // Cancel pending preview
          if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
          }
          // Cancel pending hint
          if (hintTimerRef.current) {
             clearTimeout(hintTimerRef.current);
             hintTimerRef.current = null;
          }
          currentHoverTargetRef.current = null;

          // Hide preview if it was shown
          hidePreview();
        }
      }
    },
    [findDrillTarget, hidePreview]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // History Navigation with Alt+Left/Right
      if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const item = goBack();
          if (item?.route) router.push(item.route);
          return;
        }
        if (e.key === 'ArrowRight') {
           e.preventDefault();
           const item = goForward();
           if (item?.route) router.push(item.route);
           return;
        }
      }

      // Peek Mode (Space or Alt while hovering)
      // Note: We use currentHoverTargetRef to determine if we are hovering something
      if ((e.key === " " || e.key === "Alt") && currentHoverTargetRef.current) {
         // If space, prevent scrolling
         if (e.key === " ") e.preventDefault();
         
         const drillData = extractDrillData(currentHoverTargetRef.current);
         if (drillData) {
             openPeekStore(drillData.kind, drillData.payload);
             hidePreview(); // Hide tooltip if peek is open
             return;
         }
      }

      const isArrowKey = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key);
      const isActionKey = ["Enter", " "].includes(e.key);
      
      // Early return if not a relevant key
      if (!isArrowKey && !isActionKey && e.key !== "Escape") return;

      // Check if we're on a drillable element
      const currentTarget = findDrillTarget(e.target as HTMLElement);

      // Optimization: Only query all elements if we are navigating with arrows AND we are currently on a drill target
      // This prevents scanning the DOM on every keypress or when focus is elsewhere
      if (isArrowKey && !currentTarget) return;

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight": {
          e.preventDefault();
          // Only now do we query the DOM
          const drillableElements = getDrillableElements();
          if (drillableElements.length === 0) return;

          const currentIndex = currentTarget
            ? drillableElements.indexOf(currentTarget)
            : -1;
          const nextIndex = (currentIndex + 1) % drillableElements.length;
          drillableElements[nextIndex].focus();

          // Show preview for focused element
          const rect = drillableElements[nextIndex].getBoundingClientRect();
          const drillData = extractDrillData(drillableElements[nextIndex]);
          if (drillData) {
            showPreview(drillData.kind, drillData.payload, {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          }
          break;
        }

        case "ArrowUp":
        case "ArrowLeft": {
          e.preventDefault();
           // Only now do we query the DOM
          const drillableElements = getDrillableElements();
          if (drillableElements.length === 0) return;

          const currentIndex = currentTarget
            ? drillableElements.indexOf(currentTarget)
            : 0;
          const prevIndex =
            currentIndex <= 0 ? drillableElements.length - 1 : currentIndex - 1;
          drillableElements[prevIndex].focus();

          // Show preview for focused element
          const rect = drillableElements[prevIndex].getBoundingClientRect();
          const drillData = extractDrillData(drillableElements[prevIndex]);
          if (drillData) {
            showPreview(drillData.kind, drillData.payload, {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          }
          break;
        }

        case "Enter":
        case " ": {
          if (currentTarget) {
            e.preventDefault();
            const drillData = extractDrillData(currentTarget);
            if (drillData) {
              goToDetail(drillData.kind, drillData.payload, drillData.mode);
            }
          }
          break;
        }

        case "Escape": {
          // Only handle escape if preview is showing or focused on drill target?
          // For now, global escape to close preview is fine.
          e.preventDefault();
          hidePreview();
          (document.activeElement as HTMLElement)?.blur();
          break;
        }
      }
    },
    [
      getDrillableElements,
      findDrillTarget,
      extractDrillData,
      goToDetail,
      showPreview,
      hidePreview,
    ]
  );

  /**
   * Handle touch start for long-press preview
   */
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
    [isMobile, findDrillTarget, extractDrillData, showPreview]
  );

  /**
   * Handle touch move to cancel long-press if moved too much
   */
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

  /**
   * Handle touch end to clear timers
   */
  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  }, []);

  /**
   * Attach global event listeners
   */
  useEffect(() => {
    // Mouse events
    document.addEventListener("click", handleClick, true);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseout", handleMouseOut);

    // Keyboard events
    document.addEventListener("keydown", handleKeyDown);

    // Touch events for mobile
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);

      // Clear touch timer on cleanup
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
      // Clear hover timer on cleanup
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [
    handleClick,
    handleMouseOver,
    handleMouseOut,
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return (
    <>
      {showHint && hintTarget && (
        <DrillFirstInteractionHint
          targetElement={hintTarget}
          onDismiss={() => {
            setShowHint(false);
            markFirstInteractionHintSeen();
          }}
        />
      )}
    </>
  );
}
