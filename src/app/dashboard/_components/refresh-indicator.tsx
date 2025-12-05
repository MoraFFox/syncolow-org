"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface RefreshIndicatorProps {
  lastUpdated?: Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  compact?: boolean;
  className?: string;
}

export function RefreshIndicator({ lastUpdated, onRefresh, isRefreshing, compact, className }: RefreshIndicatorProps) {
  const label = lastUpdated ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}` : "";
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {label && <span className={cn(compact && "hidden md:inline")}>{label}</span>}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing} className={cn("h-8 w-8", isRefreshing && "opacity-80")}> 
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh dashboard data</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
