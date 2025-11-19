import { create } from 'zustand';
import { Conflict } from '@/lib/conflict-resolver';

interface ConflictState {
  conflicts: Conflict[];
  
  addConflict: (conflict: Conflict) => void;
  removeConflict: (id: string) => void;
  markResolved: (id: string, resolution: 'server' | 'client' | 'manual', resolvedData?: any) => void;
  clearResolved: () => void;
}

export const useConflictStore = create<ConflictState>((set) => ({
  conflicts: [],

  addConflict: (conflict) => {
    set((state) => ({
      conflicts: [...state.conflicts, conflict],
    }));
  },

  removeConflict: (id) => {
    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.id !== id),
    }));
  },

  markResolved: (id, resolution, resolvedData) => {
    set((state) => ({
      conflicts: state.conflicts.map((c) =>
        c.id === id
          ? { ...c, resolved: true, resolution, resolvedData }
          : c
      ),
    }));
  },

  clearResolved: () => {
    set((state) => ({
      conflicts: state.conflicts.filter((c) => !c.resolved),
    }));
  },
}));

