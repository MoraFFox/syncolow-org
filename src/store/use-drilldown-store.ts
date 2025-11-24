import { create } from 'zustand';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';

interface DrillDownState {
  // Dialog State
  isOpen: boolean;
  kind: DrillKind | null;
  payload: DrillPayload | null;
  
  // Preview/Tooltip State
  preview: {
    isOpen: boolean;
    kind: DrillKind | null;
    payload: DrillPayload | null;
    coords?: { x: number; y: number };
  };

  // Actions
  openDialog: (kind: DrillKind, payload?: DrillPayload) => void;
  closeDialog: () => void;
  
  showPreview: (kind: DrillKind, payload: DrillPayload, coords?: { x: number; y: number }) => void;
  hidePreview: () => void;
}

export const useDrillDownStore = create<DrillDownState>((set) => ({
  // Dialog State
  isOpen: false,
  kind: null,
  payload: null,

  // Preview State
  preview: {
    isOpen: false,
    kind: null,
    payload: null,
  },

  openDialog: (kind, payload = {}) => set({ isOpen: true, kind, payload }),
  closeDialog: () => set({ isOpen: false, kind: null, payload: null }),

  showPreview: (kind, payload, coords) => set({ 
    preview: { isOpen: true, kind, payload, coords } 
  }),
  hidePreview: () => set({ 
    preview: { isOpen: false, kind: null, payload: null, coords: undefined } 
  }),
}));
