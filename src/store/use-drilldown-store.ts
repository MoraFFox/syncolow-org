/** @format */

import { create } from "zustand";
import { DrillKind, DrillPayload } from "@/lib/drilldown-types";


export interface DrillHistoryItem {
  kind: DrillKind;
  payload: DrillPayload;
  timestamp: number;
  route: string;
}



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

  // History State
  history: DrillHistoryItem[];
  historyIndex: number;

  // Compare State
  compareMode: boolean;
  compareItems: Array<{ kind: DrillKind; payload: DrillPayload }>;



  // Peek State
  peek: {
    isOpen: boolean;
    kind: DrillKind | null;
    payload: DrillPayload | null;
  };

  // Spotlight State (Predictive Focus)
  spotlight: {
    active: boolean;
    kind: DrillKind | null;
    matchingId: string | null;
  };





  // Actions
  openDialog: (kind: DrillKind, payload?: DrillPayload) => void;
  closeDialog: () => void;

  showPreview: (
    kind: DrillKind,
    payload: DrillPayload,
    coords?: { x: number; y: number }
  ) => void;
  hidePreview: () => void;

  openPeek: (kind: DrillKind, payload: DrillPayload) => void;
  closePeek: () => void;

  setSpotlight: (kind: DrillKind, matchingId: string) => void;
  clearSpotlight: () => void;

  // History Actions
  pushHistory: (item: DrillHistoryItem) => void;
  goBack: () => DrillHistoryItem | null;
  goForward: () => DrillHistoryItem | null;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  // Compare Actions
  toggleCompareMode: () => void;
  addToCompare: (kind: DrillKind, payload: DrillPayload) => void;
  removeFromCompare: (index: number) => void;
  clearCompare: () => void;






}

export const useDrillDownStore = create<DrillDownState>((set, get) => ({
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

  // Peek State
  peek: {
    isOpen: false,
    kind: null,
    payload: null,
  },

  // Spotlight State
  spotlight: {
    active: false,
    kind: null,
    matchingId: null,
  },

  // History State
  history: [],
  historyIndex: -1,

  // Compare State
  compareMode: false,
  compareItems: [],







  openDialog: (kind, payload = {}) => set({ isOpen: true, kind, payload }),
  closeDialog: () => set({ isOpen: false, kind: null, payload: null }),

  showPreview: (kind, payload, coords) =>
    set({
      preview: { isOpen: true, kind, payload, coords },
    }),
  hidePreview: () =>
    set({
      preview: { isOpen: false, kind: null, payload: null, coords: undefined },
    }),

  openPeek: (kind, payload) => set({ peek: { isOpen: true, kind, payload } }),
  closePeek: () => set({ peek: { isOpen: false, kind: null, payload: null } }),

  setSpotlight: (kind, matchingId) => set({ spotlight: { active: true, kind, matchingId } }),
  clearSpotlight: () => set({ spotlight: { active: false, kind: null, matchingId: null } }),

  pushHistory: (item) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(item);
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  goBack: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({ historyIndex: newIndex });
      return state.history[newIndex];
    }
    return null;
  },

  goForward: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({ historyIndex: newIndex });
      return state.history[newIndex];
    }
    return null;
  },

  canGoBack: () => get().historyIndex > 0,
  canGoForward: () => get().historyIndex < get().history.length - 1,

  toggleCompareMode: () =>
    set((state) => ({ compareMode: !state.compareMode })),

  addToCompare: (kind, payload) =>
    set((state) => {
      if (state.compareItems.length >= 4) return state;
      if (state.compareItems.some((item) => item.kind !== kind)) return state;
      return { compareItems: [...state.compareItems, { kind, payload }] };
    }),

  removeFromCompare: (index) =>
    set((state) => ({
      compareItems: state.compareItems.filter((_, i) => i !== index),
    })),

  clearCompare: () => set({ compareItems: [], compareMode: false }),






}));
