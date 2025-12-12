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

// Shared options type for preview rendering functions
export interface PreviewRenderOptions {
  isMobile?: boolean;
  isCompact?: boolean;
  isExpanded?: boolean;
}

// Use a looser type for async preview functions to allow typed data parameters
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncPreviewFunction<K extends DrillKind> = (
  payload: DrillPayload<K>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  options?: PreviewRenderOptions
) => React.ReactNode;

export interface DrillConfig<K extends DrillKind> {
  getRoute: (payload: DrillPayload<K>) => string | null;
  renderPreview: (payload: DrillPayload<K>, options?: PreviewRenderOptions) => React.ReactNode;

  // Optional async preview data fetching
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchPreviewData?: (payload: DrillPayload<K>) => Promise<any>;
  renderLoadingPreview?: (options?: PreviewRenderOptions) => React.ReactNode;
  renderAsyncPreview?: AsyncPreviewFunction<K>;

  // Quick actions in preview
  quickActions?: (payload: DrillPayload<K>) => QuickAction[];

  // Related entities
  getRelatedEntities?: (payload: DrillPayload<K>) => Promise<RelatedEntity[]>;
}
