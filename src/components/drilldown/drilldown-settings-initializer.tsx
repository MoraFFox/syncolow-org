"use client";
/** @format */

import { useEffect } from "react";
import { useDrillSettings } from "@/store/use-drill-settings";
import { useDrillUserData } from "@/store/use-drill-user-data";

/**
 * DrilldownSettingsInitializer
 *
 * Loads user's drilldown preferences and onboarding state from localStorage on app mount.
 * This ensures settings (hover delay, preview toggle, visual style) and onboarding progress
 * persist across sessions.
 *
 * Should be rendered once in root layout.
 */
export function DrilldownSettingsInitializer() {
  const { settings } = useDrillSettings();

  // Migration for old local storage keys
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Migrate Onboarding
      const oldOnboarding = localStorage.getItem("drill-onboarding");
      if (oldOnboarding && !localStorage.getItem("drill-user-data")) {
        try {
          const parsed = JSON.parse(oldOnboarding);
          useDrillUserData.setState({ onboarding: parsed });
        } catch (e) {
          console.error("Failed to migrate drill onboarding", e);
        }
      }

      // Migrate Bookmarks
      const oldBookmarks = localStorage.getItem("drill-bookmarks");
      if (oldBookmarks) {
        try {
          const parsed = JSON.parse(oldBookmarks);
          // Only if new store is empty? Or merge? simple set for now as migration
          if (useDrillUserData.getState().bookmarks.length === 0) {
            useDrillUserData.setState({ bookmarks: parsed });
          }
        } catch (e) { }
      }

      // Migrate Pinned
      const oldPinned = localStorage.getItem("drill-pinned");
      if (oldPinned) {
        try {
          const parsed = JSON.parse(oldPinned);
          if (useDrillUserData.getState().pinnedPreviews.length === 0) {
            useDrillUserData.setState({ pinnedPreviews: parsed });
          }
        } catch (e) { }
      }
    }
  }, []);

  // Sync debug indicator class to body
  useEffect(() => {
    if (settings.showHitAreaIndicator) {
      document.body.classList.add('show-drill-hit-areas');
    } else {
      document.body.classList.remove('show-drill-hit-areas');
    }
  }, [settings.showHitAreaIndicator]);

  return null; // This component doesn't render anything
}
