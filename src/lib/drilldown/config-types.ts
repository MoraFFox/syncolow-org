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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchPreviewData?: (payload: DrillPayload<K>) => Promise<any>;
  renderLoadingPreview?: (options?: { isMobile?: boolean }) => React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderAsyncPreview?: (payload: DrillPayload<K>, data: any, options?: { isMobile?: boolean }) => React.ReactNode;

  // Quick actions in preview
  quickActions?: (payload: DrillPayload<K>) => QuickAction[];

  // Related entities
  getRelatedEntities?: (payload: DrillPayload<K>) => Promise<RelatedEntity[]>;
}
