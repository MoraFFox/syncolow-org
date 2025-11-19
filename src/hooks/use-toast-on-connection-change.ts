import { useEffect } from 'react';
import { useOnlineStatus } from './use-online-status';
import { toast } from './use-toast';

export function useToastOnConnectionChange() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: 'Connection Restored',
        description: 'You are back online. Syncing data...',
      });
    };

    const handleOffline = () => {
      toast({
        title: 'Connection Lost',
        description: 'You are offline. Changes will be saved locally.',
        variant: 'destructive',
      });
    };

    if (isOnline) {
      window.addEventListener('online', handleOnline);
    } else {
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);
}
