"use client";

import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock } from 'lucide-react';
import Link from 'next/link';

export function PendingOperationsBadge() {
  const { pendingCount } = useOfflineQueue();

  if (pendingCount === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/settings/sync">
            <Badge variant="secondary" className="gap-1.5 cursor-pointer hover:bg-secondary/80">
              <Clock className="h-3 w-3" />
              <span>{pendingCount}</span>
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>{pendingCount} pending operation(s) waiting to sync</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
