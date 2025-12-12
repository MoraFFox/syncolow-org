'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { useDrillPreviewData } from '@/hooks/use-drill-preview-data';
import { useToast } from '@/hooks/use-toast';
import { DrillCard } from './drill-card';
import { DrillContentRenderer } from './drill-content-renderer';
import { DrillActions } from './drill-actions';
import { Command } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipe } from '@/hooks/use-swipe';
import { useDrillDown } from '@/hooks/use-drilldown';
import { motion, AnimatePresence } from 'framer-motion';

export function DrillPreviewTooltip() {
  const { preview, pinPreview, pinnedPreviews, hidePreview } = useDrillDownStore();
  const { isOpen, kind, payload, coords } = preview;
  const [mounted, setMounted] = React.useState(false);
  const [pinProgress, setPinProgress] = React.useState(0);
  const [showContent, setShowContent] = React.useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { goToDetail } = useDrillDown();

  // Swipe handlers for mobile
  const swipeHandlers = useSwipe({
    onSwipeDown: () => {
      if (isMobile) hidePreview();
    },
    onSwipeUp: () => {
      if (isMobile && kind && payload) {
        goToDetail(kind, payload);
        hidePreview();
      }
    }
  });

  // Use React Query for cached async preview data
  const { data: asyncData, isLoading, error, refetch } = useDrillPreviewData(kind, payload, isOpen);

  // Minimum loading duration (200ms) before showing content
  React.useEffect(() => {
    if (!isOpen) {
      setShowContent(false);
      return;
    }

    const minLoadTime = 200;
    const startTime = Date.now();

    if (!isLoading) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadTime - elapsed);

      const timer = setTimeout(() => {
        setShowContent(true);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoading]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-pin after 3 seconds with CSS transition (respects quietMode)
  const { settings } = useDrillDownStore();

  React.useEffect(() => {
    // Skip auto-pin in quiet mode
    if (!isOpen || !kind || !payload || settings.quietMode) {
      setPinProgress(0);
      return;
    }

    // Trigger animation to start transition
    const timer = setTimeout(() => {
      setPinProgress(100);
    }, 50);

    const pinTimeout = setTimeout(() => {
      if (pinnedPreviews.length < 3) {
        pinPreview(kind, payload);
        hidePreview();
        toast({ title: 'Preview pinned automatically' });
      }
    }, 3050); // Slightly longer than transition to ensure it completes visually

    return () => {
      clearTimeout(timer);
      clearTimeout(pinTimeout);
      setPinProgress(0);
    };
  }, [isOpen, kind, payload, pinPreview, pinnedPreviews.length, hidePreview, toast, settings.quietMode]);

  if (!mounted) return null;

  // Don't show tooltip if THIS SPECIFIC item is already pinned
  const isCurrentItemPinned = pinnedPreviews.some(pinned => {
    const pinnedId = (pinned.payload as Record<string, unknown>)?.id || (pinned.payload as Record<string, unknown>)?.value;
    const currentId = (payload as Record<string, unknown>)?.id || (payload as Record<string, unknown>)?.value;
    return pinned.kind === kind && pinnedId === currentId;
  });

  if (isCurrentItemPinned) return null;

  // Calculate position with boundary detection
  const TOOLTIP_WIDTH = 288; // w-72
  const TOOLTIP_HEIGHT = 200;
  const PADDING = 15;

  let left = (coords?.x || 0) + PADDING;
  let top = (coords?.y || 0) + PADDING;

  if (typeof window !== 'undefined' && coords) {
    if (left + TOOLTIP_WIDTH > window.innerWidth) {
      left = coords.x - TOOLTIP_WIDTH - PADDING;
    }
    if (top + TOOLTIP_HEIGHT > window.innerHeight) {
      top = coords.y - TOOLTIP_HEIGHT - PADDING;
    }
  }

  const style: React.CSSProperties = isMobile ? {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'auto',
  } : {
    position: 'fixed',
    left,
    top,
    zIndex: 9999,
    pointerEvents: 'none', // Pass through clicks on desktop
  };

  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {isOpen && kind && payload && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[9998]"
              onClick={hidePreview}
            />

            {/* Bottom Sheet */}
            <motion.div
              style={style}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-popover rounded-t-xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] overflow-hidden"
              onTouchStart={swipeHandlers.onTouchStart}
              onTouchMove={swipeHandlers.onTouchMove}
              onTouchEnd={swipeHandlers.onTouchEnd}
            >
              {/* Swipe Indicator */}
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
              </div>

              <DrillCard
                title={`${kind} Insight`}
                kind={kind}
                className="border-0 shadow-none w-full max-h-[70vh] overflow-y-auto"
                isMobile={true}
              >
                <DrillContentRenderer
                  kind={kind}
                  payload={payload}
                  isLoading={isLoading}
                  error={error}
                  asyncData={asyncData}
                />

                <DrillActions kind={kind} payload={payload} />

                {/* Mobile Hint */}
                <div className="text-[10px] text-muted-foreground text-center mt-4 pb-4">
                  Swipe up for details • Swipe down to dismiss
                </div>
              </DrillCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && kind && payload && coords && (
        <motion.div
          style={style}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="drill-preview-container"
        >
          <DrillCard title={`${kind} Insight`} kind={kind} className="shadow-2xl border-2">
            {!showContent || isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-xs text-muted-foreground">Loading preview...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <span className="text-sm text-destructive">Failed to load preview</span>
                <button
                  onClick={() => refetch()}
                  className="text-xs text-primary hover:underline pointer-events-auto"
                >
                  Retry
                </button>
              </div>
            ) : (
              <DrillContentRenderer
                kind={kind}
                payload={payload}
                isLoading={false}
                error={null}
                asyncData={asyncData}
              />
            )}

            <DrillActions kind={kind} payload={payload} />

            {/* Auto-pin progress bar */}
            <div className="mt-2 pt-2 border-t space-y-1">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary ease-linear"
                  style={{
                    width: `${pinProgress}%`,
                    transitionProperty: 'width',
                    transitionDuration: pinProgress === 0 ? '0ms' : '3000ms'
                  }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                {!isLoading && asyncData && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" title="Cached data" />
                )}
                {pinProgress < 100 ? 'Pinning in 3s...' : 'Click for full details'}
              </div>
              <div className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1.5 mt-1">
                <Command className="h-2.5 w-2.5" />
                <span>+Click to open in new tab</span>
              </div>
            </div>
          </DrillCard>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
