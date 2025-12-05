import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown/registry';
import { useDebounce } from 'use-debounce';
import { drillAnalytics } from '@/lib/drill-analytics';

const getStaleTime = (kind: DrillKind | null) => {
  switch (kind) {
    case 'revenue':
    case 'order':
    case 'payment':
      return 5 * 60 * 1000; // 5 minutes (historical/stable)
    case 'notification':
      return 0; // Always fetch fresh
    case 'maintenance':
    case 'feedback':
      return 30 * 1000; // 30 seconds
    default:
      return 60 * 1000; // 1 minute default
  }
};

export function useDrillPreviewData(kind: DrillKind | null, payload: DrillPayload | null, enabled: boolean = true) {
  const registryEntry = kind ? DRILL_REGISTRY[kind] : null;
  const [debouncedEnabled] = useDebounce(enabled, 300);
  const lastTrackedRef = useRef<string | null>(null);
  
  const query = useQuery({
    queryKey: ['drill-preview', kind, payload],
    queryFn: async () => {
      if (!registryEntry?.fetchPreviewData || !payload) return null;
      
      const startTime = performance.now();
      const entityId = (payload as { id?: string; value?: string }).id || (payload as { id?: string; value?: string }).value || 'unknown';
      
      try {
        const data = await registryEntry.fetchPreviewData(payload as any);
        const duration = performance.now() - startTime;
        
        // Track cache miss (queryFn only runs on miss)
        drillAnalytics.trackPreviewLoad(kind!, String(entityId), duration, false);
        
        return data;
      } catch (error) {
        const duration = performance.now() - startTime;
        drillAnalytics.trackPreviewLoad(
          kind!, 
          String(entityId), 
          duration, 
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    },
    enabled: debouncedEnabled && !!registryEntry?.fetchPreviewData && !!payload,
    staleTime: getStaleTime(kind),
    gcTime: 300000,
  });
  
  // Track cache hits when data is served without fetching
  useEffect(() => {
    if (!kind || !payload || !query.data) return;
    
    const entityId = (payload as { id?: string; value?: string }).id || (payload as { id?: string; value?: string }).value || 'unknown';
    const trackKey = `${kind}-${entityId}`;
    
    // Cache hit: data exists, not fetching, not loading, and we haven't tracked this yet
    if (query.data && !query.isFetching && !query.isLoading && query.status === 'success' && lastTrackedRef.current !== trackKey) {
      drillAnalytics.trackPreviewLoad(kind, String(entityId), 0, true);
      lastTrackedRef.current = trackKey;
    }
  }, [kind, payload, query.data, query.isFetching, query.isLoading, query.status]);
  
  return query;
}
