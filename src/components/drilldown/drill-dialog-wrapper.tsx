'use client';

import dynamic from 'next/dynamic';
import { useDrillDownStore } from '@/store/use-drilldown-store';
import { DrillKind } from '@/lib/drilldown-types';
import * as React from 'react';

// Lazy load dialogs
const RevenueDeepDiveDialog = dynamic(
  () => import('@/app/analytics/_components/revenue-deep-dive-dialog').then((mod) => mod.RevenueDeepDiveDialog),
  { ssr: false }
);

const InventoryDetailDialog = dynamic(
  () => import('@/components/dialogs/inventory-detail-dialog').then((mod) => mod.InventoryDetailDialog),
  { ssr: false }
);

const MaintenanceDetailDialog = dynamic(
  () => import('@/components/dialogs/maintenance-detail-dialog').then((mod) => mod.MaintenanceDetailDialog),
  { ssr: false }
);

const CustomerDetailDialog = dynamic(
  () => import('@/components/dialogs/customer-detail-dialog').then((mod) => mod.CustomerDetailDialog),
  { ssr: false }
);

// Dialog Registry for the wrapper
const DIALOG_REGISTRY: Partial<Record<DrillKind, React.ComponentType<any>>> = {
  revenue: RevenueDeepDiveDialog,
  inventory: InventoryDetailDialog,
  maintenance: MaintenanceDetailDialog,
  customer: CustomerDetailDialog,
};

export function DrillDialogWrapper() {
  const { isOpen, kind, closeDialog } = useDrillDownStore();

  if (!isOpen || !kind) return null;

  const DialogComponent = DIALOG_REGISTRY[kind];

  if (!DialogComponent) return null;

  return (
    <DialogComponent
      isOpen={isOpen}
      onOpenChange={(open: boolean) => !open && closeDialog()}
    />
  );
}
