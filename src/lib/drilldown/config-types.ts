import React from "react";
import { DrillKind, DrillPayload } from "../drilldown-types";

export interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: "default" | "destructive";
}

export interface RelatedEntity {
  kind: DrillKind;
  payload: DrillPayload;
  label: string;
  relationship: string;
}

export interface DrillConfig<K extends DrillKind> {
  getRoute: (payload: DrillPayload<K>) => string | null;
  renderPreview: (payload: DrillPayload<K>, options?: { isMobile?: boolean }) => React.ReactNode;

  // Optional async preview data fetching
  fetchPreviewData?: (payload: DrillPayload<K>) => Promise<unknown>;
  renderLoadingPreview?: (options?: { isMobile?: boolean }) => React.ReactNode;
  renderAsyncPreview?: (payload: DrillPayload<K>, data: unknown, options?: { isMobile?: boolean }) => React.ReactNode;

  // Quick actions in preview
  quickActions?: (payload: DrillPayload<K>) => QuickAction[];

  // Related entities
  getRelatedEntities?: (payload: DrillPayload<K>) => Promise<RelatedEntity[]>;
}
