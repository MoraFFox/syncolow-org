import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionQuality, ConnectionInfo } from '@/lib/cache/types';

// Network Information API types (experimental API)
interface NetworkInformation extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}

/**
 * Enhanced Online Status Hook
 * 
 * Features:
 * - Basic online/offline detection
 * - Connection quality detection using Network Information API
 * - Reconnection attempt tracking with exponential backoff
 * - Debounced status changes to prevent flaky connection spam
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    quality: 'unknown',
  });
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_MS = 300;

  // Detect connection quality using Network Information API
  const detectConnectionQuality = useCallback((): ConnectionQuality => {
    if (!navigator.onLine) return 'offline';

    // Network Information API (experimental, Chrome/Edge/Opera)
    const connection = (navigator as NavigatorWithConnection).connection;
    if (!connection) return 'unknown';

    const effectiveType = connection.effectiveType;
    switch (effectiveType) {
      case 'slow-2g':
        return 'slow-2g';
      case '2g':
        return '2g';
      case '3g':
        return '3g';
      case '4g':
        // Distinguish between 4G and WiFi based on downlink speed
        // WiFi typically has >10 Mbps downlink
        if (connection.downlink && connection.downlink > 10) {
          return 'wifi';
        }
        return '4g';
      default:
        return 'unknown';
    }
  }, []);

  // Update connection info
  const updateConnectionInfo = useCallback(() => {
    const connection = (navigator as NavigatorWithConnection).connection;
    const quality = detectConnectionQuality();

    setConnectionInfo({
      isOnline: navigator.onLine,
      quality,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    });
  }, [detectConnectionQuality]);

  // Debounced online handler
  const handleOnline = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsOnline(true);
      setReconnectAttempts(0);
      updateConnectionInfo();
    }, DEBOUNCE_MS);
  }, [updateConnectionInfo]);

  // Debounced offline handler
  const handleOffline = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsOnline(false);
      setReconnectAttempts((prev) => prev + 1);
      setConnectionInfo((prev) => ({ ...prev, isOnline: false, quality: 'offline' }));
    }, DEBOUNCE_MS);
  }, []);

  // Handle connection quality changes
  const handleConnectionChange = useCallback(() => {
    updateConnectionInfo();
  }, [updateConnectionInfo]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection quality changes
    const connection = (navigator as NavigatorWithConnection).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial connection info
    updateConnectionInfo();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange, updateConnectionInfo]);

  return {
    isOnline,
    connectionInfo,
    reconnectAttempts,
    quality: connectionInfo.quality,
  };
}

/**
 * Calculate exponential backoff delay for reconnection attempts.
 * Uses a base delay of 1 second with exponential growth capped at 5 minutes.
 */
export function getReconnectDelay(attempts: number): number {
  const BASE_DELAY = 1000;
  const MAX_DELAY = 5 * 60 * 1000; // 5 minutes
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempts), MAX_DELAY);
  // Add jitter (0-10% of delay) to prevent thundering herd
  return delay + Math.random() * delay * 0.1;
}
