export type DrillKind = 'revenue' | 'product' | 'company' | 'order' | 'maintenance' | 'inventory' | 'customer';

export type DrillMode = 'page' | 'dialog';

// Define specific payloads for each kind
export interface DrillPayloadMap {
  revenue: {
    value?: string;
    granularity?: 'day' | 'week' | 'month' | 'year';
    amount?: number;
    [key: string]: any;
  };
  product: {
    id: string;
    name?: string;
    stock?: number;
    [key: string]: any;
  };
  company: {
    id: string;
    name?: string;
    status?: string;
    [key: string]: any;
  };
  order: {
    id: string;
    total?: number;
    [key: string]: any;
  };
  maintenance: {
    id?: string;
    [key: string]: any;
  };
  inventory: {
    id?: string;
    [key: string]: any;
  };
  customer: {
    id?: string;
    [key: string]: any;
  };
}

// Generic payload type for backward compatibility or loose usage
export type BaseDrillPayload = {
  [key: string]: any;
};

// Helper type to get payload for a specific kind
export type DrillPayload<K extends DrillKind = DrillKind> = K extends keyof DrillPayloadMap ? DrillPayloadMap[K] : BaseDrillPayload;

export interface DrillPreviewState {
  isOpen: boolean;
  kind: DrillKind | null;
  payload: DrillPayload | null;
  coords?: { x: number; y: number };
}

export interface DrillContextType {
  kind: DrillKind | null;
  payload: DrillPayload | null;
  isOpen: boolean;
}
