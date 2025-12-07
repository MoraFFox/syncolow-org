"use client";
/** @format */

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useOrderStore } from "@/store/use-order-store";
import type { MaintenanceVisit } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppShellDialogs } from "./app-shell-dialogs";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { useTasksSync } from "@/hooks/use-tasks-sync";
import { OfflineBanner } from "./offline-banner";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { DrilldownOnboardingTour } from "@/components/drilldown/drilldown-onboarding-tour";
import { useDrillDownStore } from "@/store/use-drilldown-store";
import { useNotificationComputation } from "@/hooks/use-notification-computation";
import { useAppShellAuth } from "@/hooks/use-app-shell-auth";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useAppShellData } from "@/hooks/use-app-shell-data";
import { AppShellMobileLayout } from "./app-shell-mobile-layout";
import { AppShellDesktopLayout } from "./app-shell-desktop-layout";



const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/reset-password",
  "/feedback/submit",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { fetchInitialData, fetchOrders, addProduct } = useOrderStore();
  const { addMaintenanceVisit } = useMaintenanceStore();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const { hasSeenOnboarding, tourDismissedAt } = useDrillDownStore();
  const [showTour, setShowTour] = useState(false);

  const dialogState = useDialogState();
  const { shouldShowLoader } = useAppShellAuth(authLoading, user, pathname, isPublicRoute);
  const { toastQueue, removeToastNotification, handleToastView } = useNotificationComputation(user?.id);

  useAppShellData(user, fetchInitialData, fetchOrders);
  useTasksSync(true);
  useOfflineQueue();
  useServiceWorker();

  useEffect(() => {
    if (user && !hasSeenOnboarding && !tourDismissedAt && !isPublicRoute) {
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, hasSeenOnboarding, tourDismissedAt, isPublicRoute]);

  const handleAddProduct = async (data: AddProductData) => {
    await addProduct(data);
    setIsProductFormOpen(false);
  };

  const handleAddMaintenance = async (data: Omit<MaintenanceVisit, "id">) => {
    await addMaintenanceVisit(data);
    setIsMaintenanceFormOpen(false);
  };

  if (shouldShowLoader) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader2 className='h-12 w-12 animate-spin' />
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isMobile) {
    return (
      <>
        <OfflineBanner />
        {showTour && <DrilldownOnboardingTour />}
        <AppShellDialogs
          isWizardOpen={dialogState.isWizardOpen}
          setIsWizardOpen={dialogState.setIsWizardOpen}
          isOrderFormOpen={dialogState.isOrderFormOpen}
          setIsOrderFormOpen={dialogState.setIsOrderFormOpen}
          isProductFormOpen={dialogState.isProductFormOpen}
          setIsProductFormOpen={dialogState.setIsProductFormOpen}
          isMaintenanceFormOpen={dialogState.isMaintenanceFormOpen}
          setIsMaintenanceFormOpen={dialogState.setIsMaintenanceFormOpen}
          handleAddProduct={handleAddProduct}
          handleAddMaintenance={handleAddMaintenance}
        />
        <AppShellMobileLayout
          isMoreMenuOpen={dialogState.isMoreMenuOpen}
          setIsMoreMenuOpen={dialogState.setIsMoreMenuOpen}
          setIsWizardOpen={dialogState.setIsWizardOpen}
          setIsOrderFormOpen={dialogState.setIsOrderFormOpen}
          setIsProductFormOpen={dialogState.setIsProductFormOpen}
          setIsMaintenanceFormOpen={dialogState.setIsMaintenanceFormOpen}
        >
          {children}
        </AppShellMobileLayout>
      </>
    );
  }

  return (
    <>
      <OfflineBanner />
      {showTour && <DrilldownOnboardingTour />}
      <AppShellDialogs
        isWizardOpen={dialogState.isWizardOpen}
        setIsWizardOpen={dialogState.setIsWizardOpen}
        isOrderFormOpen={dialogState.isOrderFormOpen}
        setIsOrderFormOpen={dialogState.setIsOrderFormOpen}
        isProductFormOpen={dialogState.isProductFormOpen}
        setIsProductFormOpen={dialogState.setIsProductFormOpen}
        isMaintenanceFormOpen={dialogState.isMaintenanceFormOpen}
        setIsMaintenanceFormOpen={dialogState.setIsMaintenanceFormOpen}
        handleAddProduct={handleAddProduct}
        handleAddMaintenance={handleAddMaintenance}
      />
      <AppShellDesktopLayout
        user={user}
        toastQueue={toastQueue}
        removeToastNotification={removeToastNotification}
        handleToastView={handleToastView}
        setIsWizardOpen={dialogState.setIsWizardOpen}
        setIsOrderFormOpen={dialogState.setIsOrderFormOpen}
        setIsProductFormOpen={dialogState.setIsProductFormOpen}
        setIsMaintenanceFormOpen={dialogState.setIsMaintenanceFormOpen}
      >
        {children}
      </AppShellDesktopLayout>
    </>
  );
}
