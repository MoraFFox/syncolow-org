'use client';

import * as React from 'react';
import { useDrillHover } from '@/hooks/use-drill-hover';
import { useDrillKeyboard } from '@/hooks/use-drill-keyboard';
import { useDrillTouch } from '@/hooks/use-drill-touch';
import { useDrillDown } from '@/hooks/use-drilldown';
import { DATA_DRILL_KIND, DATA_DRILL_PAYLOAD, DATA_DRILL_DISABLED, DATA_DRILL_MODE, DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { validateDrillPayload } from '@/lib/drilldown/validation';
import { DrillFirstInteractionHint } from './drill-first-interaction-hint';

/**
 * Global listener for drilldown interactions.
 * logic is distributed across specialized hooks:
 * - useDrillKeyboard: Keyboard navigation
 * - useDrillHover: Mouse interactions, velocity tracking, hit area detection
 * - useDrillTouch: Touch interactions (long press)
 */
export function GlobalDrillListener() {
  const { goToDetail } = useDrillDown();

  // Handle global clicks on drill targets
  const handleClick = React.useCallback((e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest(`[${DATA_DRILL_KIND}]`) as HTMLElement | null;
    if (!target || target.hasAttribute(DATA_DRILL_DISABLED)) return;

    const kind = target.getAttribute(DATA_DRILL_KIND) as DrillKind;
    const payloadStr = target.getAttribute(DATA_DRILL_PAYLOAD);

    if (kind && payloadStr) {
      try {
        const payload = JSON.parse(payloadStr) as DrillPayload;
        if (validateDrillPayload(kind, payload)) {
          // If the element has a default click action (like a link or button), 
          // we might want to let it through if it's NOT explicitly a drill-only element.
          // But usually, we want to handle the drill.
          const mode = target.getAttribute(DATA_DRILL_MODE) || 'page';

          // Only prevent default if it's our target
          if (target.hasAttribute('data-drill-target')) {
            // e.preventDefault(); // Don't prevent default, might be a real button with other logic
          }

          goToDetail(kind, payload, mode as any);
        }
      } catch (err) {
        console.error("Failed to parse drill payload on click", err);
      }
    }
  }, [goToDetail]);

  React.useEffect(() => {
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [handleClick]);

  // Initialize other hooks
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
