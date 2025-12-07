"use client";

import React from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import { MainNav } from './main-nav';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';
import { NotificationCenter } from './notification-center';
import { SearchDialog } from './app-shell-search';
import { QuickAddMenu } from './app-shell-quick-add';
import { SyncStatusIndicator } from './sync-status-indicator';
import { PendingOperationsBadge } from './pending-operations-badge';
import { ConflictNotificationBadge } from './conflict-notification-badge';
import { ToastContainer } from '@/components/ui/toast-notification';

interface AppShellDesktopLayoutProps {
  children: React.ReactNode;
  user: any;
  toastQueue: any[];
  removeToastNotification: (id: string) => void;
  handleToastView: (notification: any) => void;
  setIsWizardOpen: (open: boolean) => void;
  setIsOrderFormOpen: (open: boolean) => void;
  setIsProductFormOpen: (open: boolean) => void;
  setIsMaintenanceFormOpen: (open: boolean) => void;
}

export function AppShellDesktopLayout({
  children,
  user,
  toastQueue,
  removeToastNotification,
  handleToastView,
  setIsWizardOpen,
  setIsOrderFormOpen,
  setIsProductFormOpen,
  setIsMaintenanceFormOpen,
}: AppShellDesktopLayoutProps) {
  return (
    <>
      <ToastContainer
        notifications={toastQueue}
        onClose={removeToastNotification}
        onView={handleToastView}
      />
      <SidebarProvider>
        <Sidebar collapsible='icon'>
          <SidebarHeader className='p-4'>
            <Link
              href='/'
              className='flex items-center gap-2 group-data-[collapsible=icon]:justify-center'
            >
              <Icons.logo className='w-8 h-8 text-primary shrink-0' />
              <span className='text-xl font-semibold text-foreground group-data-[collapsible=icon]:hidden'>
                SynergyFlow
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className='sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur-sm'>
            <div className='flex items-center gap-2'>
              <SidebarTrigger className='md:hidden' />
              <SidebarTrigger className='hidden md:flex' />
              <SearchDialog />
            </div>
            <div className='flex items-center gap-2'>
              <SyncStatusIndicator />
              <PendingOperationsBadge />
              <ConflictNotificationBadge />
              <QuickAddMenu
                onClientClick={() => setIsWizardOpen(true)}
                onOrderClick={() => setIsOrderFormOpen(true)}
                onProductClick={() => setIsProductFormOpen(true)}
                onMaintenanceClick={() => setIsMaintenanceFormOpen(true)}
              />
              <ThemeToggle />
              <NotificationCenter />
              {user && <UserNav />}
            </div>
          </header>

          <main className='w-auto flex-1 p-6 md:p-8 overflow-y-auto overflow-x-hidden page-fade-in'>
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
