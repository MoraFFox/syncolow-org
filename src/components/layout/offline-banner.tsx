"use client";

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, X, Signal, SignalLow, SignalMedium, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { offlineQueueManager } from '@/lib/offline-queue-manager';
import { useOfflineQueueStore } from '@/store/use-offline-queue-store';
import { ConnectionQuality } from '@/lib/cache/types';

/**
 * OfflineBanner Component
 * 
 * Displays connection status and provides offline/reconnection information.
 * 
 * Features:
 * - Shows offline status with pending operations count
 * - Displays connection quality indicator (slow, medium, fast)
 * - Provides manual sync trigger button
 * - Auto-dismisses on reconnection with success indicator
 */
export function OfflineBanner() {
  const { isOnline, quality, reconnectAttempts } = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { queue, isProcessing } = useOfflineQueueStore();
  const pendingCount = queue.length;

  // Show reconnected banner briefly when coming back online
  useEffect(() => {
    if (isOnline && !isDismissed && quality !== 'offline') {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isDismissed, quality]);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!isOnline) {
      setIsDismissed(false);
      setShowReconnected(false);
    }
  }, [isOnline]);

  // Show reconnected success banner
  if (showReconnected && isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
        <Alert className="rounded-none border-x-0 border-t-0 bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Signal className="h-4 w-4" />
              <AlertDescription className="font-medium">
                Connection restored! Syncing {pendingCount} pending operation(s)...
              </AlertDescription>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  // Hide if online and not showing reconnected banner
  if (isOnline) return null;
  if (isDismissed) return null;

  // Get quality icon
  const QualityIcon = getQualityIcon(quality);

  // Manual sync handler
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await offlineQueueManager.processQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
      <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <QualityIcon className="h-4 w-4" />
            <AlertDescription className="font-medium">
              You are offline.
              {pendingCount > 0 && (
                <span className="ml-1">
                  {pendingCount} operation(s) pending sync.
                </span>
              )}
              {reconnectAttempts > 0 && (
                <span className="ml-1 text-muted-foreground">
                  (Reconnect attempts: {reconnectAttempts})
                </span>
              )}
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={handleManualSync}
                disabled={isSyncing || isProcessing || !navigator.onLine}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${(isSyncing || isProcessing) ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}

/**
 * Get the appropriate icon for connection quality
 */
function getQualityIcon(quality: ConnectionQuality): React.ComponentType<{ className?: string }> {
  switch (quality) {
    case 'offline':
      return WifiOff;
    case 'slow-2g':
    case '2g':
      return SignalLow;
    case '3g':
      return SignalMedium;
    case '4g':
    case 'wifi':
      return Signal;
    default:
      return WifiOff;
  }
}
