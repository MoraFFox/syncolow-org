import React from 'react';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown/registry';
import { useIsMobile } from '@/hooks/use-mobile';

import { useDrillSettings } from '@/store/use-drill-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DrillContentRendererProps {
  kind: DrillKind;
  payload: DrillPayload;
  isLoading?: boolean;
  error?: any;
  asyncData?: any;
  isPeekMode?: boolean;
}

export function DrillContentRenderer({
  kind,
  payload,
  isLoading,
  error,
  asyncData,
  isPeekMode = false
}: DrillContentRendererProps) {
  const isMobile = useIsMobile();
  const { settings } = useDrillSettings();
  const registryEntry = DRILL_REGISTRY[kind];

  // Derive sizing flags from settings
  const isCompact = settings.previewSize === 'compact';
  const isExpanded = settings.previewSize === 'expanded';

  if (!registryEntry) {
    return <div className="text-sm text-muted-foreground">No preview available</div>;
  }

  // Handle async preview states
  if (registryEntry.fetchPreviewData) {
    // Show loading state
    if (isLoading && registryEntry.renderLoadingPreview) {
      return registryEntry.renderLoadingPreview({ isMobile, isCompact, isExpanded });
    }

    // Show error state
    if (error) {
      return (
        <div className="text-sm text-destructive p-4 text-center">
          Failed to load preview data
        </div>
      );
    }
  }

  // Determine main content with sizing options
  const renderOptions = { isMobile, isCompact, isExpanded };
  let mainContent: React.ReactNode = null;
  if (asyncData && registryEntry.renderAsyncPreview) {
    mainContent = registryEntry.renderAsyncPreview(payload as any, asyncData, renderOptions);
  } else {
    mainContent = registryEntry.renderPreview(payload as any, renderOptions);
  }

  // If in Peek Mode or if we have rich data (like history or explicit tabs request), use Tabs
  // Skip tabs in compact mode for brevity
  const showTabs = !isCompact && (isPeekMode || (asyncData && (asyncData.history || asyncData.recentEvents)));

  if (showTabs) {
    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-3 focus-visible:ring-0">
          {mainContent}
        </TabsContent>

        <TabsContent value="details" className="mt-0 focus-visible:ring-0">
          <ScrollArea className={cn("w-full rounded-md border p-4 bg-background/50", isExpanded ? "h-[300px]" : "h-[200px]")}>
            {asyncData?.recentEvents ? (
              <div className="space-y-4">
                {asyncData.recentEvents.map((event: any, i: number) => (
                  <div key={i} className="text-sm border-b pb-2 last:border-0 border-border/50">
                    <div className="font-medium">{event.title || 'Event'}</div>
                    <div className="text-muted-foreground text-xs">{event.date}</div>
                    {event.description && <div className="text-xs mt-1 opacity-80">{event.description}</div>}
                  </div>
                ))}
              </div>
            ) : asyncData?.history ? (
              <div className="space-y-2">
                {asyncData.history.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm border-b pb-1 last:border-0 border-border/50">
                    <span>{item.date}</span>
                    <span className="font-mono">{item.amount || item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                No additional details available.
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="actions" className="mt-0 focus-visible:ring-0">
          <div className="p-4 border rounded-md bg-muted/20 text-center text-sm text-muted-foreground">
            <p>Quick actions available below.</p>
          </div>
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <div className={cn(
      "space-y-3",
      isMobile ? "pb-2" : "",
      isCompact ? "space-y-1" : "",
      isExpanded ? "space-y-4" : ""
    )}>
      {mainContent}
    </div>
  );
}
