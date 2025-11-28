/** @format */

import { create } from "zustand";
import { produce } from "immer";
import { supabase } from "@/lib/supabase";
import type {
  Order,
  Product,
  VisitCall,
  Notification,
  Company,
  Category,
  Tax,
  Return,
} from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { generateImage } from "@/ai/flows/generate-image";
import { calculateOrderTotals } from "@/lib/pricing-calculator";
import { useCompanyStore } from "./use-company-store";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { useManufacturerStore } from "./use-manufacturer-store";
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
import { AnalyticsCache } from "@/lib/analytics-cache";
import { productCache } from "@/lib/product-cache";

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
  products: Product[];
  categories: Category[];
  taxes: Tax[];
  returns: Return[];
  notifications: Notification[];
  visits: VisitCall[];
  loading: boolean;
  ordersOffset: number;
  ordersHasMore: boolean;
  ordersLoading: boolean;
  analyticsLoading: boolean;
  productsOffset: number;
  productsHasMore: boolean;
  currentFetchId: string | null;

  fetchInitialData: () => Promise<void>;
  fetchOrders: (limitCount: number) => Promise<void>;
  fetchOrdersWithFilters: (
    limitCount: number,
    filters: { status?: string; paymentStatus?: string; companyId?: string }
  ) => Promise<void>;
  searchOrdersByText: (searchTerm: string) => Promise<void>;
  loadMoreOrders: (limitCount: number) => Promise<void>;
  refreshOrders: () => Promise<void>;
  fetchOrdersByDateRange: (from: string, to: string) => Promise<void>;
  syncAllOrdersToSearch: () => Promise<void>;
  loadRemainingProducts: () => Promise<void>;
  searchProducts: (searchTerm: string) => Promise<void>;
  filterProductsByCategory: (category: string) => Promise<void>;

  // Product Actions
  addProduct: (
    product: Omit<Product, "id" | "imageUrl"> & { image?: File }
  ) => Promise<Product>;
  updateProduct: (
    productId: string,
    productData: Partial<Product>
  ) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  deleteAllProducts: () => Promise<void>;

  // Category Actions
  addCategory: (category: Omit<Category, "id">) => Promise<Category>;
  updateCategory: (
    categoryId: string,
    categoryData: Partial<Category>
  ) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;

  // Tax Actions
  addTax: (tax: Omit<Tax, "id">) => Promise<void>;
  updateTax: (
    taxId: string,
    taxData: Partial<Omit<Tax, "id">>
  ) => Promise<void>;
  deleteTax: (taxId: string) => Promise<void>;

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
  updatePaymentScores: () => Promise<void>;
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
  products: [],
  categories: [],
  taxes: [],
  returns: [],
  notifications: [],
  visits: [],
  loading: true,
  ordersOffset: 0,
  ordersHasMore: true,
  ordersLoading: false,
  analyticsLoading: false,
  productsOffset: 0,
  productsHasMore: true,

  fetchInitialData: async () => {
    // Only set loading if we don't have data yet
    const currentState = get();
    const hasData = currentState.orders.length > 0 || currentState.products.length > 0;
    
    if (!hasData && !currentState.loading) {
      set({ loading: true });
    }

    try {
      const [
        { data: visits },
        { data: companies },
        { data: baristas },
        { data: feedback },
        { data: areas },
        { data: maintenanceVisits },
        { data: maintenanceEmployees },
        { data: cancellationReasons },
        { data: manufacturers },
        { data: categories },
        { data: taxes },
        { data: returns },
      ] = await Promise.all([
        supabase.from("visits").select("*"),
        supabase.from("companies").select("*").not('name', 'like', '[DELETED]%'),
        supabase.from("baristas").select("*"),
        supabase.from("feedback").select("*"),
        supabase.from("areas").select("*"),
        supabase.from("maintenance").select("*"),
        supabase.from("maintenanceEmployees").select("*"),
        supabase.from("cancellationReasons").select("*"),
        supabase.from("manufacturers").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("taxes").select("*"),
        supabase.from("returns").select("*"),
      ]);
      
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .range(0, 49);
      
      set({ 
        productsOffset: 50, 
        productsHasMore: (products?.length || 0) === 50 
      });

      const productsByManufacturer = (products || []).reduce((acc, product) => {
        const key = product.manufacturerId || "unassigned";
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(product);
        return acc;
      }, {} as Record<string, Product[]>);

      set({ products: products || [], visits: visits || [], categories: categories || [], taxes: taxes || [], returns: returns || [], loading: false });
      useCompanyStore.setState({
        companies: companies || [],
        baristas: baristas || [],
        feedback: feedback || [],
        areas: areas || [],
        loading: false,
      });
      useMaintenanceStore.setState({
        maintenanceVisits: maintenanceVisits || [],
        maintenanceEmployees: maintenanceEmployees || [],
        cancellationReasons: cancellationReasons || [],
        loading: false,
      });
      useManufacturerStore.setState({
        manufacturers: manufacturers || [],
        productsByManufacturer,
        loading: false,
      });
    } catch {
      set({ loading: false });
      useCompanyStore.setState({ loading: false });
      useMaintenanceStore.setState({ loading: false });
      useManufacturerStore.setState({
        loading: false,
        productsByManufacturer: {},
      });
    }
  },

  fetchOrders: async (limitCount) => {
    set({ ordersLoading: true });
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("orderDate", { ascending: false })
        .range(0, limitCount - 1);

      set({
        orders: orders || [],
        ordersOffset: limitCount,
        ordersHasMore: (orders?.length || 0) === limitCount,
        ordersLoading: false,
      });
    } catch {
      set({ ordersLoading: false });
    }
  },

  fetchOrdersWithFilters: async (limitCount, filters) => {
    set({ ordersLoading: true });
    try {
      let query = supabase.from("orders").select("*");

      if (filters.status && filters.status !== "All") {
        query = query.eq("status", filters.status);
      }
      if (filters.paymentStatus && filters.paymentStatus !== "All") {
        query = query.eq("paymentStatus", filters.paymentStatus);
      }
      if (filters.companyId) {
        query = query.eq("companyId", filters.companyId);
      }

      const { data: orders } = await query
        .order("orderDate", { ascending: false })
        .range(0, limitCount - 1);

      set({
        orders: orders || [],
        ordersOffset: limitCount,
        ordersHasMore: (orders?.length || 0) === limitCount,
        ordersLoading: false,
      });
    } catch {
      set({ ordersLoading: false });
    }
  },

  searchOrdersByText: async (searchTerm) => {
    if (!searchTerm.trim()) {
      await get().fetchOrders(20);
      return;
    }

    try {
      const { data: allOrders } = await supabase.from("orders").select("*");

      const searchLower = searchTerm.toLowerCase();
      const filtered = (allOrders || []).filter(order =>
        (order.companyName && order.companyName.toLowerCase().includes(searchLower)) ||
        (order.branchName && order.branchName.toLowerCase().includes(searchLower)) ||
        (order.id && order.id.toLowerCase().includes(searchLower)) ||
        (order.temporaryCompanyName && order.temporaryCompanyName.toLowerCase().includes(searchLower))
      );

      filtered.sort(
        (a, b) =>
          new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      );

      set({
        orders: filtered,
        ordersOffset: 0,
        ordersHasMore: false,
      });
    } catch {
      // Error handled silently
    }
  },

  loadMoreOrders: async (limitCount) => {
    const { ordersOffset, ordersHasMore } = get();
    if (!ordersHasMore) return;

    set({ ordersLoading: true });
    try {
      const { data: newOrders } = await supabase
        .from("orders")
        .select("*")
        .order("orderDate", { ascending: false })
        .range(ordersOffset, ordersOffset + limitCount - 1);

      set(
        produce((state: AppState) => {
          // Deduplicate by checking if order ID already exists
          const existingIds = new Set(state.orders.map(o => o.id));
          const uniqueNewOrders = (newOrders || []).filter(order => !existingIds.has(order.id));
          
          state.orders.push(...uniqueNewOrders);
          state.ordersOffset = ordersOffset + limitCount;
          state.ordersHasMore = (newOrders?.length || 0) === limitCount;
          state.ordersLoading = false;
        })
      );
    } catch {
      set({ ordersLoading: false });
    }
  },

  refreshOrders: async () => {
    const limitCount = get().orders.length || 20;
    AnalyticsCache.clearAll();
    await get().fetchOrders(limitCount);
  },

  currentFetchId: null,

  fetchOrdersByDateRange: async (from: string, to: string) => {
    // Generate a unique ID for this fetch operation
    const fetchId = crypto.randomUUID();
    set({ currentFetchId: fetchId, analyticsLoading: true });

    const cached = AnalyticsCache.get(from, to);
    if (cached) {
      // Check if this is still the current fetch
      if (get().currentFetchId === fetchId) {
        set({ analyticsOrders: cached, analyticsLoading: false });
      }
      return;
    }
    
    toast({
      title: "Loading Analytics Data",
      description: "Fetching all orders for the selected period...",
    });

    try {
      let allOrders: Order[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000; // Match Supabase's default limit to ensure correct pagination

      while (hasMore) {
        // Abort if a new fetch has started
        if (get().currentFetchId !== fetchId) {
            console.log("Fetch aborted: " + fetchId);
            return;
        }

        const { data: orders, error } = await supabase
          .from("orders")
          .select("id, orderDate, total, grandTotal, status, paymentStatus, companyId, items, isPotentialClient, temporaryCompanyName, statusHistory, paidDate, expectedPaymentDate")
          .gte("orderDate", from)
          .lte("orderDate", to)
          .order("orderDate", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (orders && orders.length > 0) {
          allOrders = [...allOrders, ...(orders as Order[])];
          
          // If we got fewer rows than requested, we've reached the end
          if (orders.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      // Final check before updating state
      if (get().currentFetchId !== fetchId) return;

      AnalyticsCache.set(from, to, allOrders);

      set({ analyticsOrders: allOrders, analyticsLoading: false });
      
      toast({
        title: "Analytics Data Loaded",
        description: `Successfully loaded ${allOrders.length} orders.`,
      });

    } catch (error: any) {
      // Only show error if this is still the current fetch
      if (get().currentFetchId === fetchId) {
        console.error("Error fetching analytics orders:", error);
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
    AnalyticsCache.clearAll();
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

  updatePaymentScores: async (companyId?: string) => {
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
    const { data: order } = await supabase.from("orders").select("companyId").eq("id", orderId).single();
    const companyId = order?.companyId;
    
    await supabase.from("orders").delete().eq("id", orderId);
    await deleteOrderFromSearch(orderId);
    await get().refreshOrders();
    
    // Update company payment score if order had a company
    if (companyId) {
      await get().updatePaymentScores(companyId);
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

  addProduct: async (product) => {
    const { image, ...productData } = product;
    let imageUrl = "";

    if (product.hint && !image) {
      const result = await generateImage({ prompt: product.hint });
      imageUrl = result.imageUrl;
    } else if (image) {
      imageUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(image);
      });
    }

    const dataToSave = { ...productData, imageUrl };
    if (!dataToSave.isVariant) {
      dataToSave.parentProductId = null;
      dataToSave.variantName = null;
    }

    const { data: productResult, error } = await supabase.from("products").insert([dataToSave]).select().single();
    if (error) throw error;
    const newProduct = { ...productResult, imageUrl } as Product;

    // Update local state and cache
    set(
      produce((state: AppState) => {
        state.products.push(newProduct);
      })
    );
    productCache.setProducts(get().products).catch(console.error);

    toast({
      title: "Product Added",
      description: `${newProduct.name} has been added to the inventory.`,
    });
    return newProduct;
  },

  updateProduct: async (productId, productData) => {
    const dataToUpdate = { ...productData };

    if (
      Object.prototype.hasOwnProperty.call(dataToUpdate, "variantName") &&
      !dataToUpdate.variantName
    ) {
      dataToUpdate.variantName = null;
    }
    if (
      Object.prototype.hasOwnProperty.call(dataToUpdate, "sku") &&
      !dataToUpdate.sku
    ) {
      dataToUpdate.sku = null;
    }

    await supabase.from("products").update(dataToUpdate).eq("id", productId);
    set(
      produce((state: AppState) => {
        const index = state.products.findIndex((p) => p.id === productId);
        if (index !== -1) {
          state.products[index] = { ...state.products[index], ...dataToUpdate };
        }
      })
    );
    productCache.setProducts(get().products).catch(console.error);
  },

  deleteProduct: async (productId: string) => {
    await supabase.from("products").delete().eq("id", productId);
    set(
      produce((state: AppState) => {
        state.products = state.products.filter((p) => p.id !== productId);
      })
    );
    productCache.setProducts(get().products).catch(console.error);
  },

  deleteAllProducts: async () => {
    const { error } = await supabase
      .from("products")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows

    if (error) throw error;
    set({ products: [] });
    productCache.clearProducts().catch(console.error);
    toast({
      title: "All Products Deleted",
      description: "All products have been removed from the database.",
    });
  },

  // Category Actions
  addCategory: async (category) => {
    const { data: categoryResult, error } = await supabase.from("categories").insert([category]).select().single();
    if (error) throw error;
    const newCategory = categoryResult as Category;
    set(
      produce((state) => {
        state.categories.push(newCategory);
      })
    );
    return newCategory;
  },
  updateCategory: async (categoryId, categoryData) => {
    await supabase.from("categories").update(categoryData).eq("id", categoryId);
    set(
      produce((state: AppState) => {
        const index = state.categories.findIndex(
          (c: Category) => c.id === categoryId
        );
        if (index !== -1) {
          state.categories[index] = {
            ...state.categories[index],
            ...categoryData,
          };
        }
      })
    );
  },
  deleteCategory: async (categoryId) => {
    await supabase.from("categories").delete().eq("id", categoryId);
    set(
      produce((state: AppState) => {
        state.categories = state.categories.filter(
          (c: Category) => c.id !== categoryId
        );
      })
    );
  },

  // Tax Actions
  addTax: async (tax) => {
    const { data: taxResult, error } = await supabase.from("taxes").insert([tax]).select().single();
    if (error) throw error;
    set(
      produce((state: AppState) => {
        state.taxes.push(taxResult as Tax);
      })
    );
  },
  updateTax: async (taxId, taxData) => {
    await supabase.from("taxes").update(taxData).eq("id", taxId);
    set(
      produce((state: AppState) => {
        const index = state.taxes.findIndex((t) => t.id === taxId);
        if (index !== -1) {
          state.taxes[index] = { ...state.taxes[index], ...taxData };
        }
      })
    );
  },
  deleteTax: async (taxId) => {
    await supabase.from("taxes").delete().eq("id", taxId);
    set(
      produce((state: AppState) => {
        state.taxes = state.taxes.filter((t) => t.id !== taxId);
      })
    );
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
    const deliveryDate = calculateNextDeliveryDate(
      region as "A" | "B",
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
    await get().refreshOrders();
    
    // Update payment scores for the specific company only
    if (createdOrder.companyId) {
      await get().updatePaymentScores(createdOrder.companyId);
    }

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
      console.error('Failed to mark notification as read:', e);
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
      console.error('Failed to snooze notification:', e);
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
      console.error('Failed to clear snooze:', e);
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
      console.error("Error syncing orders to search:", e);
      toast({
        title: "Sync Failed",
        description: "Failed to sync orders to search collection.",
        variant: "destructive",
      });
    }
  },

  loadRemainingProducts: async () => {
    try {
      const { productsOffset, productsHasMore } = get();
      
      if (!productsHasMore) return;
      
      const { data: newProducts } = await supabase
        .from("products")
        .select("*")
        .range(productsOffset, productsOffset + 49);
      
      set(
        produce((state: AppState) => {
          state.products.push(...(newProducts || []));
          state.productsOffset = productsOffset + 50;
          state.productsHasMore = (newProducts?.length || 0) === 50;
        })
      );
      
      productCache.setProducts(get().products).catch(console.error);
    } catch {
      // Error handled silently
    }
  },

  searchProducts: async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      await get().fetchInitialData();
      return;
    }
    
    try {
      const { data: allProducts } = await supabase.from("products").select("*");
      
      const searchLower = searchTerm.toLowerCase();
      const filtered = (allProducts || []).filter(product =>
        (product.name && product.name.toLowerCase().includes(searchLower)) ||
        (product.variantName && product.variantName.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
        (product.category && product.category.toLowerCase().includes(searchLower))
      );
      
      set({ products: filtered });
    } catch {
      // Error handled silently
    }
  },

  filterProductsByCategory: async (category: string) => {
    if (category === "All") {
      await get().fetchInitialData();
      return;
    }
    
    set({ loading: true });
    try {
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("category", category)
        .limit(100);
      
      set({ products: products || [], loading: false });
    } catch {
      set({ loading: false });
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
      console.error('Failed to sync notifications:', e);
    }
  },
}));

