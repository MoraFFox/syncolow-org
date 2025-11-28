import { useState, useEffect, useCallback } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { tasksSyncService } from '@/services/tasks-sync-service';
import { useToast } from '@/hooks/use-toast';
import { isToday, isFuture } from 'date-fns';

export function useTasksSync(enableBackgroundSync = false) {
  const { visits, updateVisitStatus, deleteVisit } = useOrderStore(); // Assuming updateVisitStatus exists or similar
  const { maintenanceVisits, updateMaintenanceVisitStatus, deleteMaintenanceVisit } = useMaintenanceStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const { toast } = useToast();

  // Load initial settings
  useEffect(() => {
    setAutoSyncEnabled(tasksSyncService.isAutoSyncEnabled());
  }, []);

  const toggleAutoSync = (enabled: boolean) => {
    tasksSyncService.setAutoSyncEnabled(enabled);
    setAutoSyncEnabled(enabled);
    if (enabled) {
      triggerSync();
    }
  };

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      // Filter for relevant visits (today and future)
      // Note: We might want to include past pending visits too if we want to check for completion
      const relevantVisits = visits.filter(v => v.status !== 'Completed');
      
      const relevantMaintenance = maintenanceVisits.filter(v => v.status !== 'Completed');

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
      }
    } catch (error) {
      console.error('Auto-sync failed', error);
    } finally {
      setIsSyncing(false);
    }
  }, [visits, maintenanceVisits, isSyncing, toast]);

  // Auto-sync effect
  useEffect(() => {
    if (!autoSyncEnabled || !enableBackgroundSync) return;

    const timer = setTimeout(() => {
      triggerSync();
    }, 60000); // Check every 60s for completion updates

    return () => clearTimeout(timer);
  }, [visits, maintenanceVisits, autoSyncEnabled, enableBackgroundSync, triggerSync]);

  return {
    isSyncing,
    autoSyncEnabled,
    toggleAutoSync,
    triggerSync
  };
}
