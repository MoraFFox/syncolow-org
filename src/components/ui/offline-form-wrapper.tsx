"use client";

import { useOnlineStatus } from '@/hooks/use-online-status';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

interface OfflineFormWrapperProps {
  children: React.ReactNode;
  allowOfflineEdit?: boolean;
}

export function OfflineFormWrapper({ children, allowOfflineEdit = false }: OfflineFormWrapperProps) {
  const isOnline = useOnlineStatus();

  if (!isOnline && !allowOfflineEdit) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You are offline. This form cannot be submitted until connection is restored.
          </AlertDescription>
        </Alert>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  if (!isOnline && allowOfflineEdit) {
    return (
      <div className="space-y-4">
        <Alert className="bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You are offline. Changes will be queued and synced when connection is restored.
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
