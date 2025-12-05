import { useState, useEffect, useCallback } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { tasksSyncService } from '@/services/tasks-sync-service';
import { useToast } from '@/hooks/use-toast';
import { isToday, isFuture } from 'date-fns';

export function useTasksSync(enableBackgroundSync = false) {
  const { visits, updateVisitStatus, deleteVisit } = useOrderStore(); 
  const { maintenanceVisits, updateMaintenanceVisitStatus, deleteMaintenanceVisit } = useMaintenanceStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Load initial settings and check connection once
  useEffect(() => {
    setAutoSyncEnabled(tasksSyncService.isAutoSyncEnabled());
    checkConnection();
  }, []);

  const checkConnection = async () => {
      const connected = await tasksSyncService.checkConnectionStatus();
      setIsConnected(connected);
      return connected;
  };

  const toggleAutoSync = (enabled: boolean) => {
    tasksSyncService.setAutoSyncEnabled(enabled);
    setAutoSyncEnabled(enabled);
    if (enabled) {
      triggerSync();
    }
  };

  const triggerSync = useCallback(async (force = false) => {
    if (isSyncing) return;
    
    // If we know we are not connected, don't try unless forced (manual click)
    if (isConnected === false && !force) return;

    setIsSyncing(true);

    try {
      const relevantVisits = visits.filter(v => v.status !== 'Completed');
      const relevantMaintenance = maintenanceVisits.filter(v => v.status !== 'Completed');

      // If forced, re-check connection
      if (force) {
          const connected = await checkConnection();
          if (!connected) {
              setIsSyncing(false);
              return;
          }
      }

      const result = await tasksSyncService.syncAll(relevantVisits, relevantMaintenance);
      
      if (result.success) {
        if (result.syncedCount !== undefined && result.syncedCount > 0) {
            console.log(`Synced ${result.syncedCount} tasks`);
        }
        
        // Handle completed tasks
        if (result.completedVisits && result.completedVisits.length > 0) {
            console.log('Marking visits as completed:', result.completedVisits);
            
            result.completedVisits.forEach(id => {
                 const isSalesVisit = visits.some(v => v.id === id);
                 const isMaintenanceVisit = maintenanceVisits.some(v => v.id === id);

                 if (isSalesVisit) {
                     updateVisitStatus(id, 'Completed');
                     console.log(`Sales Visit ${id} marked completed`);
                 } else if (isMaintenanceVisit) {
                     updateMaintenanceVisitStatus(id, 'Completed');
                     console.log(`Maintenance Visit ${id} marked completed`);
                 }
            });
            
            toast({
                title: "Tasks Updated",
                description: `${result.completedVisits.length} visits marked as completed from Google Tasks.`,
            });
        }

        // Handle deleted tasks
        if (result.deletedVisits && result.deletedVisits.length > 0) {
            console.log('Deleting visits removed from Google Tasks:', result.deletedVisits);
            
            result.deletedVisits.forEach(id => {
                 const isSalesVisit = visits.some(v => v.id === id);
                 const isMaintenanceVisit = maintenanceVisits.some(v => v.id === id);

                 if (isSalesVisit) {
                     deleteVisit(id);
                     console.log(`Sales Visit ${id} deleted`);
                 } else if (isMaintenanceVisit) {
                     deleteMaintenanceVisit(id);
                     console.log(`Maintenance Visit ${id} deleted`);
                 }
            });

            toast({
                title: "Visits Deleted",
                description: `${result.deletedVisits.length} visits deleted because they were removed from Google Tasks.`,
                variant: "destructive"
            });
        }
      } else if ('error' in result && result.error === 'Not connected') {
          setIsConnected(false);
      }
    } catch (error) {
      console.error('Auto-sync failed', error);
    } finally {
      setIsSyncing(false);
    }
  }, [visits, maintenanceVisits, isSyncing, toast, isConnected, updateVisitStatus, updateMaintenanceVisitStatus, deleteVisit, deleteMaintenanceVisit]);

  // 1. Periodic Polling (Google -> App)
  // Checks for remote changes every 60s, regardless of local state
  useEffect(() => {
    if (!autoSyncEnabled || !enableBackgroundSync) return;

    const interval = setInterval(() => {
      // We pass true to force a connection check occasionally? 
      // Or just rely on the cached state. Let's rely on cached state to avoid spam.
      // But if we are disconnected, we might want to retry?
      // Let's just call triggerSync() which respects isConnected.
      triggerSync(); 
    }, 60000); 

    return () => clearInterval(interval);
  }, [autoSyncEnabled, enableBackgroundSync, triggerSync]);

  // 2. Reactive Sync (App -> Google)
  // Triggers when local data changes
  useEffect(() => {
      if (!autoSyncEnabled || !enableBackgroundSync) return;
      
      // Debounce to avoid spamming while typing or rapid updates
      const timer = setTimeout(() => {
          triggerSync();
      }, 2000); // 2 second debounce

      return () => clearTimeout(timer);
  }, [visits, maintenanceVisits, autoSyncEnabled, enableBackgroundSync, triggerSync]);

  return {
    isSyncing,
    autoSyncEnabled,
    toggleAutoSync,
    triggerSync: () => triggerSync(true) // Manual trigger forces connection check
  };
}
