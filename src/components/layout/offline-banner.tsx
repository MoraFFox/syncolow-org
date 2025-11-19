"use client";

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setIsDismissed(false);
    }
  }, [isOnline]);

  if (isOnline) return null;
  if (isDismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
      <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="font-medium">
              You are offline. Changes will be saved and synced when connection is restored.
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}
