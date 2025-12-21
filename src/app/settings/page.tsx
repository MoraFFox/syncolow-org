/** @format */

"use client";

import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import { SettingsSidebar } from "./_components/settings-sidebar";
import { GeneralSettings } from "./_components/general-settings";
import { InterfaceSettings } from "./_components/interface-settings";
import { NotificationsReportsSettings } from "./_components/notifications-reports-settings";
import { AccountingSettings } from "./_components/accounting-settings";
import { SystemSettings } from "./_components/system-settings";
import {
  LayoutDashboard,
  Palette,
  Bell,
  Plug,
  Receipt,
  HardDrive,
  Save,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useSettingsStore } from "@/store/use-settings-store";

const Integrations = lazy(() => import("./_components/integrations").then(m => ({ default: m.Integrations })));

const sidebarItems = [
  { title: "General", value: "general", icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: "Interface", value: "interface", icon: <Palette className="h-4 w-4" /> },
  { title: "Notifications & Reports", value: "notifications", icon: <Bell className="h-4 w-4" /> },
  { title: "Integrations", value: "integrations", icon: <Plug className="h-4 w-4" /> },
  { title: "Accounting", value: "accounting", icon: <Receipt className="h-4 w-4" /> },
  { title: "System", value: "system", icon: <HardDrive className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  // Hooks for saving
  const { saveSettings, settings: dbSettings, isLoading: settingsLoading } = useUserSettings();
  const { viewMode, paginationLimit, ordersViewMode, notificationSettings } = useSettingsStore();

  // Handle universal save
  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      // Collect notification type preferences
      const notificationTypesMap: Record<string, boolean> = {};
      Object.entries(notificationSettings).forEach(([key, value]) => {
        notificationTypesMap[key] = value.enabled;
      });

      await saveSettings({
        view_mode: viewMode,
        pagination_limit: paginationLimit,
        orders_view_mode: ordersViewMode,
        notification_types: notificationTypesMap,
      });
    } finally {
      setIsSaving(false);
    }
  }, [saveSettings, viewMode, paginationLimit, ordersViewMode, notificationSettings]);

  const isDisabled = isSaving || settingsLoading;

  return (
    <div className='flex flex-col gap-8 pb-24'> {/* Added padding for sticky footer */}
      <div>
        <h1 className='text-3xl font-bold'>Settings</h1>
        <p className='text-muted-foreground'>
          Customize application appearance, behavior, and integrations.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/4">
          <SettingsSidebar
            items={sidebarItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </aside>

        <main className="lg:w-3/4">
          <ErrorBoundary>
            {activeTab === "general" && <GeneralSettings />}
            {activeTab === "interface" && <InterfaceSettings />}
            {activeTab === "notifications" && <NotificationsReportsSettings />}
            {activeTab === "accounting" && <AccountingSettings />}
            {activeTab === "system" && <SystemSettings />}
            {activeTab === "integrations" && (
              <Suspense fallback={<Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>}>
                <Integrations />
              </Suspense>
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Sticky Save Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-end gap-4 py-4">
          <p className="text-sm text-muted-foreground mr-auto hidden sm:block">
            Save your settings to persist changes across sessions.
          </p>
          <Button onClick={handleSaveAll} disabled={isDisabled} size="lg">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
