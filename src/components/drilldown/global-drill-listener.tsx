'use client';

import * as React from 'react';
import { useDrillKeyboard } from '@/hooks/use-drill-keyboard';
import { useDrillHover } from '@/hooks/use-drill-hover';
import { useDrillTouch } from '@/hooks/use-drill-touch';
import { DrillFirstInteractionHint } from './drill-first-interaction-hint';

/**
 * Global listener for drilldown interactions.
 * logic is distributed across specialized hooks:
 * - useDrillKeyboard: Keyboard navigation
 * - useDrillHover: Mouse interactions, velocity tracking, hit area detection
 * - useDrillTouch: Touch interactions (long press)
 */
export function GlobalDrillListener() {
  // Initialize hooks
  useDrillKeyboard(true);
  useDrillTouch(true);
  const { showHint, setShowHint, hintTarget } = useDrillHover(true);

  if (!showHint || !hintTarget) return null;

  return (
    <DrillFirstInteractionHint
      targetElement={hintTarget}
      onDismiss={() => setShowHint(false)}
    />
  );
}
