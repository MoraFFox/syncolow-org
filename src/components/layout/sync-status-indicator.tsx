"use client";

import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineQueueStore } from '@/store/use-offline-queue-store';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SyncStatusIndicator() {
  const isOnline = useOnlineStatus();
  const { isProcessing } = useOfflineQueueStore();

  const Icon = !isOnline ? WifiOff : isProcessing ? RefreshCw : Wifi;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="relative p-2 hover:bg-accent rounded-md transition-colors">
            <Icon className={`h-5 w-5 ${isProcessing ? 'animate-spin' : ''} ${!isOnline ? 'text-muted-foreground' : ''}`} />
            {isOnline && !isProcessing && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {!isOnline && 'No internet connection'}
            {isOnline && isProcessing && 'Syncing changes with server'}
            {isOnline && !isProcessing && 'Connected and synced'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
