"use client";
/** @format */

import { useEffect } from "react";
import { useDrillDownStore } from "@/store/use-drilldown-store";

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
  const { loadSettings, loadOnboardingState } = useDrillDownStore();

  useEffect(() => {
    loadSettings();
    loadOnboardingState();
  }, [loadSettings, loadOnboardingState]);

  return null; // This component doesn't render anything
}
