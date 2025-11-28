import { useQuery } from '@tanstack/react-query';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown-registry';

export function useDrillPreviewData(kind: DrillKind | null, payload: DrillPayload | null, enabled: boolean = true) {
  const registryEntry = kind ? DRILL_REGISTRY[kind] : null;
  
  return useQuery({
    queryKey: ['drill-preview', kind, payload],
    queryFn: async () => {
      if (!registryEntry?.fetchPreviewData || !payload) return null;
      return registryEntry.fetchPreviewData(payload as any);
    },
    enabled: enabled && !!registryEntry?.fetchPreviewData && !!payload,
    staleTime: 30000,
    gcTime: 300000,
  });
}
