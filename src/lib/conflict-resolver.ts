import { db } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface Conflict {
  id: string;
  operationId: string;
  collection: string;
  documentId: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
  conflictingFields: string[];
  resolved: boolean;
  resolution?: 'server' | 'client' | 'manual';
  resolvedData?: any;
  createdAt: number;
}

export type ResolutionStrategy = 'server' | 'client' | 'manual';

class ConflictResolver {
  async detectConflict(
    collection: string,
    documentId: string,
    localData: any,
    localTimestamp: number
  ): Promise<Conflict | null> {
    try {
      const docRef = doc(db, collection, documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null; // No conflict, document doesn't exist
      }

      const serverData = docSnap.data();
      const serverTimestamp = serverData.updatedAt || serverData.createdAt || 0;

      // Check if server was modified after local change
      if (serverTimestamp > localTimestamp) {
        const conflictingFields = this.findConflictingFields(localData, serverData);

        if (conflictingFields.length > 0) {
          return {
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            operationId: '',
            collection,
            documentId,
            localData,
            serverData,
            localTimestamp,
            serverTimestamp,
            conflictingFields,
            resolved: false,
            createdAt: Date.now(),
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting conflict:', error);
      return null;
    }
  }

  private findConflictingFields(localData: any, serverData: any): string[] {
    const conflicts: string[] = [];
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)]);

    for (const key of allKeys) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;

      const localValue = localData[key];
      const serverValue = serverData[key];

      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }

  async resolveConflict(
    conflict: Conflict,
    strategy: ResolutionStrategy,
    manualData?: any
  ): Promise<any> {
    let resolvedData: any;

    switch (strategy) {
      case 'server':
        resolvedData = conflict.serverData;
        break;

      case 'client':
        resolvedData = conflict.localData;
        break;

      case 'manual':
        if (!manualData) throw new Error('Manual resolution requires data');
        resolvedData = manualData;
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }

    // Update document with resolved data
    const docRef = doc(db, conflict.collection, conflict.documentId);
    await updateDoc(docRef, {
      ...resolvedData,
      updatedAt: serverTimestamp(),
    });

    return {
      ...conflict,
      resolved: true,
      resolution: strategy,
      resolvedData,
    };
  }

  mergeNonConflictingFields(conflict: Conflict): any {
    const merged = { ...conflict.serverData };

    for (const key of Object.keys(conflict.localData)) {
      if (!conflict.conflictingFields.includes(key)) {
        merged[key] = conflict.localData[key];
      }
    }

    return merged;
  }

  getFieldDiff(conflict: Conflict, field: string): { local: any; server: any } {
    return {
      local: conflict.localData[field],
      server: conflict.serverData[field],
    };
  }
}

export const conflictResolver = new ConflictResolver();

