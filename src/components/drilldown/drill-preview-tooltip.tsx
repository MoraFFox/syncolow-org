'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DRILL_REGISTRY } from '@/lib/drilldown-registry';

export function DrillPreviewTooltip() {
  const { preview } = useDrillDownStore();
  const { isOpen, kind, payload, coords } = preview;
  const [mounted, setMounted] = React.useState(false);
  
  // Async preview state
  const [asyncData, setAsyncData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch async data when preview opens
  React.useEffect(() => {
    if (!isOpen || !kind) {
      setAsyncData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const registryEntry = DRILL_REGISTRY[kind];
    if (registryEntry?.fetchPreviewData) {
      setIsLoading(true);
      setError(null);
      
      registryEntry.fetchPreviewData(payload as any)
        .then((data) => {
          setAsyncData(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch preview data:', err);
          setError(err);
          setIsLoading(false);
        });
    }
  }, [isOpen, kind, payload]);

  if (!mounted || !isOpen || !coords || !kind) return null;

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

  const renderContent = () => {
    const registryEntry = DRILL_REGISTRY[kind];
    if (!registryEntry) return <div className="text-sm text-muted-foreground">Click for details</div>;
    
    // Handle async preview states
    if (registryEntry.fetchPreviewData) {
      // Show loading state
      if (isLoading && registryEntry.renderLoadingPreview) {
        return registryEntry.renderLoadingPreview();
      }
      
      // Show error state
      if (error) {
        return (
          <div className="text-sm text-destructive">
            Failed to load preview
          </div>
        );
      }
      
      // Show async data if loaded
      if (asyncData && registryEntry.renderAsyncPreview) {
        return registryEntry.renderAsyncPreview(payload as any, asyncData);
      }
    }
    
    // Fall back to synchronous preview
    return registryEntry.renderPreview(payload as any);
  };

  return createPortal(
    <div style={style} className="animate-in fade-in zoom-in-95 duration-150">
      <Card className="w-72 shadow-xl border-primary/20 bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {kind} Insight
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {renderContent()}
          <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground text-center">
            Click for full details
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
