import { logger } from '@/lib/logger';

/**
 * Common interface for visits that can be synced to Google Calendar.
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
    eventId: string;
    hash: string;
  }; 
}

const STORAGE_KEY = 'calendar_sync_map';
const AUTO_SYNC_KEY = 'calendar_auto_sync_enabled';

export const calendarSyncService = {
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
    return localStorage.getItem(AUTO_SYNC_KEY) !== 'false'; // Default to true if not set
  },

  setAutoSyncEnabled(enabled: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  },

  async checkConnectionStatus(): Promise<boolean> {
    try {
      const res = await fetch('/api/google-calendar/status');
      const data = await res.json();
      return data.connected;
    } catch (error) {
      logger.error(error, { component: 'CalendarSyncService', action: 'checkConnectionStatus' });
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

  async syncVisit(visit: SyncVisit, type: 'Visit' | 'Maintenance' = 'Visit'): Promise<string | null> {
    const syncMap = this.getSyncMap();
    let syncData = syncMap[visit.id];
    
    // Handle legacy format (string) migration
    if (typeof syncData === 'string') {
      syncData = { eventId: syncData, hash: '' };
    }
    
    const currentHash = this.generateHash(visit);

    // Prepare event data
    const event = {
      summary: `${type}: ${visit.clientName || visit.companyName || 'Client'}`,
      description: `${type} Details:\nAddress: ${visit.address || visit.location || ''}\nNotes: ${visit.outcome || visit.maintenanceNotes || ''}\n\nView in App: ${window.location.origin}/dashboard`,
      start: {
        dateTime: visit.date ? new Date(visit.date).toISOString() : new Date().toISOString(),
      },
      end: {
        dateTime: visit.date 
          ? new Date(new Date(visit.date).getTime() + 60 * 60 * 1000).toISOString() // Default 1 hour
          : new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
      },
      location: visit.address || visit.location || '',
    };

    try {
      // UPDATE FLOW
      if (syncData && syncData.eventId) {
        // If hash matches, no changes needed
        if (syncData.hash === currentHash) {
          return syncData.eventId;
        }

        // Hash changed, perform update
        logger.debug(`Updating calendar event for visit ${visit.id}`, { component: 'CalendarSyncService', action: 'syncVisit' });
        const res = await fetch('/api/google-calendar/update-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: syncData.eventId, event }),
        });

        const data = await res.json();
        if (data.success) {
          syncMap[visit.id] = { eventId: syncData.eventId, hash: currentHash };
          this.saveSyncMap(syncMap);
          return syncData.eventId;
        }
        return null;
      }

      // CREATE FLOW
      const res = await fetch('/api/google-calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });

      const data = await res.json();

      if (data.success && data.eventId) {
        syncMap[visit.id] = { eventId: data.eventId, hash: currentHash };
        this.saveSyncMap(syncMap);
        return data.eventId;
      }
      return null;
    } catch (error) {
      logger.error(error, { component: 'CalendarSyncService', action: 'syncVisit', visitId: visit.id });
      return null;
    }
  },

  async syncAll(visits: SyncVisit[], maintenanceVisits: SyncVisit[]) {
    const connected = await this.checkConnectionStatus();
    if (!connected) return { success: false, error: 'Not connected' };

    let syncedCount = 0;
    const errors = [];

    // Sync Visits
    for (const visit of visits) {
      if (!visit.date) continue;
      const result = await this.syncVisit(visit, 'Visit');
      if (result) syncedCount++;
    }

    // Sync Maintenance
    for (const visit of maintenanceVisits) {
      if (!visit.date) continue;
      const result = await this.syncVisit(visit, 'Maintenance');
      if (result) syncedCount++;
    }

    return { success: true, syncedCount };
  }
};
