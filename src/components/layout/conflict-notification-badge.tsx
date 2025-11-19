"use client";

import { useConflictStore } from '@/store/use-conflict-store';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { ConflictResolutionDialog } from '../conflict-resolution-dialog';

export function ConflictNotificationBadge() {
  const { conflicts } = useConflictStore();
  const [selectedConflict, setSelectedConflict] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

  if (unresolvedConflicts.length === 0) return null;

  const handleClick = () => {
    if (unresolvedConflicts.length > 0) {
      setSelectedConflict(unresolvedConflicts[0]);
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="destructive"
              className="gap-1.5 cursor-pointer hover:bg-destructive/80"
              onClick={handleClick}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>{unresolvedConflicts.length}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{unresolvedConflicts.length} sync conflict(s) need resolution</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ConflictResolutionDialog
        conflict={selectedConflict}
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            // Show next conflict if available
            const remaining = conflicts.filter((c) => !c.resolved && c.id !== selectedConflict?.id);
            if (remaining.length > 0) {
              setTimeout(() => {
                setSelectedConflict(remaining[0]);
                setIsDialogOpen(true);
              }, 500);
            }
          }
        }}
      />
    </>
  );
}
