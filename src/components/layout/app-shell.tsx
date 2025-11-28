
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar';
import { MainNav } from './main-nav';
import { Icons } from '@/components/icons';
import { Building, LayoutDashboard, Loader2, MoreHorizontal, Package, Search, ShoppingCart, Star, Wrench, Plus, FileText, FileBarChart, Users, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';
import { useOrderStore } from '@/store/use-order-store';
import { useNotificationStore } from '@/store/use-notification-store';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';
import { NotificationCenter } from './notification-center';
import { useGlobalSearch, SearchResult } from '@/lib/search';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type { FuseResultMatch } from 'fuse.js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import type { Product, MaintenanceVisit } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar } from '../ui/sidebar';
import { CompanyWizardForm } from '@/app/clients/_components/company-wizard-form';
import OrderForm from '@/app/orders/_components/order-form';
import { ProductForm } from '@/app/products/_components/product-form';
import { ScheduleVisitForm } from '@/app/maintenance/_components/schedule-visit-form';
import { SpeedDialFab } from './speed-dial-fab';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useCompanyStore } from '@/store/use-company-store';
import { useSettingsStore } from '@/store/use-settings-store';
import { useTasksSync } from '@/hooks/use-tasks-sync';
import { generateNotifications } from '@/lib/notification-generator';
import { ToastContainer } from '@/components/ui/toast-notification';
import { OfflineBanner } from './offline-banner';
import { SyncStatusIndicator } from './sync-status-indicator';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { PendingOperationsBadge } from './pending-operations-badge';
import { ConflictNotificationBadge } from './conflict-notification-badge';
import { useServiceWorker } from '@/hooks/use-service-worker';



type AddProductData = Omit<Product, 'id' | 'imageUrl'> & { image?: File };

const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/feedback/submit'];

function highlight(text: string, matches: readonly FuseResultMatch[] | undefined, key: string) {
    if (!matches || !text) return <span>{text}</span>;
  
    const relevantMatch = matches.find(m => m.key === key);
    if (!relevantMatch || !relevantMatch.indices) return <span>{text}</span>;
    
    const result: (JSX.Element | string)[] = [];
    let lastIndex = 0;
    
    relevantMatch.indices.forEach(([start, end]: readonly [number, number], i: React.Key) => {
      if (start > lastIndex) {
        result.push(text.substring(lastIndex, start));
      }
      result.push(<mark key={i} className="bg-transparent text-primary font-semibold p-0">{text.substring(start, end + 1)}</mark>);
      lastIndex = end + 1;
    });
  
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }
  
    return <span>{result}</span>;
}


function SearchDialog() {
    const [query, setQuery] = useState('');
    const searchResults = useGlobalSearch(query);

    const getCategoryIcon = (type: SearchResult['type']) => {
        switch (type) {
          case 'client': return <Building className="h-4 w-4 text-muted-foreground" />;
          case 'product': return <Package className="h-4 w-4 text-muted-foreground" />;
          case 'order': return <ShoppingCart className="h-4 w-4 text-muted-foreground" />;
          case 'maintenance': return <Wrench className="h-4 w-4 text-muted-foreground" />;
          case 'feedback': return <Star className="h-4 w-4 text-muted-foreground" />;
        }
    };
    
    const getLink = (item: SearchResult) => {
        switch (item.type) {
            case 'client': return `/clients/${item.id}`;
            case 'product': return `/products/${item.id}`;
            case 'order': return `/orders/${item.id}`;
            case 'maintenance': return `/maintenance`; // Simplification
            case 'feedback': return `/feedback`;
            default: return '#';
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full max-w-sm justify-start text-muted-foreground">
                    <Search className="h-4 w-4 mr-2"/>
                    <span>Search...</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Global Search</DialogTitle>
                </DialogHeader>
                <Input
                    placeholder="Search for clients, products, orders..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="mt-4 max-h-96 overflow-y-auto">
                    {searchResults.map((result) => (
                        <Link key={`${result.type}-${result.id}`} href={getLink(result)}>
                            <div className="p-3 hover:bg-muted rounded-md flex items-center gap-3 cursor-pointer">
                                {getCategoryIcon(result.type)}
                                <div>
                                    <span className="font-medium text-sm">{highlight(result.title, result.matches, 'name') || highlight(result.title, result.matches, 'title') || highlight(result.title, result.matches, 'id')}</span>
                                    <p className="text-xs text-muted-foreground capitalize">{result.type}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function QuickAddMenu({ onClientClick, onOrderClick, onProductClick, onMaintenanceClick }: {
    onClientClick: () => void;
    onOrderClick: () => void;
    onProductClick: () => void;
    onMaintenanceClick: () => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Plus className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onClientClick}>
                    <Building className="mr-2 h-4 w-4" />
                    <span>New Company</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOrderClick}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    <span>New Order</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onProductClick}>
                    <Package className="mr-2 h-4 w-4" />
                    <span>New Product</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={onMaintenanceClick}>
                    <Wrench className="mr-2 h-4 w-4" />
                    <span>New Maintenance</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const BottomNavItem = ({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: React.ElementType; isActive: boolean }) => (
  <Link href={href} className={cn("flex flex-col items-center justify-center gap-1 w-full h-full text-xs transition-colors", isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary')}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
  </Link>
);


function BottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-20 md:hidden">
      <div className="flex items-stretch justify-around h-full">
        {navItems.map(item => (
          <BottomNavItem key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
        ))}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-1 w-full h-full text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

// Notification computation hook with Firestore sync
function useNotificationComputation(userId: string | undefined) {
    const { orders, products } = useOrderStore();
    const { companies, feedback } = useCompanyStore();
    const { maintenanceVisits } = useMaintenanceStore();
    const { notificationSettings } = useSettingsStore();
    const { subscribeToNotifications, setNotifications, notifications, toastQueue, removeToastNotification, markAsRead, autoMarkAsReadByPath, cleanupOldNotifications, mergeDuplicates } = useNotificationStore();
    const router = useRouter();
    const pathname = usePathname();

    // Subscribe to real-time notifications from Firestore
    useEffect(() => {
        if (!userId) return;
        
        const unsubscribe = subscribeToNotifications(userId);
        return () => unsubscribe();
    }, [userId, subscribeToNotifications]);

    // Generate notifications locally if Firestore is empty
    useEffect(() => {
        if (orders.length && products.length && companies.length && userId && notifications.length === 0) {
            const newNotifications = generateNotifications({
                orders,
                products,
                companies,
                maintenanceVisits,
                feedback,
                settings: notificationSettings,
            });
            
            const notificationsWithUser = newNotifications.map(n => ({ ...n, userId }));
            setNotifications(notificationsWithUser);
        }
    }, [orders, products, companies, maintenanceVisits, feedback, notificationSettings, setNotifications, userId, notifications.length]);

    const handleToastView = (notification: any) => {
        markAsRead(notification.id);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    // Auto-mark as read when visiting related pages
    useEffect(() => {
        if (pathname && userId) {
            autoMarkAsReadByPath(pathname);
        }
    }, [pathname, userId, autoMarkAsReadByPath]);

    useEffect(() => {
        if (userId) {
            const interval = setInterval(() => {
                cleanupOldNotifications();
                mergeDuplicates();
            }, 24 * 60 * 60 * 1000); // 24 hours
            
            return () => clearInterval(interval);
        }
    }, [userId, cleanupOldNotifications, mergeDuplicates]);

    return { toastQueue, removeToastNotification, handleToastView };
}


export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { fetchInitialData, fetchOrders, addProduct } = useOrderStore();
  const { addMaintenanceVisit } = useMaintenanceStore();

  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isMaintenanceFormOpen, setIsMaintenanceFormOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Background services
  useTasksSync(true); // Enable background tasks sync

  useEffect(() => {
    if (!authLoading) {
      if(user && isPublicRoute && pathname !== '/feedback/submit') {
        router.push('/dashboard');
      }
      if (!user && !isPublicRoute) {
        router.push('/login');
      }
    }
  }, [authLoading, user, router, pathname, isPublicRoute]);

  useEffect(() => {
    if (user) {
        fetchInitialData();
        fetchOrders(50);
        
        // Preload cache in background
        import('@/lib/cache-manager').then(({ cacheManager }) => {
          cacheManager.preloadAll().catch(console.error);
        });
    }
  }, [user, fetchInitialData, fetchOrders]);
  
  const { toastQueue, removeToastNotification, handleToastView } = useNotificationComputation(user?.id);
  
  // Initialize offline queue
  useOfflineQueue();
  
  // Initialize service worker
  useServiceWorker();

  const handleAddProduct = async (data: AddProductData) => {
    await addProduct(data);
    setIsProductFormOpen(false);
  };
  
  const handleAddMaintenance = async (data: Omit<MaintenanceVisit, 'id'>) => {
      await addMaintenanceVisit(data);
      setIsMaintenanceFormOpen(false);
  }

  if (authLoading || (!user && !isPublicRoute)) {
      return (
          <div className="flex items-center justify-center h-screen">
              <Loader2 className="h-12 w-12 animate-spin" />
          </div>
      )
  }
  
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isMobile) {
    return (
        <SidebarProvider>
            <OfflineBanner />
            {isWizardOpen && <CompanyWizardForm isOpen={isWizardOpen} onOpenChange={setIsWizardOpen} />}
            {isOrderFormOpen && <OrderForm isOpen={isOrderFormOpen} onOpenChange={setIsOrderFormOpen} />}
            {isProductFormOpen && <ProductForm isOpen={isProductFormOpen} onOpenChange={setIsProductFormOpen} onSubmit={handleAddProduct} />}
            {isMaintenanceFormOpen && <ScheduleVisitForm isOpen={isMaintenanceFormOpen} onOpenChange={setIsMaintenanceFormOpen} onFormSubmit={handleAddMaintenance} />}

            <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
              <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
                  <SheetHeader className="p-4 border-b">
                      <SheetTitle>All Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto" onClick={() => setIsMoreMenuOpen(false)}>
                      <MainNav />
                  </div>
              </SheetContent>
            </Sheet>
            
            <div className="relative flex h-screen w-full flex-col">
                 <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b bg-background">
                    <div className="flex items-center gap-4">
                      <Link href="/" className="flex items-center gap-2 font-semibold">
                          <Icons.logo className="w-6 h-6" />
                      </Link>
                      <ThemeToggle />
                    </div>
                    <div className="flex items-center gap-2">
                      <SyncStatusIndicator />
                      <PendingOperationsBadge />
                      <ConflictNotificationBadge />
                      <SearchDialog />
                      <NotificationCenter />
                      <UserNav />
                    </div>
                 </header>
                 <main className="flex-1 overflow-y-auto p-6 page-fade-in pb-20">
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


  return (
    <>
      <OfflineBanner />
      <ToastContainer 
        notifications={toastQueue} 
        onClose={removeToastNotification}
        onView={handleToastView}
      />
      {isWizardOpen && <CompanyWizardForm isOpen={isWizardOpen} onOpenChange={setIsWizardOpen} />}
      {isOrderFormOpen && <OrderForm isOpen={isOrderFormOpen} onOpenChange={setIsOrderFormOpen} />}
      {isProductFormOpen && <ProductForm isOpen={isProductFormOpen} onOpenChange={setIsProductFormOpen} onSubmit={handleAddProduct} />}
      {isMaintenanceFormOpen && <ScheduleVisitForm isOpen={isMaintenanceFormOpen} onOpenChange={setIsMaintenanceFormOpen} onFormSubmit={handleAddMaintenance} />}
      
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <Icons.logo className="w-8 h-8 text-primary shrink-0" />
              <span className="text-xl font-semibold text-foreground group-data-[collapsible=icon]:hidden">SynergyFlow</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <SidebarTrigger className="hidden md:flex" />
              <SearchDialog />
            </div>
            <div className="flex items-center gap-2">
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
          
          <main className="w-auto flex-1 p-6 md:p-8 overflow-y-auto overflow-x-hidden page-fade-in">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
