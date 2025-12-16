/** @format */

"use client";

import { lazy, Suspense, useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";

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

  return (
    <div className='flex flex-col gap-8'>
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
    </div>
  );
}
