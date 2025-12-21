"use client";

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useDrillUserData } from '@/store/use-drill-user-data';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { useDrillPreviewData } from '@/hooks/use-drill-preview-data';
import { DrillCard } from './drill-card';
import { DrillContentRenderer } from './drill-content-renderer';
import { DrillActions } from './drill-actions';

interface PinnedPreviewProps {
  id: string;
  index: number;
  kind: DrillKind;
  payload: DrillPayload;
  position: { x: number; y: number };
  onClose: () => void;
}

export function PinnedPreview({ id, index, kind, payload, position, onClose }: PinnedPreviewProps) {
  const { data: asyncData, isLoading, error } = useDrillPreviewData(kind, payload, true);
  const [pos, setPos] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);



  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;

      const newX = e.clientX - dragRef.current.offsetX;
      const newY = e.clientY - dragRef.current.offsetY;

      // Update local state for immediate feedback
      setPos({ x: newX, y: newY });

      // Update global store for threads (this enables the elastic thread effect)
      // requestAnimationFrame is implicitly handled by React state batching fast enough for <10 items
      useDrillUserData.getState().updatePinPosition(id, newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id]);

  // Quick-Peek Listener (Alt+Index)
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    // Better implementation separate from above check
    const handlePeek = ((e: CustomEvent) => {
      if (e.detail?.index === index) {
        setHighlight(true);
        setTimeout(() => setHighlight(false), 400);
      }
    }) as EventListener;

    window.addEventListener('drill:quick-peek', handlePeek);
    return () => window.removeEventListener('drill:quick-peek', handlePeek);
  }, [index]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: pos.x,
      startY: pos.y,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
    };
  };

  return (
    <div
      className={cn(
        "fixed z-50 transition-transform duration-200",
        highlight && "scale-110 z-[60] ring-4 ring-primary/50 rounded-xl"
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      <DrillCard
        title={`${kind} (Pinned)`}
        onHeaderMouseDown={handleMouseDown}
        headerActions={
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        }
      >
        <DrillContentRenderer
          kind={kind}
          payload={payload}
          isLoading={isLoading}
          error={error}
          asyncData={asyncData}
        />

        <DrillActions kind={kind} payload={payload} />
      </DrillCard>
    </div>
  );
}
