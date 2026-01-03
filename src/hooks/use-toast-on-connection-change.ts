import { useEffect, useRef, useCallback } from 'react';
import { toast } from './use-toast';
import { offlineQueueManager } from '@/lib/offline-queue-manager';

/**
 * Hook to show toast notifications when connection status changes.
 * 
 * Features:
 * - Registers BOTH online and offline event handlers simultaneously
 * - Debounces transitions to prevent toast spam during flaky connections
 * - Triggers queue processing on reconnection with rate limiting
 * - Skips toast on initial mount to avoid confusing users
 */
export function useToastOnConnectionChange() {
  // Track if this is the initial mount to avoid showing toast on page load
  const isInitialMount = useRef(true);
  // Debounce timer to prevent spam during flaky connections
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Rate limiter for queue processing
  const lastSyncAttempt = useRef<number>(0);
  const DEBOUNCE_MS = 500;
  const SYNC_RATE_LIMIT_MS = 5000; // Minimum 5 seconds between sync attempts

  const handleOnline = useCallback(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Skip toast on initial mount
      if (isInitialMount.current) return;

      toast({
        title: 'Connection Restored',
        description: 'You are back online. Syncing data...',
      });

      // Trigger queue processing with rate limiting
      const now = Date.now();
      if (now - lastSyncAttempt.current >= SYNC_RATE_LIMIT_MS) {
        lastSyncAttempt.current = now;
        // Process offline queue
        offlineQueueManager.processQueue().catch((err) => {
          console.error('[Connection] Failed to process queue:', err);
        });
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleOffline = useCallback(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Skip toast on initial mount
      if (isInitialMount.current) return;

      toast({
        title: 'Connection Lost',
        description: 'You are offline. Changes will be saved locally.',
        variant: 'destructive',
      });
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    // Register both handlers so we catch transitions in either direction
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Mark initial mount as complete after a short delay
    // This prevents toasts from firing on page load
    const timeoutId = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);
}
