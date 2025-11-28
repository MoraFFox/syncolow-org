"use client";

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';
import { useDrillPreviewData } from '@/hooks/use-drill-preview-data';
import { DrillCard } from './drill-card';
import { DrillContentRenderer } from './drill-content-renderer';
import { DrillActions } from './drill-actions';

interface PinnedPreviewProps {
  id: string;
  kind: DrillKind;
  payload: DrillPayload;
  position: { x: number; y: number };
  onClose: () => void;
}

export function PinnedPreview({ id, kind, payload, position, onClose }: PinnedPreviewProps) {
  const { data: asyncData, isLoading, error } = useDrillPreviewData(kind, payload, true);
  const [pos, setPos] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY,
      });
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
  }, [isDragging]);

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
    <div className="fixed z-50" style={{ left: pos.x, top: pos.y }}>
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
