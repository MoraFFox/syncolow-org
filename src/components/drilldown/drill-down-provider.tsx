"use client";

import { useEffect } from 'react';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { ComparePanel } from './compare-panel';
import { PinnedPreview } from './pinned-preview';
import { GlobalDrillListener } from './global-drill-listener';

export function DrillDownProvider() {
  const { pinnedPreviews, unpinPreview, loadPinnedPreviews } = useDrillDownStore();
  
  useEffect(() => {
    loadPinnedPreviews();
  }, [loadPinnedPreviews]);

  return (
    <>
      <GlobalDrillListener />
      <ComparePanel />
      {pinnedPreviews.map((pinned) => (
        <PinnedPreview
          key={pinned.id}
          id={pinned.id}
          kind={pinned.kind}
          payload={pinned.payload}
          position={pinned.position}
          onClose={() => unpinPreview(pinned.id)}
        />
      ))}
    </>
  );
}
