/** @format */

import { create } from "zustand";
import { DrillKind, DrillPayload } from "@/lib/drilldown-types";
import { logger } from '@/lib/logger';

export interface DrillHistoryItem {
  kind: DrillKind;
  payload: DrillPayload;
  timestamp: number;
  route: string;
}

export interface DrilldownSettings {
  hoverDelay: number;
  previewsEnabled: boolean;
  visualStyle: "subtle" | "normal" | "prominent";
  quietMode: boolean; // Disables auto-pin
  previewSize: "compact" | "normal" | "expanded";
  previewTheme: "default" | "glass" | "solid";
  // Enhanced Hit Area Settings
  expandedHitArea: boolean;
  hitAreaPadding: number;
  proximityThreshold: number;
  showHitAreaIndicator: boolean;
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

  // Bookmarks State
  bookmarks: Array<{
    id: string;
    label: string;
    kind: DrillKind;
    payload: DrillPayload;
    createdAt: number;
  }>;

  // Pinned Previews State
  pinnedPreviews: Array<{
    id: string;
    kind: DrillKind;
    payload: DrillPayload;
    position: { x: number; y: number };
  }>;

  // Peek State
  peek: {
    isOpen: boolean;
    kind: DrillKind | null;
    payload: DrillPayload | null;
  };

  // Settings State
  settings: DrilldownSettings;

  // Onboarding State
  hasSeenOnboarding: boolean;
  hasSeenFirstInteractionHint: boolean;
  completedTourSteps: string[];
  tourDismissedAt: number | null;

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

  // Bookmark Actions
  addBookmark: (label: string, kind: DrillKind, payload: DrillPayload) => void;
  removeBookmark: (id: string) => void;
  loadBookmarks: () => void;

  // Pinned Preview Actions
  pinPreview: (kind: DrillKind, payload: DrillPayload) => void;
  unpinPreview: (id: string) => void;
  loadPinnedPreviews: () => void;

  // Settings Actions
  setHoverDelay: (delay: number) => void;
  togglePreviews: () => void;
  setVisualStyle: (style: "subtle" | "normal" | "prominent") => void;
  toggleQuietMode: () => void;
  setPreviewSize: (size: "compact" | "normal" | "expanded") => void;
  setPreviewTheme: (theme: "default" | "glass" | "solid") => void;
  loadSettings: () => void;
  // Enhanced Hit Area Actions
  toggleExpandedHitArea: () => void;
  setHitAreaPadding: (padding: number) => void;
  setProximityThreshold: (threshold: number) => void;
  toggleHitAreaIndicator: () => void;

  // Onboarding Actions
  markOnboardingComplete: () => void;
  markFirstInteractionHintSeen: () => void;
  markTourStepComplete: (stepId: string) => void;
  dismissTour: () => void;
  resetOnboarding: () => void;
  loadOnboardingState: () => void;
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

  // History State
  history: [],
  historyIndex: -1,

  // Compare State
  compareMode: false,
  compareItems: [],

  // Bookmarks State
  bookmarks: [],

  // Pinned Previews State
  pinnedPreviews: [],

  // Settings State
  settings: {
    hoverDelay: 500,
    previewsEnabled: false,
    visualStyle: "normal",
    quietMode: false,
    previewSize: "normal",
    previewTheme: "default",
    // Enhanced Hit Area Defaults
    expandedHitArea: true,
    hitAreaPadding: 8,
    proximityThreshold: 16,
    showHitAreaIndicator: false,
  },

  // Onboarding State
  hasSeenOnboarding: false,
  hasSeenFirstInteractionHint: false,
  completedTourSteps: [],
  tourDismissedAt: null,

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

  addBookmark: (label, kind, payload) =>
    set((state) => {
      const bookmark = {
        id: `${Date.now()}-${Math.random()}`,
        label,
        kind,
        payload,
        createdAt: Date.now(),
      };
      const newBookmarks = [...state.bookmarks, bookmark];
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-bookmarks", JSON.stringify(newBookmarks));
      }
      return { bookmarks: newBookmarks };
    }),

  removeBookmark: (id) =>
    set((state) => {
      const newBookmarks = state.bookmarks.filter((b) => b.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-bookmarks", JSON.stringify(newBookmarks));
      }
      return { bookmarks: newBookmarks };
    }),

  loadBookmarks: () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("drill-bookmarks");
        if (stored) set({ bookmarks: JSON.parse(stored) });
      } catch (e) {
        logger.error(e, { component: 'useDrillDownStore', action: 'loadBookmarks' });
      }
    }
  },

  pinPreview: (kind, payload) =>
    set((state) => {
      if (state.pinnedPreviews.length >= 3) return state;
      const coords = state.preview.coords || { x: 100, y: 100 };
      const pinned = {
        id: `${Date.now()}-${Math.random()}`,
        kind,
        payload,
        position: coords,
      };
      const newPinned = [...state.pinnedPreviews, pinned];
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-pinned", JSON.stringify(newPinned));
      }
      return { pinnedPreviews: newPinned };
    }),

  unpinPreview: (id) =>
    set((state) => {
      const newPinned = state.pinnedPreviews.filter((p) => p.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-pinned", JSON.stringify(newPinned));
      }
      return { pinnedPreviews: newPinned };
    }),

  loadPinnedPreviews: () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("drill-pinned");
        if (stored) set({ pinnedPreviews: JSON.parse(stored) });
      } catch (e) {
        logger.error(e, { component: 'useDrillDownStore', action: 'loadPinnedPreviews' });
      }
    }
  },

  // Settings Actions
  setHoverDelay: (delay) =>
    set((state) => {
      const newSettings = { ...state.settings, hoverDelay: delay };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  togglePreviews: () =>
    set((state) => {
      const newSettings = {
        ...state.settings,
        previewsEnabled: !state.settings.previewsEnabled,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  setVisualStyle: (style) =>
    set((state) => {
      const newSettings = { ...state.settings, visualStyle: style };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  toggleQuietMode: () =>
    set((state) => {
      const newSettings = {
        ...state.settings,
        quietMode: !state.settings.quietMode,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  setPreviewSize: (size) =>
    set((state) => {
      const newSettings = { ...state.settings, previewSize: size };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  setPreviewTheme: (theme) =>
    set((state) => {
      const newSettings = { ...state.settings, previewTheme: theme };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  loadSettings: () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("drill-settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          set((state) => ({ settings: { ...state.settings, ...parsed } }));
        }
      } catch (e) {
        logger.error(e, { component: 'useDrillDownStore', action: 'loadSettings' });
      }
    }
  },

  // Enhanced Hit Area Actions
  toggleExpandedHitArea: () =>
    set((state) => {
      const newSettings = {
        ...state.settings,
        expandedHitArea: !state.settings.expandedHitArea,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  setHitAreaPadding: (padding) =>
    set((state) => {
      const newSettings = { ...state.settings, hitAreaPadding: padding };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  setProximityThreshold: (threshold) =>
    set((state) => {
      const newSettings = { ...state.settings, proximityThreshold: threshold };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  toggleHitAreaIndicator: () =>
    set((state) => {
      const newSettings = {
        ...state.settings,
        showHitAreaIndicator: !state.settings.showHitAreaIndicator,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("drill-settings", JSON.stringify(newSettings));
      }
      return { settings: newSettings };
    }),

  // Onboarding Actions
  markOnboardingComplete: () =>
    set((state) => {
      const newState = { ...state, hasSeenOnboarding: true };
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "drill-onboarding",
          JSON.stringify({
            hasSeenOnboarding: newState.hasSeenOnboarding,
            hasSeenFirstInteractionHint: newState.hasSeenFirstInteractionHint,
            completedTourSteps: newState.completedTourSteps,
            tourDismissedAt: newState.tourDismissedAt,
          })
        );
      }
      return newState;
    }),

  markFirstInteractionHintSeen: () =>
    set((state) => {
      const newState = { ...state, hasSeenFirstInteractionHint: true };
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "drill-onboarding",
          JSON.stringify({
            hasSeenOnboarding: newState.hasSeenOnboarding,
            hasSeenFirstInteractionHint: newState.hasSeenFirstInteractionHint,
            completedTourSteps: newState.completedTourSteps,
            tourDismissedAt: newState.tourDismissedAt,
          })
        );
      }
      return newState;
    }),

  markTourStepComplete: (stepId) =>
    set((state) => {
      const newCompletedSteps = [...state.completedTourSteps];
      if (!newCompletedSteps.includes(stepId)) {
        newCompletedSteps.push(stepId);
      }
      const newState = { ...state, completedTourSteps: newCompletedSteps };
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "drill-onboarding",
          JSON.stringify({
            hasSeenOnboarding: newState.hasSeenOnboarding,
            hasSeenFirstInteractionHint: newState.hasSeenFirstInteractionHint,
            completedTourSteps: newState.completedTourSteps,
            tourDismissedAt: newState.tourDismissedAt,
          })
        );
      }
      return newState;
    }),

  dismissTour: () =>
    set((state) => {
      const newState = { ...state, tourDismissedAt: Date.now() };
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "drill-onboarding",
          JSON.stringify({
            hasSeenOnboarding: newState.hasSeenOnboarding,
            hasSeenFirstInteractionHint: newState.hasSeenFirstInteractionHint,
            completedTourSteps: newState.completedTourSteps,
            tourDismissedAt: newState.tourDismissedAt,
          })
        );
      }
      return newState;
    }),

  resetOnboarding: () =>
    set((state) => {
      const newState = {
        ...state,
        hasSeenOnboarding: false,
        hasSeenFirstInteractionHint: false,
        completedTourSteps: [],
        tourDismissedAt: null,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "drill-onboarding",
          JSON.stringify({
            hasSeenOnboarding: newState.hasSeenOnboarding,
            hasSeenFirstInteractionHint: newState.hasSeenFirstInteractionHint,
            completedTourSteps: newState.completedTourSteps,
            tourDismissedAt: newState.tourDismissedAt,
          })
        );
      }
      return newState;
    }),

  loadOnboardingState: () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("drill-onboarding");
        if (stored) {
          const parsed = JSON.parse(stored);
          set((state) => ({
            hasSeenOnboarding:
              parsed.hasSeenOnboarding ?? state.hasSeenOnboarding,
            hasSeenFirstInteractionHint:
              parsed.hasSeenFirstInteractionHint ??
              state.hasSeenFirstInteractionHint,
            completedTourSteps:
              parsed.completedTourSteps ?? state.completedTourSteps,
            tourDismissedAt: parsed.tourDismissedAt ?? state.tourDismissedAt,
          }));
        }
      } catch (e) {
        logger.error(e, { component: 'useDrillDownStore', action: 'loadOnboardingState' });
      }
    }
  },
}));
