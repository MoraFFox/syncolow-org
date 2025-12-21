'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { useDrillSettings } from '@/store/use-drill-settings';
import { useDrillUserData } from '@/store/use-drill-user-data';
import { useDrillPreviewData } from '@/hooks/use-drill-preview-data';
import { useToast } from '@/hooks/use-toast';
import { DrillCard } from './drill-card';
import { DrillContentRenderer } from './drill-content-renderer';
import { DrillActions } from './drill-actions';
import { Command, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipe } from '@/hooks/use-swipe';
import { useDrillDown } from '@/hooks/use-drilldown';
import { motion, AnimatePresence } from 'framer-motion';



export function DrillPreviewTooltip() {
  // 1. All Hooks Must Be Unconditional
  const { preview, hidePreview } = useDrillDownStore();
  const { pinPreview, pinnedPreviews: rawPinnedPreviews } = useDrillUserData();
  const { settings } = useDrillSettings();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { goToDetail } = useDrillDown();

  const pinnedPreviews = rawPinnedPreviews || [];
  const [mounted, setMounted] = React.useState(false);
  const [pinProgress, setPinProgress] = React.useState(0);
  const [showContent, setShowContent] = React.useState(false);

  // Safely extract values (even if preview is null)
  const { isOpen = false, kind, payload, coords } = preview || {};

  // Swipe handlers
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

  // Data Fetching (Enabled only when valid)
  // Ensure we pass meaningful values or undefined, but hook order is constant
  const { data: asyncData, isLoading, error, refetch } = useDrillPreviewData(
    kind || 'company', // Fallback to avoid type errors, enabled flag handles logic
    payload || {},
    !!(isOpen && kind && payload)
  );

  // Layout Logic
  const layoutConfig = React.useMemo(() => {
    switch (kind) {
      case 'company':
      case 'branch':
        return { width: 400, height: 160, variant: 'banner', className: 'rounded-xl' };
      case 'product':
      case 'barista':
      case 'customer':
        return { width: 240, height: 320, variant: 'poster', className: 'rounded-2xl' };
      case 'notification':
      case 'feedback':
        return { width: 220, height: 220, variant: 'diamond', className: 'rounded-[2rem]' }; // distinct shape
      default:
        return { width: 288, height: 200, variant: 'default', className: 'rounded-lg' };
    }
  }, [kind]);

  // Effects
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Minimum Loading Time Effect
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

  // Auto-pin Effect
  React.useEffect(() => {
    if (!isOpen || !kind || !payload || settings.quietMode) {
      setPinProgress(0);
      return;
    }

    const timer = setTimeout(() => {
      setPinProgress(100);
    }, 50);

    const pinTimeout = setTimeout(() => {
      if (pinnedPreviews.length < 3) {
        // Simple positioning logic duplicated safely
        const PADDING = 15;
        let w = 288;
        let h = 200;
        if (['company', 'branch'].includes(kind)) { w = 400; h = 160; }
        else if (['product', 'barista', 'customer'].includes(kind)) { w = 240; h = 320; }
        else if (['notification', 'feedback'].includes(kind)) { w = 220; h = 220; }

        let left = (coords?.x || 0) + PADDING;
        let top = (coords?.y || 0) + PADDING;

        if (typeof window !== 'undefined' && coords) {
          if (left + w > window.innerWidth) left = coords.x - w - PADDING;
          if (top + h > window.innerHeight) top = coords.y - h - PADDING;
        }

        pinPreview(kind, payload, { x: left, y: top });
        hidePreview();
        toast({ title: 'Preview pinned automatically' });
      }
    }, 3050);

    return () => {
      clearTimeout(timer);
      clearTimeout(pinTimeout);
      setPinProgress(0);
    };
  }, [isOpen, kind, payload, coords, pinPreview, pinnedPreviews.length, hidePreview, toast, settings.quietMode]);

  // 2. Logic / Early Returns AFTER Hooks
  if (!mounted) return null;
  if (!preview) return null; // Now safer
  if (!kind || !payload) return null;

  // Check pinned status
  const isCurrentItemPinned = pinnedPreviews.some(pinned => {
    // Safe access with defaults
    const pPayload = pinned.payload as Record<string, unknown> || {};
    const cPayload = payload as Record<string, unknown> || {};
    const pinnedId = pPayload.id || pPayload.value;
    const currentId = cPayload.id || cPayload.value;
    return pinned.kind === kind && pinnedId === currentId;
  });

  if (isCurrentItemPinned) return null;

  // 3. Render
  const TOOLTIP_WIDTH = layoutConfig.width;
  const TOOLTIP_HEIGHT = layoutConfig.height;
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
    pointerEvents: 'none',
  };

  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[9998]"
              onClick={hidePreview}
            />

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
      {isOpen && coords && (
        <motion.div
          style={style}
          initial={{ opacity: 0, scale: 0.9, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.9, y: 4, filter: "blur(2px)" }}
          transition={
            settings.quietMode
              ? { duration: 0.15, ease: "easeOut" }
              : { type: "spring", stiffness: 400, damping: 25, mass: 0.8 }
          }
          className={cn(
            "drill-preview-container origin-top-left",
            layoutConfig.className,
            settings.previewTheme === 'glass' && "backdrop-blur-md bg-background/80"
          )}
        >
          <DrillCard
            title={`${kind} Insight`}
            kind={kind}
            className={cn(
              "shadow-[0_8px_30px_rgb(0,0,0,0.12)] border h-full",
              layoutConfig.className,
              settings.previewTheme === 'glass' ? "bg-transparent border-white/20 dark:border-white/10" : "bg-popover",
              settings.previewTheme === 'solid' && "bg-background border-2 border-primary/20"
            )}
            headerActions={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  pinPreview(kind, payload, { x: left, y: top });
                  hidePreview();
                  toast({ title: 'Preview pinned' });
                }}
                title="Pin preview"
              >
                <Pin className="h-3.5 w-3.5" />
              </Button>
            }
          >
            {!showContent || isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="relative">
                  <div className="animate-spin h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground animate-pulse">Analyzing...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <span className="text-sm text-destructive font-medium">Unable to load data</span>
                <button
                  onClick={() => refetch()}
                  className="text-xs text-primary hover:underline pointer-events-auto font-medium"
                >
                  Try Again
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

            <div className="mt-3 pt-2 border-t border-border/50 space-y-1.5">
              <div className="h-0.5 bg-muted rounded-full overflow-hidden w-full">
                <div
                  className="h-full bg-primary ease-linear"
                  style={{
                    width: `${pinProgress}%`,
                    transitionProperty: 'width',
                    transitionDuration: pinProgress === 0 ? '0ms' : '3000ms'
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  {!isLoading && asyncData && (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  )}
                  <span>{pinProgress < 100 ? 'Hold to pin' : 'Pinned'}</span>
                </div>
                <div className="flex items-center gap-1 opacity-75">
                  <Command className="h-2 w-2" />
                  <span>Click to open</span>
                </div>
              </div>
            </div>
          </DrillCard>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
