"use client";

import { useDrillUserData } from '@/store/use-drill-user-data';
import { ComparePanel } from './compare-panel';
import { PinnedPreview } from './pinned-preview';
import { GlobalDrillListener } from './global-drill-listener';
import { SpatialThreadsLayer } from './spatial-threads-layer';
import { KeyboardQuickPeek } from './keyboard-quick-peek';

export function DrillDownProvider() {
  const { pinnedPreviews, unpinPreview } = useDrillUserData();

  // Persist middleware handles loading automatically on mount


  return (
    <>
      <GlobalDrillListener />
      <SpatialThreadsLayer />
      <KeyboardQuickPeek />
      <ComparePanel />
      {pinnedPreviews.map((pinned, index) => (
        <PinnedPreview
          key={pinned.id}
          index={index}
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
