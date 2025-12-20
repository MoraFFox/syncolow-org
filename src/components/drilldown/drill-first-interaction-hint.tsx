'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useDrillUserData } from '@/store/use-drill-user-data';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DrillFirstInteractionHintProps {
  targetElement: HTMLElement | null;
  onDismiss: () => void;
}

export function DrillFirstInteractionHint({
  targetElement,
  onDismiss,
}: DrillFirstInteractionHintProps) {
  const { onboarding, markFirstInteractionHintSeen } = useDrillUserData();
  const { hasSeenFirstInteractionHint } = onboarding;
  const [mounted, setMounted] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-dismiss after 3 seconds
  React.useEffect(() => {
    if (!targetElement || dismissed) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, 3000);

    return () => clearTimeout(timer);
  }, [targetElement, dismissed]);

  // Keyboard dismiss (Escape)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    markFirstInteractionHintSeen();
    onDismiss();
  };

  if (!mounted || !targetElement || hasSeenFirstInteractionHint || dismissed) return null;

  // Calculate position near targetElement
  const rect = targetElement.getBoundingClientRect();
  const TOOLTIP_WIDTH = 256; // max-w-xs
  const TOOLTIP_HEIGHT = 80;
  const PADDING = 10;

  let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  let top = rect.top - TOOLTIP_HEIGHT - PADDING;

  // Boundary checks
  if (typeof window !== 'undefined') {
    if (left < PADDING) left = PADDING;
    if (left + TOOLTIP_WIDTH > window.innerWidth - PADDING) {
      left = window.innerWidth - TOOLTIP_WIDTH - PADDING;
    }
    if (top < PADDING) {
      top = rect.bottom + PADDING;
    }
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    top,
    zIndex: 60,
    pointerEvents: 'auto',
  };

  return createPortal(
    <div
      style={style}
      className={cn(
        'drill-preview-enter max-w-xs rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md',
        'flex items-center gap-2'
      )}
      role="tooltip"
      aria-live="polite"
    >
      {/* Arrow pointing to target */}
      <div
        className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: '-4px',
        }}
      />

      <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="flex-1">Hover to preview details, click to open full view</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="text-xs px-2 py-1 h-auto"
        autoFocus
      >
        Got it
      </Button>
    </div>,
    document.body
  );
}