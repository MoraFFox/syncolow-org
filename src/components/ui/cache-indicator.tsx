"use client";

import { Badge } from '@/components/ui/badge';
import { Database } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CacheIndicatorProps {
  isFromCache: boolean;
}

export function CacheIndicator({ isFromCache }: CacheIndicatorProps) {
  if (!isFromCache) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1.5">
            <Database className="h-3 w-3" />
            <span className="text-xs">Cached</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Showing cached data from local storage</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
