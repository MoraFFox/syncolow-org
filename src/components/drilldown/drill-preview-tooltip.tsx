'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { useDrillPreviewData } from '@/hooks/use-drill-preview-data';
import { useToast } from '@/hooks/use-toast';
import { DrillCard } from './drill-card';
import { DrillContentRenderer } from './drill-content-renderer';
import { DrillActions } from './drill-actions';

export function DrillPreviewTooltip() {
  const { preview, pinPreview, pinnedPreviews, hidePreview } = useDrillDownStore();
  const { isOpen, kind, payload, coords } = preview;
  const [mounted, setMounted] = React.useState(false);
  const [pinProgress, setPinProgress] = React.useState(0);
  const { toast } = useToast();
  
  // Use React Query for cached async preview data
  const { data: asyncData, isLoading, error } = useDrillPreviewData(kind, payload, isOpen);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-pin after 3 seconds with progress bar
  React.useEffect(() => {
    if (!isOpen || !kind || !payload) {
      setPinProgress(0);
      return;
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 100 / 30; // 3000ms / 100ms intervals
      setPinProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        if (pinnedPreviews.length < 3) {
          setTimeout(() => {
            pinPreview(kind, payload);
            hidePreview();
            toast({ title: 'Preview pinned automatically' });
          }, 0);
        }
      }
    }, 100);

    return () => {
      clearInterval(interval);
      setPinProgress(0);
    };
  }, [isOpen, kind, payload, pinPreview, pinnedPreviews.length, hidePreview, toast]);

  if (!mounted || !isOpen || !coords || !kind) return null;
  
  // Don't show tooltip if THIS SPECIFIC item is already pinned
  const isCurrentItemPinned = pinnedPreviews.some(pinned => {
    const pinnedId = (pinned.payload as any)?.id || (pinned.payload as any)?.value;
    const currentId = (payload as any)?.id || (payload as any)?.value;
    return pinned.kind === kind && pinnedId === currentId;
  });
  
  if (isCurrentItemPinned) return null;

  // Calculate position with boundary detection
  const TOOLTIP_WIDTH = 288; // w-72
  const TOOLTIP_HEIGHT = 200;
  const PADDING = 15;

  let left = coords.x + PADDING;
  let top = coords.y + PADDING;

  if (typeof window !== 'undefined') {
    if (left + TOOLTIP_WIDTH > window.innerWidth) {
      left = coords.x - TOOLTIP_WIDTH - PADDING;
    }
    if (top + TOOLTIP_HEIGHT > window.innerHeight) {
      top = coords.y - TOOLTIP_HEIGHT - PADDING;
    }
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    top,
    zIndex: 9999,
    pointerEvents: 'none', // Pass through clicks
  };

  return createPortal(
    <div style={style} className="animate-in fade-in zoom-in-95 duration-150">
      <DrillCard title={`${kind} Insight`}>
        <DrillContentRenderer 
          kind={kind} 
          payload={payload!} 
          isLoading={isLoading} 
          error={error} 
          asyncData={asyncData} 
        />
        
        <DrillActions kind={kind} payload={payload!} />
        
        {/* Auto-pin progress bar */}
        <div className="mt-2 pt-2 border-t space-y-1">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-100 ease-linear"
              style={{ width: `${pinProgress}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            {!isLoading && asyncData && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" title="Cached data" />
            )}
            {pinProgress < 100 ? 'Pinning in 3s...' : 'Click for full details'}
          </div>
        </div>
      </DrillCard>
    </div>,
    document.body
  );
}
