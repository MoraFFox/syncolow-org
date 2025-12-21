/** @format */

import { create } from "zustand";
import { persist } from "zustand/middleware";

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

interface DrillSettingsState {
  settings: DrilldownSettings;
  
  // Actions
  setHoverDelay: (delay: number) => void;
  togglePreviews: () => void;
  setVisualStyle: (style: "subtle" | "normal" | "prominent") => void;
  toggleQuietMode: () => void;
  setPreviewSize: (size: "compact" | "normal" | "expanded") => void;
  setPreviewTheme: (theme: "default" | "glass" | "solid") => void;
  
  // Enhanced Hit Area Actions
  toggleExpandedHitArea: () => void;
  setHitAreaPadding: (padding: number) => void;
  setProximityThreshold: (threshold: number) => void;
  toggleHitAreaIndicator: () => void;

}

const DEFAULT_SETTINGS: DrilldownSettings = {
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

};

export const useDrillSettings = create<DrillSettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      setHoverDelay: (delay) =>
        set((state) => ({ settings: { ...state.settings, hoverDelay: delay } })),

      togglePreviews: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            previewsEnabled: !state.settings.previewsEnabled,
          },
        })),

      setVisualStyle: (style) =>
        set((state) => ({ settings: { ...state.settings, visualStyle: style } })),

      toggleQuietMode: () =>
        set((state) => ({
          settings: { ...state.settings, quietMode: !state.settings.quietMode },
        })),

      setPreviewSize: (size) =>
        set((state) => ({ settings: { ...state.settings, previewSize: size } })),

      setPreviewTheme: (theme) =>
        set((state) => ({ settings: { ...state.settings, previewTheme: theme } })),

      toggleExpandedHitArea: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            expandedHitArea: !state.settings.expandedHitArea,
          },
        })),

      setHitAreaPadding: (padding) =>
        set((state) => ({
          settings: { ...state.settings, hitAreaPadding: padding },
        })),

      setProximityThreshold: (threshold) =>
        set((state) => ({
          settings: { ...state.settings, proximityThreshold: threshold },
        })),

      toggleHitAreaIndicator: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            showHitAreaIndicator: !state.settings.showHitAreaIndicator,
          },
        })),


    }),
    {
      name: "drill-settings",
      // Only persist the settings object
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
