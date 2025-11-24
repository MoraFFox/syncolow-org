import { useRouter } from 'next/navigation';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { DrillKind, DrillPayload, DrillMode } from '@/lib/drilldown-types';
import { DRILL_REGISTRY } from '@/lib/drilldown-registry';

export function useDrillDown() {
  const router = useRouter();
  const { 
    openDialog, 
    showPreview: showPreviewAction,
    hidePreview: hidePreviewAction,
    kind, 
    payload, 
    isOpen,
    preview
  } = useDrillDownStore();

  const showPreview = (kind: DrillKind, payload: DrillPayload, coords?: { x: number; y: number }) => {
    showPreviewAction(kind, payload, coords);
  };

  const hidePreview = () => {
    hidePreviewAction();
  };

  const goToDetail = (kind: DrillKind, payload: DrillPayload = {}, mode: DrillMode = 'page') => {
    if (mode === 'dialog') {
      openDialog(kind, payload);
      return;
    }

    const registryEntry = DRILL_REGISTRY[kind];
    if (registryEntry) {
      // Cast payload to any because DrillPayload is a union and getRoute expects specific kind
      const route = registryEntry.getRoute(payload as any);
      if (route) {
        router.push(route);
      } else {
        console.warn(`Page route not yet implemented for drill kind: ${kind}`);
      }
    } else {
      console.warn(`No registry entry for drill kind: ${kind}`);
    }
  };

  const openDetailDialog = (kind: DrillKind, payload: DrillPayload = {}) => {
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
