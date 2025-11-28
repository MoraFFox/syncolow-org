import * as React from 'react';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown-registry';

interface DrillContentRendererProps {
  kind: DrillKind;
  payload: DrillPayload;
  isLoading?: boolean;
  error?: any;
  asyncData?: any;
}

export function DrillContentRenderer({ 
  kind, 
  payload, 
  isLoading, 
  error, 
  asyncData 
}: DrillContentRendererProps) {
  const registryEntry = DRILL_REGISTRY[kind];
  
  if (!registryEntry) {
    return <div className="text-sm text-muted-foreground">No preview available</div>;
  }
  
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
}
