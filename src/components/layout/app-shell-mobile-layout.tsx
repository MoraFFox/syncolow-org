"use client";

import React from 'react';
import Link from 'next/link';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import { NotificationCenter } from './notification-center';
import { SearchDialog } from './app-shell-search';
import { BottomNav } from './app-shell-mobile';
import { SpeedDialFab } from './speed-dial-fab';
import { SyncStatusIndicator } from './sync-status-indicator';
import { PendingOperationsBadge } from './pending-operations-badge';
import { ConflictNotificationBadge } from './conflict-notification-badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { MainNav } from './main-nav';

interface AppShellMobileLayoutProps {
  children: React.ReactNode;
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: (open: boolean) => void;
  setIsWizardOpen: (open: boolean) => void;
  setIsOrderFormOpen: (open: boolean) => void;
  setIsProductFormOpen: (open: boolean) => void;
  setIsMaintenanceFormOpen: (open: boolean) => void;
}

export function AppShellMobileLayout({
  children,
  isMoreMenuOpen,
  setIsMoreMenuOpen,
  setIsWizardOpen,
  setIsOrderFormOpen,
  setIsProductFormOpen,
  setIsMaintenanceFormOpen,
}: AppShellMobileLayoutProps) {
  return (
    <SidebarProvider>
      <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
        <SheetContent side='bottom' className='h-[80vh] flex flex-col p-0'>
          <SheetHeader className='p-4 border-b'>
            <SheetTitle>All Navigation</SheetTitle>
          </SheetHeader>
          <div
            className='flex-1 overflow-y-auto'
            onClick={() => setIsMoreMenuOpen(false)}
          >
            <MainNav />
          </div>
        </SheetContent>
      </Sheet>

      <div className='relative flex h-screen w-full flex-col'>
        <header className='sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b bg-background'>
          <div className='flex items-center gap-4'>
            <Link href='/' className='flex items-center gap-2 font-semibold'>
              <Icons.logo className='w-6 h-6' />
            </Link>
            <ThemeToggle />
          </div>
          <div className='flex items-center gap-2'>
            <SyncStatusIndicator />
            <PendingOperationsBadge />
            <ConflictNotificationBadge />
            <SearchDialog />
            <NotificationCenter />
            <UserNav />
          </div>
        </header>
        <main className='flex-1 overflow-y-auto p-6 page-fade-in pb-20'>
          {children}
        </main>
        <SpeedDialFab
          onClientClick={() => setIsWizardOpen(true)}
          onOrderClick={() => setIsOrderFormOpen(true)}
          onProductClick={() => setIsProductFormOpen(true)}
          onMaintenanceClick={() => setIsMaintenanceFormOpen(true)}
        />
        <BottomNav onMoreClick={() => setIsMoreMenuOpen(true)} />
      </div>
    </SidebarProvider>
  );
}
