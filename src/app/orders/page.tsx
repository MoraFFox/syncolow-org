
"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useSearchParams } from 'next/navigation';
import { createRoot } from 'react-dom/client';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { isToday } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Loading from '../loading';
import OrderForm from './_components/order-form';
import type { Order } from '@/lib/types';
import { useSettingsStore } from '@/store/use-settings-store';
import { CsvImporterDialog } from './_components/csv-importer-dialog';
import { toast } from '@/hooks/use-toast';
import { CancellationDialog } from './_components/cancellation-dialog';

import { DailyOrdersReport } from './_components/daily-orders-report';
import { OrderList } from './_components/order-list';
import { OrderActions } from './_components/order-actions';
import { KanbanBoard } from './_components/kanban-board';
import { AdvancedSearchDialog } from './_components/advanced-search-dialog';
import { searchOrders, type OrderSearchFilters } from '@/lib/advanced-search';
import { ErrorBoundary } from '@/components/error-boundary';

function OrdersPageContent() {
  const searchParams = useSearchParams();

  const { orders, loading: storeLoading, ordersLoading, ordersHasMore, fetchOrders, fetchOrdersWithFilters, searchOrdersByText, loadMoreOrders, updateOrderStatus, deleteOrder, deleteAllOrders } = useOrderStore();
  const { companies } = useCompanyStore();
  const { paginationLimit } = useSettingsStore();
  const [viewMode, setLocalViewMode] = useState<'list' | 'kanban'>('list');


  const { loading: authLoading } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showArchived, setShowArchived] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFileType, setImportFileType] = useState<'csv' | 'excel'>('csv');

  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<OrderSearchFilters>({});
  const hasAdvancedFilters = Object.keys(advancedFilters).length > 0;

  const hasActiveSearch = isSearching && searchTerm.trim().length >= 2;
  const canUseServerFilter = !hasActiveSearch && statusFilter !== 'All' && statusFilter !== 'Overdue' && statusFilter !== 'Cancelled';

  useEffect(() => {
    const loadOrders = async () => {
      if (hasAdvancedFilters) {
        await fetchOrders(10000); // Advanced search fetches all locally for now (can be optimized later)
      } else if (canUseServerFilter) {
        const filters: any = { showArchived };
        if (['Pending', 'Processing', 'Shipped', 'Delivered'].includes(statusFilter)) {
          filters.status = statusFilter;
        } else if (['Paid', 'Pending'].includes(statusFilter)) {
          filters.paymentStatus = statusFilter;
        }
        await fetchOrdersWithFilters(paginationLimit, filters);
      } else if (!hasActiveSearch) {
        // Default View: Use filters to enforce Active/Archive logic
        await fetchOrdersWithFilters(paginationLimit, { showArchived });
      }
    };
    loadOrders();
  }, [fetchOrders, fetchOrdersWithFilters, paginationLimit, hasAdvancedFilters, hasActiveSearch, canUseServerFilter, statusFilter, showArchived]);

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (!term.trim() || term.trim().length < 2) {
      setIsSearching(false);
      setIsLoadingSearch(false);
      // Effect will trigger reload
      return;
    }
    setIsLoadingSearch(true);
    setIsSearching(true);
    await searchOrdersByText(term);
    setIsLoadingSearch(false);
  }, 500);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim().length >= 2) {
      setIsLoadingSearch(true);
    }
    debouncedSearch(term);
  };

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'overdue') {
      setStatusFilter('Overdue');
    }
  }, [searchParams]);

  const loading = storeLoading || authLoading;

  const filteredOrders = useMemo(() => {
    let results = orders;

    if (Object.keys(advancedFilters).length > 0) {
      results = searchOrders(results, advancedFilters);
    }

    // Filter by Archive Status (Active vs Archived)
    // Archived = Delivered AND Paid
    results = results.filter(order => {
      const isArchived = order.status === 'Delivered' && order.paymentStatus === 'Paid';
      if (showArchived) return isArchived;
      return !isArchived;
    });

    if (!hasActiveSearch && !canUseServerFilter) {
      results = results.filter(order => {
        if (statusFilter === 'Cancelled') {
          return order.status === 'Cancelled';
        }

        if (order.status === 'Cancelled') {
          return false;
        }

        const statusMatch = statusFilter === 'All'
          || order.status === statusFilter
          || order.paymentStatus === statusFilter;

        return statusMatch;
      });
    }

    return results.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, statusFilter, advancedFilters, hasActiveSearch, canUseServerFilter, showArchived]);

  const handleLoadMore = async () => {
    await loadMoreOrders(paginationLimit);
  };

  const handleBulkUpdate = async (updateFn: (id: string, status: any) => Promise<void>, status: any) => {
    const promises = Array.from(selectedRowKeys).map(orderId => updateFn(orderId, status));
    await Promise.all(promises);
    toast({ title: "Bulk Update Successful", description: `${selectedRowKeys.size} orders have been updated to "${status}".` });
    setSelectedRowKeys(new Set());
  };

  const handleBulkDelete = async () => {
    const promises = Array.from(selectedRowKeys).map(orderId => deleteOrder(orderId));
    await Promise.all(promises);
    toast({ title: "Bulk Delete Successful", description: `${selectedRowKeys.size} orders have been deleted.` });
    setSelectedRowKeys(new Set());
  };

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      await deleteOrder(orderToDelete);
    }
    setOrderToDelete(null);
  }

  const handleDeleteAllConfirm = async () => {
    try {
      await deleteAllOrders();
    } catch (_error) {
      toast({
        title: "Error Deleting Orders",
        description: "Failed to delete all orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAllAlertOpen(false);
    }
  }

  const handleOpenCancelDialog = (order: Order) => {
    setOrderToCancel(order);
    setIsCancelDialogOpen(true);
  }

  const handleCancelSubmit = async (reason: string, notes?: string) => {
    if (orderToCancel) {
      await updateOrderStatus(orderToCancel.id, 'Cancelled', reason, notes);
      toast({ title: "Order Cancelled", description: "The order status has been updated." });
    }
    setIsCancelDialogOpen(false);
    setOrderToCancel(null);
  };

  const handlePrintTodaysOrders = () => {
    const todaysOrders = orders.filter(order => isToday(new Date(order.orderDate)));
    if (todaysOrders.length === 0) {
      toast({ title: "No Orders Today", description: "There are no orders with today's date to print." });
      return;
    }

    const printContainer = document.createElement('div');
    printContainer.id = 'daily-orders-print-container';
    document.body.appendChild(printContainer);

    const root = createRoot(printContainer);
    root.render(<DailyOrdersReport orders={todaysOrders} companies={companies} />);

    setTimeout(() => {
      window.print();
      root.unmount();
      document.body.removeChild(printContainer);
    }, 500);
  }

  const handleGenerateReport = async () => {
    try {
      toast({
        title: "Generating Reports...",
        description: "Please wait while we generate the daily reports.",
      });

      const response = await fetch('/api/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail: false }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate reports');
      }

      // Helper to download base64 pdf
      const downloadPdf = (base64: string, filename: string) => {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      let downloadedCount = 0;

      if (result.deliveryReport) {
        downloadPdf(result.deliveryReport.base64, result.deliveryReport.filename);
        downloadedCount++;
      }

      if (result.warehouseReport) {
        // Small delay to ensure both downloads start
        setTimeout(() => {
          downloadPdf(result.warehouseReport.base64, result.warehouseReport.filename);
        }, 500);
        downloadedCount++;
      }

      if (downloadedCount > 0) {
        toast({
          title: "Reports Generated",
          description: `Successfully generated and downloaded ${downloadedCount} report(s).`,
        });
      } else {
        toast({
          title: "No Reports",
          description: "No orders found for today to generate reports.",
          variant: "default",
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate reports",
        variant: "destructive",
      });
    }
  };

  const handleRowSelectionChange = (id: string, isSelected: boolean) => {
    const newSet = new Set(selectedRowKeys);
    if (isSelected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedRowKeys(newSet);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedRowKeys(new Set(filteredOrders.map(o => o.id)));
    } else {
      setSelectedRowKeys(new Set());
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-8">
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this order and all of its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAllAlertOpen} onOpenChange={setIsDeleteAllAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Orders?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all orders in the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllConfirm} className='bg-red-500/10 text-red-800 hover:bg-red-600/80 '>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CancellationDialog
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        order={orderToCancel}
        onSubmit={handleCancelSubmit}
      />

      <OrderActions
        onSearch={handleSearch}
        onFilter={setStatusFilter}
        onOpenOrderForm={() => setIsOrderFormOpen(true)}
        onOpenImportDialog={(type) => {
          setImportFileType(type);
          setIsImportDialogOpen(true);
        }}
        onPrintTodaysOrders={handlePrintTodaysOrders}
        onRemoveAll={() => setIsDeleteAllAlertOpen(true)}
        onBulkUpdateStatus={(status) => handleBulkUpdate(updateOrderStatus, status)}
        onBulkDelete={handleBulkDelete}
        selectedRowCount={selectedRowKeys.size}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        viewMode={viewMode}
        onViewModeChange={setLocalViewMode}
        onOpenAdvancedSearch={() => setIsAdvancedSearchOpen(true)}
        onGenerateReport={handleGenerateReport}
        isSearching={isLoadingSearch}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((prev) => !prev)}
      />

      <OrderForm isOpen={isOrderFormOpen} onOpenChange={setIsOrderFormOpen} />
      <CsvImporterDialog isOpen={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} entityType="order" fileType={importFileType} />
      <AdvancedSearchDialog
        isOpen={isAdvancedSearchOpen}
        onOpenChange={setIsAdvancedSearchOpen}
        onApplyFilters={setAdvancedFilters}
        currentFilters={advancedFilters}
      />

      {viewMode === 'list' || viewMode === 'kanban' ? (
        <>
          <ErrorBoundary>
            <OrderList
              orders={filteredOrders}
              companies={companies}
              selectedRowKeys={selectedRowKeys}
              onRowSelectionChange={handleRowSelectionChange}
              onSelectAll={handleSelectAll}
              onUpdateStatus={updateOrderStatus}
              onCancelOrder={handleOpenCancelDialog}
              onDeleteOrder={setOrderToDelete}
            />
          </ErrorBoundary>

          {ordersHasMore && !hasAdvancedFilters && !hasActiveSearch && (
            <div className="mt-4 flex justify-center">
              <Button onClick={handleLoadMore} disabled={ordersLoading}>
                {ordersLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <ErrorBoundary>
          <KanbanBoard orders={filteredOrders} onStatusChange={updateOrderStatus} />
        </ErrorBoundary>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrdersPageContent />
    </Suspense>
  )
}
