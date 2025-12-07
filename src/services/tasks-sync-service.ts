import { logger } from '@/lib/logger';

/**
 * Common interface for visits that can be synced to Google Tasks.
 * Supports both regular VisitCall and MaintenanceVisit entities.
 */
export interface SyncVisit {
  id: string;
  date?: string | Date;
  address?: string;
  location?: string;
  clientName?: string;
  companyName?: string;
  outcome?: string;
  maintenanceNotes?: string;
}

interface SyncMap {
  [visitId: string]: {
    taskId: string;
    taskListId: string;
    hash: string;
  };
}

const STORAGE_KEY = 'tasks_sync_map';
const AUTO_SYNC_KEY = 'tasks_auto_sync_enabled';

export const tasksSyncService = {
  getSyncMap(): SyncMap {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  },

  saveSyncMap(map: SyncMap) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  },

  isAutoSyncEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTO_SYNC_KEY) !== 'false';
  },

  setAutoSyncEnabled(enabled: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  },

  async checkConnectionStatus(): Promise<boolean> {
    try {
      const res = await fetch('/api/google-tasks/status');
      const data = await res.json();
      return data.connected;
    } catch (error) {
      logger.error(error, { component: 'TasksSyncService', action: 'checkConnectionStatus' });
      return false;
    }
  },

  generateHash(visit: SyncVisit): string {
    const data = {
      date: visit.date,
      address: visit.address || visit.location,
      client: visit.clientName || visit.companyName,
      notes: visit.outcome || visit.maintenanceNotes
    };
    return JSON.stringify(data);
  },

  async syncVisit(visit: SyncVisit, type: 'Visit' | 'Maintenance' = 'Visit'): Promise<{ taskId: string } | null> {
    const syncMap = this.getSyncMap();
    const syncData = syncMap[visit.id];
    const currentHash = this.generateHash(visit);

    // Prepare task data
    const taskData = {
      title: `${type}: ${visit.clientName || visit.companyName || 'Client'}`,
      notes: `${type} Details:\nAddress: ${visit.address || visit.location || ''}\nNotes: ${visit.outcome || visit.maintenanceNotes || ''}\n\nView in App: ${window.location.origin}/dashboard`,
      due: visit.date ? new Date(visit.date).toISOString() : new Date().toISOString(),
    };

    try {
      // Update if needed
      if (syncData && syncData.taskId) {
        if (syncData.hash === currentHash) {
          return { taskId: syncData.taskId };
        }

        logger.debug(`Updating task for visit ${visit.id}`, { component: 'TasksSyncService', action: 'syncVisit' });
        const res = await fetch('/api/google-tasks/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'update', 
            taskId: syncData.taskId, 
            taskListId: syncData.taskListId,
            taskData 
          }),
        });

        const data = await res.json();
        if (data.success) {
          syncMap[visit.id] = { taskId: data.taskId, taskListId: data.taskListId, hash: currentHash };
          this.saveSyncMap(syncMap);
          return { taskId: data.taskId };
        }
        return null;
      }

      // Create New
      const res = await fetch('/api/google-tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'create', 
            taskData 
        }),
      });

      const data = await res.json();

      if (data.success && data.taskId) {
        syncMap[visit.id] = { taskId: data.taskId, taskListId: data.taskListId, hash: currentHash };
        this.saveSyncMap(syncMap);
        return { taskId: data.taskId };
      }
      return null;
    } catch (error) {
      logger.error(error, { component: 'TasksSyncService', action: 'syncVisit', visitId: visit.id });
      return null;
    }
  },

  async syncAll(visits: SyncVisit[], maintenanceVisits: SyncVisit[]) {
    // We assume the caller has checked connection status or we handle errors gracefully
    // const connected = await this.checkConnectionStatus(); 
    // if (!connected) return { success: false, error: 'Not connected' };

    let syncedCount = 0;
    const completedVisits: string[] = [];
    const deletedVisits: string[] = [];
    const syncMap = this.getSyncMap();

    // 1. Batch Check Completion & Deletion
    const taskIdsToCheck: string[] = [];
    const visitIdToTaskId: Record<string, string> = {};
    const taskIdToVisitId: Record<string, string> = {};

    const allVisits = [...visits, ...maintenanceVisits];
    
    for (const visit of allVisits) {
        const syncData = syncMap[visit.id];
        if (syncData && syncData.taskId) {
            taskIdsToCheck.push(syncData.taskId);
            visitIdToTaskId[visit.id] = syncData.taskId;
            taskIdToVisitId[syncData.taskId] = visit.id;
        }
    }

    if (taskIdsToCheck.length > 0) {
        try {
            const firstSyncData = Object.values(syncMap).find(d => d.taskId);
            const taskListId = firstSyncData?.taskListId;

            if (taskListId) {
                const res = await fetch('/api/google-tasks/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'check_batch_completion', 
                        taskIds: taskIdsToCheck,
                        taskListId
                    }),
                });
                const data = await res.json();
                
                if (data.success) {
                    // Handle Completed
                    if (Array.isArray(data.completedTaskIds)) {
                        for (const visitId in visitIdToTaskId) {
                            if (data.completedTaskIds.includes(visitIdToTaskId[visitId])) {
                                completedVisits.push(visitId);
                            }
                        }
                    }
                    
                    // Handle Deleted (Missing)
                    if (Array.isArray(data.missingTaskIds)) {
                        for (const missingTaskId of data.missingTaskIds) {
                            const visitId = taskIdToVisitId[missingTaskId];
                            if (visitId) {
                                deletedVisits.push(visitId);
                                // Remove from sync map so we don't try to sync it again or check it again
                                delete syncMap[visitId];
                            }
                        }
                        // Save updated map if we deleted anything
                        if (deletedVisits.length > 0) {
                            this.saveSyncMap(syncMap);
                        }
                    }
                }
            }
        } catch (e) {
            logger.error(e, { component: 'TasksSyncService', action: 'syncAll-batchCheck' });
        }
    }

    // 2. Sync Individual Items (Create/Update)
    // Skip completed AND deleted items
    
    for (const visit of visits) {
      if (!visit.date || completedVisits.includes(visit.id) || deletedVisits.includes(visit.id)) continue;
      const result = await this.syncVisit(visit, 'Visit');
      if (result) syncedCount++;
    }

    for (const visit of maintenanceVisits) {
      if (!visit.date || completedVisits.includes(visit.id) || deletedVisits.includes(visit.id)) continue;
      const result = await this.syncVisit(visit, 'Maintenance');
      if (result) syncedCount++;
    }

    return { success: true, syncedCount, completedVisits, deletedVisits };
  }
};
