"use client";

import { useDrillUserData } from '@/store/use-drill-user-data';
import { ComparePanel } from './compare-panel';
import { PinnedPreview } from './pinned-preview';
import { GlobalDrillListener } from './global-drill-listener';

export function DrillDownProvider() {
  const { pinnedPreviews, unpinPreview } = useDrillUserData();

  // Persist middleware handles loading automatically on mount


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
