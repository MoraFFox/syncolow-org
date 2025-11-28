import { useState, useEffect, useCallback } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { calendarSyncService } from '@/services/calendar-sync-service';
import { useToast } from '@/hooks/use-toast';
import { isToday, isFuture } from 'date-fns';

export function useCalendarSync(enableBackgroundSync = false) {
  const { visits } = useOrderStore();
  const { maintenanceVisits } = useMaintenanceStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const { toast } = useToast();

  // Load initial settings
  useEffect(() => {
    setAutoSyncEnabled(calendarSyncService.isAutoSyncEnabled());
  }, []);

  const toggleAutoSync = (enabled: boolean) => {
    calendarSyncService.setAutoSyncEnabled(enabled);
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
      const relevantVisits = visits.filter(v => 
        v.date && (isToday(new Date(v.date)) || isFuture(new Date(v.date)))
      );
      
      const relevantMaintenance = maintenanceVisits.filter(v => 
        v.date && (isToday(new Date(v.date as string)) || isFuture(new Date(v.date as string)))
      );

      const result = await calendarSyncService.syncAll(relevantVisits, relevantMaintenance);
      
      if (result.success && result.syncedCount !== undefined && result.syncedCount > 0) {
        console.log(`Synced ${result.syncedCount} visits to calendar`);
      }
    } catch (error) {
      console.error('Auto-sync failed', error);
    } finally {
      setIsSyncing(false);
    }
  }, [visits, maintenanceVisits, isSyncing]);

  // Auto-sync effect
  useEffect(() => {
    if (!autoSyncEnabled || !enableBackgroundSync) return;

    const timer = setTimeout(() => {
      triggerSync();
    }, 5000); // Debounce 5s to avoid rapid updates

    return () => clearTimeout(timer);
  }, [visits, maintenanceVisits, autoSyncEnabled, enableBackgroundSync, triggerSync]);

  return {
    isSyncing,
    autoSyncEnabled,
    toggleAutoSync,
    triggerSync
  };
}
