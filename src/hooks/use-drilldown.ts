import { useRouter } from 'next/navigation';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { DrillKind, DrillPayload, DrillMode } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown-registry';
import { drillAnalytics } from '@/lib/drill-analytics';
import type { DrillHistoryItem } from '@/store/use-drilldown-store';

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
        router.push(route);
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
