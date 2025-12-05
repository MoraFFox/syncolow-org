import { useRouter } from 'next/navigation';
import { useDrillDownStore, DrillHistoryItem } from '@/store/use-drilldown-store';
import { DrillKind, DrillPayload, DrillMode } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown/registry';
import { drillSchemas } from '@/lib/drilldown/schemas';
import { drillAnalytics } from '@/lib/drill-analytics';

export function useDrillDown() {
  const router = useRouter();
  const { 
    openDialog, 
    showPreview: showPreviewAction,
    hidePreview: hidePreviewAction,
    pushHistory,
    kind, 
    payload, 
    isOpen,
    preview
  } = useDrillDownStore();

  const showPreview = (kind: DrillKind, payload: DrillPayload, coords?: { x: number; y: number }) => {
    showPreviewAction(kind, payload, coords);
    drillAnalytics.track(kind, payload, 'preview');
  };

  const hidePreview = () => {
    hidePreviewAction();
  };

  const goToDetail = (kind: DrillKind, payload: DrillPayload = {}, mode: DrillMode = 'page') => {
    // Validate payload
    try {
      // @ts-ignore - Indexing with string on explicit keys
      if (drillSchemas[kind]) {
        // @ts-ignore
        drillSchemas[kind].parse(payload);
      }
    } catch (e) {
      console.error(`Invalid drill payload for kind ${kind}:`, e);
      // We continue despite validation error to avoid blocking user flow, 
      // but this log helps debugging.
    }

    drillAnalytics.track(kind, payload, mode === 'dialog' ? 'dialog' : 'navigate');
    
    if (mode === 'dialog') {
      openDialog(kind, payload);
      return;
    }

    const registryEntry = DRILL_REGISTRY[kind];
    if (registryEntry) {
      const route = registryEntry.getRoute(payload as any);
      if (route) {
        const historyItem: DrillHistoryItem = {
          kind,
          payload,
          timestamp: Date.now(),
          route
        };
        pushHistory(historyItem);
        
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
          // @ts-ignore - View Transitions API is new
          document.startViewTransition(() => {
            router.push(route);
          });
        } else {
          router.push(route);
        }
      } else {
        console.warn(`Page route not yet implemented for drill kind: ${kind}`);
      }
    } else {
      console.warn(`No registry entry for drill kind: ${kind}`);
    }
  };

  const openDetailDialog = (kind: DrillKind, payload: DrillPayload = {}) => {
    drillAnalytics.track(kind, payload, 'dialog');
    openDialog(kind, payload);
  };

  const getDrillContext = () => ({
    kind,
    payload,
    isOpen,
    preview
  });

  return {
    goToDetail,
    openDetailDialog,
    showPreview,
    hidePreview,
    getDrillContext
  };
}
