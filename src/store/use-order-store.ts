/** @format */

import { create } from "zustand";
import { produce } from "immer";
import { supabase } from "@/lib/supabase";
import { drilldownCacheInvalidator } from "@/lib/cache/drilldown-cache-invalidator";
import type {
  Order,
  VisitCall,
  Notification,
  Company,
  Return,
} from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { calculateOrderTotals } from "@/lib/pricing-calculator";
import { useCompanyStore } from "./use-company-store";
import {
  calculateExpectedPaymentDate,
  calculateDaysOverdue,
  calculatePaymentScore,
  calculateCompanyPaymentScore,
  generateBulkPaymentCycleId,
} from "@/lib/payment-score";
import {
  syncOrderToSearch,
  deleteOrderFromSearch,
  bulkSyncOrdersToSearch,
} from "@/lib/order-search-sync";
import { universalCache } from "@/lib/cache/universal-cache";
import { CacheKeyFactory } from "@/lib/cache/key-factory";
import { initializeAllStores } from "./utils/store-initializer";
import { logger } from "@/lib/logger";

const calculateNextDeliveryDate = (
  region: "A" | "B",
  orderDate: Date
): Date => {
  const deliveryDaysA = [0, 2, 4]; // Sunday, Tuesday, Thursday
  const deliveryDaysB = [1, 3, 6]; // Monday, Wednesday, Saturday
  const deliveryDays = region === "A" ? deliveryDaysA : deliveryDaysB;

  let deliveryDate = new Date(orderDate);
  deliveryDate.setHours(0, 0, 0, 0);

  // If today is a delivery day and it's before 4 PM, deliver today
  if (deliveryDays.includes(orderDate.getDay()) && orderDate.getHours() < 16) {
    return deliveryDate;
  }

  // Otherwise, find the next delivery day
  deliveryDate.setDate(deliveryDate.getDate() + 1);
  while (!deliveryDays.includes(deliveryDate.getDay())) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  return deliveryDate;
};

interface AppState {
  orders: Order[];
  analyticsOrders: Order[];
  returns: Return[];
  notifications: Notification[];
  visits: VisitCall[];
  loading: boolean;
  ordersOffset: number;
  ordersHasMore: boolean;
  ordersLoading: boolean;
  activeFilters: { status?: string; paymentStatus?: string; companyId?: string; branchId?: string; showArchived?: boolean } | null;
  activeSort: { key: string; direction: 'asc' | 'desc' } | null;
  analyticsLoading: boolean;
  currentFetchId: string | null;

  fetchInitialData: () => Promise<void>;
  fetchOrders: (limitCount: number) => Promise<void>;
  fetchOrdersWithFilters: (
    limitCount: number,
    filters: { status?: string; paymentStatus?: string; companyId?: string; branchId?: string; showArchived?: boolean },
    sort?: { key: string; direction: 'asc' | 'desc' }
  ) => Promise<void>;
  searchOrdersByText: (searchTerm: string) => Promise<void>;
  loadMoreOrders: (limitCount: number) => Promise<void>;
  refreshOrders: () => Promise<void>;
  fetchOrdersByDateRange: (from: string, to: string, forceRefresh?: boolean) => Promise<void>;
  syncAllOrdersToSearch: () => Promise<void>;

  // Order Actions
  updateOrderStatus: (
    orderId: string,
    status: Order["status"],
    reason?: string,
    notes?: string
  ) => Promise<void>;
  updateOrderPaymentStatus: (
    orderId: string,
    paymentStatus: Order["paymentStatus"]
  ) => Promise<void>;
  markOrderAsPaid: (
    orderId: string,
    paidDate: string,
    reference?: string,
    notes?: string
  ) => Promise<void>;
  markBulkOrdersAsPaid: (
    orderIds: string[],
    paidDate: string,
    reference?: string,
    notes?: string
  ) => Promise<void>;
  markBulkCycleAsPaid: (
    cycleId: string,
    orderIds: string[],
    paidDate: string,
    reference?: string,
    notes?: string
  ) => Promise<void>;
  updatePaymentScores: (companyId?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteAllOrders: () => Promise<void>;
  submitOrder: (data: any) => Promise<void>;
  registerPotentialClient: (
    orderId: string,
    companyData: Partial<Omit<Company, "id">>
  ) => Promise<void>;

  // Visits & Calls Actions
  addVisit: (visit: Omit<VisitCall, "id">) => Promise<void>;
  updateVisit: (
    visitId: string,
    visitData: Partial<VisitCall>
  ) => Promise<void>;
  updateVisitStatus: (visitId: string, status: VisitCall["status"]) => Promise<void>;
  deleteVisit: (visitId: string) => Promise<void>;

  // Notification Actions
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  snoozeNotification: (notificationId: string, snoozeUntil: Date) => void;
  clearSnooze: (notificationId: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  subscribeToNotifications: (userId: string) => () => void;
  syncNotificationsToFirestore: (userId: string) => Promise<void>;
}

export const useOrderStore = create<AppState>((set, get) => ({
  orders: [],
  analyticsOrders: [],
  orders: [],
  analyticsOrders: [],
  activeFilters: null,
  activeSort: null,
  returns: [],
  notifications: [],
  visits: [],
  loading: true,
  ordersOffset: 0,
  ordersHasMore: true,
  ordersLoading: false,
  analyticsLoading: false,
  deleteVisit: async () => {},

  fetchInitialData: async () => {
    const currentState = get();
    const hasData = currentState.orders.length > 0;
    
    if (!hasData && !currentState.loading) {
      set({ loading: true });
    }

    try {
      const data = await initializeAllStores();
      
      set({ 
        visits: data.visits || [], 
        returns: data.returns || [], 
        loading: false 
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchOrders: async (limitCount) => {
    set({ ordersLoading: true, activeFilters: null });
    try {
      const orders = await universalCache.get(
        CacheKeyFactory.list('orders', { limit: limitCount, v: '5' }),
        async () => {
          const { data, error } = await supabase
            .from("orders")
            .select("*")
            .neq('status', 'Delivered')
            .neq('status', 'Cancelled') // Default: Show only Active
            .order("orderDate", { ascending: false })
            .range(0, limitCount - 1);
          if (error) throw error;
          return data;
        }
      );

      set({
        orders: orders || [],
        ordersOffset: limitCount,
        ordersHasMore: (orders?.length || 0) === limitCount,
        ordersLoading: false,
      });
    } catch (error) {
      console.error('❌ [useOrderStore] fetchOrders failed:', error);
      set({ ordersLoading: false });
    }
  },

  fetchOrdersWithFilters: async (limitCount, filters, sort) => {
    set({ ordersLoading: true, activeFilters: filters, activeSort: sort || null });
    try {
      // Always fetch fresh data for filtered queries (no cache)
      // This ensures filters like "Pending" always show the latest orders
      let query = supabase.from("orders").select("*", { count: 'exact' });

      if (filters.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }
      if (filters.paymentStatus && filters.paymentStatus !== "All") {
        query = query.eq("paymentStatus", filters.paymentStatus);
      }
      if (filters.companyId) {
        query = query.eq("companyId", filters.companyId);
      }
      if (filters.branchId) {
        query = query.eq("branchId", filters.branchId);
      }
      
      // Archive Logic
      if (filters.showArchived) {
          // Show Delivered OR Cancelled
          query = query.in('status', ['Delivered', 'Cancelled']);
      } else {
          // Show Active: NOT Delivered AND NOT Cancelled
          query = query.neq('status', 'Delivered').neq('status', 'Cancelled');
      }

      // Apply sorting
      if (sort) {
          let column = sort.key;
          // Map UI sort keys to DB columns
          switch (sort.key) {
            case 'client': column = 'companyName'; break;
            case 'date': column = 'orderDate'; break;
            case 'deliveryDate': column = 'deliveryDate'; break;
            case 'total': column = 'grandTotal'; break; // Could be 'total' depending on schema, assume grandTotal for now or fallback
             // 'id' and 'status' map directly
          }
          query = query.order(column, { ascending: sort.direction === 'asc' });
      } else {
          query = query.order("orderDate", { ascending: false });
      }

      const { data, error } = await query.range(0, limitCount - 1);
      
      if (error) throw error;

      set({
        orders: data || [],
        ordersOffset: limitCount,
        ordersHasMore: (data?.length || 0) === limitCount,
        ordersLoading: false,
      });
    } catch (error) {
      console.error('❌ [useOrderStore] fetchOrdersWithFilters failed:', error);
      set({ ordersLoading: false });
    }
  },

  searchOrdersByText: async (searchTerm) => {
    if (!searchTerm.trim()) {
      await get().fetchOrders(20);
      return;
    }

    set({ ordersLoading: true, activeFilters: null, activeSort: null });

    try {
      const term = searchTerm.trim();
      // Use server-side ILIKE search
      // Assuming companyName, branchName, id, temporaryCompanyName are columns on 'orders' due to previous client-side logic
      
      const { data: filtered, error } = await supabase
        .from("orders")
        .select("*")
        .or(`companyName.ilike.%${term}%,branchName.ilike.%${term}%,id.ilike.%${term}%,temporaryCompanyName.ilike.%${term}%`)
        .order("orderDate", { ascending: false })
        .range(0, 50); // Fetch top 50 matches

      if (error) throw error;

      set({
        orders: filtered || [],
        ordersOffset: 50, // Should probably be actual length, but this resets pagination effectively
        ordersHasMore: (filtered?.length || 0) === 50, // Assuming simple heuristic
        ordersLoading: false,
        activeFilters: null
      });
    } catch (error) {
        console.error('❌ [useOrderStore] searchOrdersByText failed:', error);
        set({ ordersLoading: false });
    }
  },

  loadMoreOrders: async (limitCount) => {
    const { ordersOffset, ordersHasMore, activeFilters, activeSort } = get();
    console.warn('[loadMoreOrders] Called with:', { limitCount, ordersOffset, ordersHasMore, activeFilters, activeSort });
    if (!ordersHasMore) {
      console.warn('[loadMoreOrders] Aborting: ordersHasMore is false');
      return;
    }

    set({ ordersLoading: true });
    try {
      let query = supabase.from("orders").select("*");

      if (activeFilters) {
        if (activeFilters.status && activeFilters.status !== "All") {
          query = query.eq("status", activeFilters.status);
        }
        if (activeFilters.paymentStatus && activeFilters.paymentStatus !== "All") {
          query = query.eq("paymentStatus", activeFilters.paymentStatus);
        }
        if (activeFilters.companyId) {
          query = query.eq("companyId", activeFilters.companyId);
        }
        if (activeFilters.branchId) {
          query = query.eq("branchId", activeFilters.branchId);
        }
        
        if (activeFilters.showArchived) {
            query = query.in('status', ['Delivered', 'Cancelled']);
        } else {
            query = query.neq('status', 'Delivered').neq('status', 'Cancelled');
        }
      } else {
          // Default to not showing archived if no filters (mimics fetchOrders default)
          query = query.neq('status', 'Delivered').neq('status', 'Cancelled');
      }

      // Apply sorting
      if (activeSort) {
        let column = activeSort.key;
        // Map UI sort keys to DB columns
        switch (activeSort.key) {
          case 'client': column = 'companyName'; break;
          case 'date': column = 'orderDate'; break;
          case 'deliveryDate': column = 'deliveryDate'; break;
          case 'total': column = 'grandTotal'; break;
        }
        query = query.order(column, { ascending: activeSort.direction === 'asc' });
      } else {
        query = query.order("orderDate", { ascending: false });
      }

      const { data: newOrders, error } = await query
        .range(ordersOffset, ordersOffset + limitCount - 1);

      console.warn('[loadMoreOrders] Fetched:', { count: newOrders?.length, error });

      if (error) {
        console.warn('[loadMoreOrders] Query error:', error);
        throw error;
      }

      set(
        produce((state: AppState) => {
          // Deduplicate by checking if order ID already exists
          const existingIds = new Set(state.orders.map(o => o.id));
          const uniqueNewOrders = (newOrders || []).filter((order: Order) => !existingIds.has(order.id));
          
          state.orders.push(...uniqueNewOrders);
          state.ordersOffset = ordersOffset + limitCount;
          state.ordersHasMore = (newOrders?.length || 0) === limitCount;
          state.ordersLoading = false;
          console.warn('[loadMoreOrders] State updated:', { newOrdersCount: uniqueNewOrders.length, newOffset: state.ordersOffset, hasMore: state.ordersHasMore });
        })
      );
    } catch (err) {
      console.warn('[loadMoreOrders] Error caught:', err);
      set({ ordersLoading: false });
    }
  },

  refreshOrders: async () => {
    const limitCount = get().orders.length || 20;
    // Invalidate all order-related cache entries by using string tag
    // This ensures all cached order queries (with different params) are cleared
    await universalCache.invalidate('orders');
    
    // Force a fresh fetch directly from the database, bypassing the cache
    set({ ordersLoading: true });
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .neq('status', 'Delivered')
        .neq('status', 'Cancelled') // Default: Show only Active
        .order("orderDate", { ascending: false })
        .range(0, limitCount - 1);
      
      if (error) throw error;
      
      set({
        orders: data || [],
        ordersOffset: limitCount,
        ordersHasMore: (data?.length || 0) === limitCount,
        ordersLoading: false,
      });
    } catch (error) {
      console.error('❌ [useOrderStore] refreshOrders failed:', error);
      set({ ordersLoading: false });
    }
  },

  currentFetchId: null,

  fetchOrdersByDateRange: async (from: string, to: string, forceRefresh = false) => {
    // Generate a unique ID for this fetch operation
    const fetchId = crypto.randomUUID();
    set({ currentFetchId: fetchId, analyticsLoading: true });

    toast({
      title: "Loading Analytics Data",
      description: "Fetching all orders for the selected period...",
    });

    try {
      // Build cache key - Version 4 (Mock Data Fix)
      const allOrders = await universalCache.get(
        CacheKeyFactory.list('orders', { from, to, type: 'analytics', v: '4' }),
        async () => {
          logger.debug(`[Analytics] Starting fetch for ${from} to ${to}`);
          let allOrders: Order[] = [];
          let hasMore = true;
          let page = 0;
          const pageSize = 1000;

          while (hasMore) {
            if (get().currentFetchId !== fetchId) throw new Error("Fetch aborted");
            
            logger.debug(`[Analytics] Fetching page ${page}...`);
            const { data: orders, error } = await supabase
              .from("orders")
              .select("*")
              .gte("orderDate", from)
              .lte("orderDate", to)
              .order("orderDate", { ascending: false })
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            if (orders && orders.length > 0) {
               allOrders = [...allOrders, ...(orders as Order[])];
               logger.debug(`[Analytics] Page ${page} received ${orders.length} orders. Total: ${allOrders.length}`);
               if (orders.length < pageSize) hasMore = false;
               else page++;
            } else {
               hasMore = false;
            }
          }
          logger.debug(`[Analytics] Fetch complete. Total Orders: ${allOrders.length}`);
          return allOrders;
        }
      );

      // Final check before updating state
      if (get().currentFetchId !== fetchId) return;

      logger.debug(`[Analytics] Updating store with ${allOrders.length} orders`);
      set({ analyticsOrders: allOrders, analyticsLoading: false });
      
      toast({
        title: "Analytics Data Loaded",
        description: `Successfully loaded ${allOrders.length} orders.`,
      });

    } catch (error: any) {
      if (get().currentFetchId === fetchId && error.message !== "Fetch aborted") {
        logger.error(error, { component: 'use-order-store', action: 'fetchAnalyticsOrders' });
        set({ analyticsLoading: false });
        toast({
            variant: "destructive",
            title: "Error Loading Data",
            description: error.message || "Failed to fetch analytics data",
        });
      }
    }
  },

  setNotifications: (notifications: Notification[]) => set({ notifications }),

  updateOrderStatus: async (orderId, status, reason, notes) => {
    // Update Supabase
    const { data: currentOrder } = await supabase.from("orders").select("statusHistory").eq("id", orderId).single();
    const currentHistory = currentOrder?.statusHistory || [];
    const newHistory = [...(Array.isArray(currentHistory) ? currentHistory : []), { status, timestamp: new Date().toISOString() }];

    const updateData: any = { 
      status,
      statusHistory: newHistory
    };
    if (reason) updateData.cancellationReason = reason;
    if (notes) updateData.cancellationNotes = notes;

    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (error) throw error;

    // Update Local State
    set(
      produce((state: AppState) => {
        const order = state.orders.find((o) => o.id === orderId);
        if (order) {
          order.status = status;
          order.cancellationReason = reason;
          order.cancellationNotes = notes;
          order.statusHistory = newHistory;
        }
      })
    );
    
    // Sync to search
    const { data: updatedOrder } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (updatedOrder) {
        await syncOrderToSearch(updatedOrder as Order);
    }
    
    // Invalidate cache using entity tag
    await universalCache.invalidate('orders');
    
    // Invalidate drilldown preview
    try {
      drilldownCacheInvalidator.invalidateRelatedPreviews('order', orderId, {
        companyId: updatedOrder?.companyId,
        branchId: updatedOrder?.branchId
      });
    } catch (e) {
      logger.error(e, { component: 'use-order-store', action: 'updateOrderStatus' });
    }
  },

  updateOrderPaymentStatus: async (orderId, paymentStatus) => {
    await supabase.from("orders").update({ paymentStatus }).eq("id", orderId);
    await get().refreshOrders();
    toast({ title: "Payment Status Updated" });
  },

  markOrderAsPaid: async (orderId, paidDate, reference, notes) => {
    const updateData: Record<string, unknown> = {
      paymentStatus: "Paid",
      isPaid: true,
      paidDate,
      daysOverdue: 0,
      paymentScore: 100,
    };

    if (reference) updateData.paymentReference = reference;
    if (notes) updateData.paymentNotes = notes;

    await supabase.from("orders").update(updateData).eq("id", orderId);
    await get().refreshOrders();
    await get().updatePaymentScores();
    toast({ title: "Payment Recorded" });
  },

  markBulkOrdersAsPaid: async (orderIds, paidDate, reference, notes) => {
    const updateData: Record<string, unknown> = {
      paymentStatus: "Paid",
      isPaid: true,
      paidDate,
      daysOverdue: 0,
      paymentScore: 100,
    };

    if (reference) updateData.paymentReference = reference;
    if (notes) updateData.paymentNotes = notes;

    await supabase.from("orders").update(updateData).in("id", orderIds);
    // refreshOrders handles cache invalidation internally
    await get().refreshOrders();
    await get().updatePaymentScores();
    toast({
      title: "Bulk Payment Recorded",
      description: `${orderIds.length} orders marked as paid`,
    });
  },

  markBulkCycleAsPaid: async (
    _cycleId,
    orderIds,
    paidDate,
    reference,
    notes
  ) => {
    const updateData: Record<string, unknown> = {
      paymentStatus: "Paid",
      isPaid: true,
      paidDate,
      daysOverdue: 0,
      paymentScore: 100,
    };

    if (reference) updateData.paymentReference = reference;
    if (notes) updateData.paymentNotes = notes;

    await supabase.from("orders").update(updateData).in("id", orderIds);
    await get().refreshOrders();
    await get().updatePaymentScores();
    toast({
      title: "Bulk Payment Recorded",
      description: `${orderIds.length} orders marked as paid`,
    });
  },

  updatePaymentScores: async (companyId) => {
    const { orders } = get();

    const orderUpdates = orders
      .filter(order => !order.isPaid && order.paymentStatus !== "Paid" && order.expectedPaymentDate)
      .map(order => {
        const daysOverdue = calculateDaysOverdue(order.expectedPaymentDate!);
        const paymentScore = calculatePaymentScore(daysOverdue);
        return {
          id: order.id,
          daysOverdue,
          paymentScore,
          paymentStatus: daysOverdue > 7 ? "Overdue" : "Pending",
        };
      });

    if (orderUpdates.length > 0) {
      await supabase.from("orders").upsert(orderUpdates);
    }

    // Update specific company if provided
    if (companyId) {
      const companyOrders = orders.filter(
        o => o.companyId === companyId && !o.isPaid && o.paymentStatus !== "Paid"
      );
      const { score, status, totalUnpaid, totalOutstanding } = calculateCompanyPaymentScore(companyOrders);
      
      await supabase.from("companies").update({
        currentPaymentScore: score,
        paymentStatus: status,
        totalUnpaidOrders: totalUnpaid,
        totalOutstandingAmount: totalOutstanding,
      }).eq("id", companyId);
    }

    await get().fetchInitialData();
  },

  deleteOrder: async (orderId: string) => {
    // Get order before deleting to update company score
    const { data: order } = await supabase.from("orders").select("companyId, branchId").eq("id", orderId).single();
    const companyId = order?.companyId;
    const branchId = order?.branchId;
    
    await supabase.from("orders").delete().eq("id", orderId);
    await deleteOrderFromSearch(orderId);
    await get().refreshOrders();
    
    // Update company payment score if order had a company
    if (companyId) {
      await get().updatePaymentScores(companyId);
    }
    
    // Note: refreshOrders above already invalidates the cache
    
    // Invalidate drilldown preview
    try {
      drilldownCacheInvalidator.invalidateRelatedPreviews('order', orderId, {
        companyId,
        branchId
      });
    } catch (e) {
      logger.error(e, { component: 'use-order-store', action: 'deleteOrder', orderId, companyId, branchId });
    }
    
    toast({
      title: "Order Deleted",
      description: "The order has been permanently removed.",
    });
  },

  deleteAllOrders: async () => {
    const { error } = await supabase
      .from("orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows
    
    if (error) throw error;
    set({ orders: [], ordersOffset: 0, ordersHasMore: false });
    toast({
      title: "All Orders Deleted",
      description: "All orders have been removed from the database.",
    });
  },



  submitOrder: async (data: Record<string, unknown>) => {
    const { isPotentialClient, temporaryCompanyName, branchId, ...orderCore } =
      data;
    const { items, region } = orderCore as { items: Array<Record<string, unknown>>; region: "A" | "B" | "Custom" };

    if (items.length === 0) {
      toast({ title: "Cannot submit an empty order.", variant: "destructive" });
      throw new Error("Cannot submit an empty order.");
    }

    // Calculate totals using the new pricing equation: Total = ((Quantity × Unit Price) - Discount) × 1.14
    const calculatedTotals = calculateOrderTotals(items.map((item: Record<string, unknown>) => ({
      quantity: item.quantity as number,
      price: item.price as number,
      discountValue: (item.discountValue as number) || 0,
    })));

    const { subtotal, totalDiscount: discountAmount, taxAmount: totalTax, grandTotal } = calculatedTotals;

    const orderDate = new Date();
    const client = !isPotentialClient
      ? useCompanyStore.getState().companies.find((c) => c.id === branchId)
      : undefined;
    const parentCompany = client?.isBranch
      ? useCompanyStore
          .getState()
          .companies.find((c) => c.id === client.parentCompanyId)
      : client;

    // Check if company is suspended - block order creation
    if (parentCompany?.isSuspended) {
      toast({
        title: "Order Blocked",
        description: `Orders are suspended for ${parentCompany.name}: ${parentCompany.suspensionReason || 'Payment overdue'}`,
        variant: "destructive"
      });
      throw new Error(`Orders suspended for ${parentCompany.name}`);
    }

    // Determine region - use form value, fall back to client's region, then default to 'A'
    const effectiveRegion: "A" | "B" = 
      (region === "A" || region === "B") ? region : 
      (client?.region === "A" || client?.region === "B") ? client.region : "A";

    const deliveryDate = calculateNextDeliveryDate(
      effectiveRegion,
      orderDate
    );
    const expectedPaymentDate = parentCompany
      ? calculateExpectedPaymentDate(orderDate.toISOString(), parentCompany)
      : null;
    const bulkPaymentCycleId =
      parentCompany?.paymentDueType === "bulk_schedule" && expectedPaymentDate
        ? generateBulkPaymentCycleId(expectedPaymentDate)
        : undefined;

    // Sanitize items before submission
    const sanitizedItems = items.map((item: Record<string, unknown>) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      taxId: item.taxId || null,
      taxRate: item.taxRate || 0,
      discountType: item.discountType || null,
      discountValue: item.discountValue || null,
    }));

    const newOrderPayload: Record<string, unknown> = {
      companyId: client ? client.parentCompanyId || client.id : null,
      branchId: !isPotentialClient ? branchId : null,
      orderDate: orderDate.toISOString(),
      deliveryDate: deliveryDate.toISOString(),
      // NOTE: Add 'deliverySchedule' column to Supabase orders table to enable this:
      // deliverySchedule: effectiveRegion,
      paymentDueDate: (orderCore.paymentDueDate as Date | undefined)?.toISOString() || null,
      status: "Pending",
      paymentStatus: "Pending",
      items: sanitizedItems,
      subtotal,
      totalTax,
      discountType: data.discountType || null,
      discountValue: data.discountValue || null,
      discountAmount: discountAmount || null,
      grandTotal,
      total: grandTotal,
      statusHistory: [
        { status: "Pending", timestamp: new Date().toISOString() },
      ],
      isPotentialClient: isPotentialClient,
      temporaryCompanyName: isPotentialClient ? temporaryCompanyName : null,
      temporaryBranchName: isPotentialClient ? temporaryCompanyName : null,
      area: orderCore.area || null,
      isPaid: false,
      daysOverdue: 0,
      paymentScore: 100,
    };

    if (expectedPaymentDate)
      newOrderPayload.expectedPaymentDate = expectedPaymentDate;
    if (bulkPaymentCycleId)
      newOrderPayload.bulkPaymentCycleId = bulkPaymentCycleId;

    if (client) {
      const parentCompany = client.isBranch
        ? useCompanyStore
            .getState()
            .companies.find((c) => c.id === client.parentCompanyId)
        : client;
      newOrderPayload.companyName = parentCompany?.name || "Unknown Company";
      newOrderPayload.branchName = client.name;
    } else if (isPotentialClient) {
      newOrderPayload.companyName = temporaryCompanyName;
      newOrderPayload.branchName = temporaryCompanyName;
    }

    const { data: orderData, error } = await supabase.from("orders").insert([newOrderPayload]).select().single();
    if (error) throw error;
    const createdOrder = orderData as Order;
    await syncOrderToSearch(createdOrder);
    
    // Update payment scores for the specific company only
    if (createdOrder.companyId) {
      await get().updatePaymentScores(createdOrder.companyId);
    }

    // Refresh orders list (this handles cache invalidation internally)
    await get().refreshOrders();

    toast({
      title: "Order Created successfully!",
      description: `Order for ${newOrderPayload.companyName} has been placed.`,
    });
  },

  registerPotentialClient: async (orderId, companyData) => {
    const { addCompanyAndRelatedData } = useCompanyStore.getState();
    const newCompany = await addCompanyAndRelatedData(
      {
        ...companyData,
        createdAt: new Date().toISOString(),
      },
      [{ ...companyData, name: `${companyData.name} - Main Branch` }]
    );

    await supabase.from("orders").update({
      isPotentialClient: false,
      temporaryCompanyName: null,
      temporaryBranchName: null,
      companyId: newCompany.id,
      branchId: newCompany.id,
      companyName: newCompany.name,
      branchName: newCompany.name,
    }).eq("id", orderId);

    await get().fetchInitialData();
    await get().fetchInitialData();

    toast({
      title: "Client Registered",
      description: `${newCompany.name} has been successfully created and linked to the order.`,
    });
  },

  addVisit: async (visit) => {
    const newVisit = { ...visit, status: "Scheduled" as const };
    const { data: visitResult, error } = await supabase.from("visits").insert([newVisit]).select().single();
    if (error) throw new Error(error.message);
    set(
      produce((state: AppState) => {
        state.visits.push(visitResult as VisitCall);
      })
    );
    toast({ title: "Interaction Logged" });
  },

  updateVisit: async (visitId, visitData) => {
    const { error } = await supabase.from("visits").update(visitData).eq("id", visitId);
    if (error) throw new Error(error.message);
    set(
      produce((state: AppState) => {
        const index = state.visits.findIndex((v) => v.id === visitId);
        if (index !== -1) {
          state.visits[index] = { ...state.visits[index], ...visitData };
        }
      })
    );
    toast({ title: "Interaction Updated" });
  },

  updateVisitStatus: async (visitId, status) => {
    await supabase.from("visits").update({ status }).eq("id", visitId);
    set(
      produce((state: AppState) => {
        const visit = state.visits.find((v) => v.id === visitId);
        if (visit) {
          visit.status = status;
        }
      })
    );
  },

  markNotificationAsRead: async (notificationId: string) => {
    set(
      produce((state: AppState) => {
        const notification = state.notifications.find(
          (n) => n.id === notificationId
        );
        if (notification) {
          notification.read = true;
        }
      })
    );
    
    try {
      await supabase.from("notifications").update({ 
        read: true,
        readAt: new Date().toISOString() 
      }).eq("id", notificationId);
    } catch (e) {
      logger.error(e, { component: 'use-order-store', action: 'markNotificationAsRead' });
    }
  },

  markAllNotificationsAsRead: async () => {
    set(
      produce((state: AppState) => {
        state.notifications.forEach((n) => {
          n.read = true;
        });
      })
    );
  },

  snoozeNotification: async (notificationId, snoozeUntil) => {
    set(
      produce((state: AppState) => {
        const notification = state.notifications.find(
          (n) => n.id === notificationId
        );
        if (notification) {
          notification.snoozedUntil = snoozeUntil.toISOString();
          notification.read = true;
        }
      })
    );
    
    try {
      await supabase.from("notifications").update({ 
        snoozedUntil: snoozeUntil.toISOString(),
        read: true,
        readAt: new Date().toISOString()
      }).eq("id", notificationId);
    } catch (e) {
      logger.error(e, { component: 'use-order-store', action: 'snoozeNotification' });
    }
  },

  clearSnooze: async (notificationId: string) => {
    set(
      produce((state: AppState) => {
        const notification = state.notifications.find(
          (n) => n.id === notificationId
        );
        if (notification) {
          notification.snoozedUntil = undefined;
          notification.read = false;
        }
      })
    );
    
    try {
      await supabase.from("notifications").update({ 
        snoozedUntil: null,
        read: false,
        readAt: null
      }).eq("id", notificationId);
    } catch (e) {
      logger.error(e, { component: 'use-order-store', action: 'clearSnooze' });
    }
  },

  syncAllOrdersToSearch: async () => {
    try {
      const { data: orders } = await supabase.from("orders").select("*");
      await bulkSyncOrdersToSearch(orders || []);
      toast({
        title: "Search Index Synced",
        description: `${orders?.length || 0} orders synced to search collection.`,
      });
    } catch (e) {
      logger.error(e, { component: 'use-order-store', action: 'syncAllOrdersToSearch' });
      toast({
        title: "Sync Failed",
        description: "Failed to sync orders to search collection.",
        variant: "destructive",
      });
    }
  },

  subscribeToNotifications: () => {
    return () => {}; // Placeholder - use notification store instead
  },

  syncNotificationsToFirestore: async (userId: string) => {
    const { notifications } = get();
    
    const notificationsWithUser = notifications.map(n => ({
      ...n,
      userId,
    }));
    
    try {
      await supabase.from("notifications").upsert(notificationsWithUser);
    } catch (e) {
      logger.error(e, { component: 'use-order-store', action: 'syncNotifications' });
    }
  },
}));

