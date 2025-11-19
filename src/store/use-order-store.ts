/** @format */

import { create } from "zustand";
import { produce } from "immer";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  runTransaction,
  deleteDoc,
  writeBatch,
  getDoc,
  increment,
  query,
  where,
  setDoc,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import type {
  Order,
  OrderItem,
  Product,
  VisitCall,
  Notification,
  NotificationType,
  CancellationReason,
  Company,
  Feedback,
  MaintenanceVisit,
  MaintenanceEmployee,
  Barista,
  DeliveryArea,
  Manufacturer,
  Category,
  Tax,
} from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays } from "date-fns";
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
  const deliveryDaysB = [1, 3]; // Monday, Wednesday
  const deliveryDays = region === "A" ? deliveryDaysA : deliveryDaysB;

  let deliveryDate = new Date(orderDate);
  deliveryDate.setHours(0, 0, 0, 0); // Reset time to start of the day

  // If the order is placed on a delivery day after 6 PM, start checking from the next day
  if (deliveryDays.includes(orderDate.getDay()) && orderDate.getHours() >= 18) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

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
  notifications: Notification[];
  visits: VisitCall[];
  loading: boolean;
  ordersLastDoc: DocumentSnapshot | null;
  ordersHasMore: boolean;
  ordersLoading: boolean;
  analyticsLoading: boolean;
  productsLastDoc: DocumentSnapshot | null;
  productsHasMore: boolean;

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
  notifications: [],
  visits: [],
  loading: true,
  ordersLastDoc: null,
  ordersHasMore: true,
  ordersLoading: false,
  analyticsLoading: false,
  productsLastDoc: null,
  productsHasMore: true,

  fetchInitialData: async () => {
    if (!get().loading) set({ loading: true });
    try {
      
      // Fetch only essential data initially, products loaded on-demand
      const [
        visitsSnapshot,
        companiesSnapshot,
        baristasSnapshot,
        feedbackSnapshot,
        areasSnapshot,
        maintenanceSnapshot,
        employeesSnapshot,
        cancellationReasonsSnapshot,
        manufacturersSnapshot,
        categoriesSnapshot,
        taxesSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "visits")),
        getDocs(collection(db, "companies")),
        getDocs(collection(db, "baristas")),
        getDocs(collection(db, "feedback")),
        getDocs(collection(db, "areas")),
        getDocs(collection(db, "maintenance")),
        getDocs(collection(db, "maintenanceEmployees")),
        getDocs(collection(db, "cancellationReasons")),
        getDocs(collection(db, "manufacturers")),
        getDocs(collection(db, "categories")),
        getDocs(collection(db, "taxes")),
      ]);
      
      // Products loaded separately with limit
      const productsSnapshot = await getDocs(
        query(collection(db, "products"), limit(50))
      );
      
      const products = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      
      const lastDoc = productsSnapshot.docs[productsSnapshot.docs.length - 1] || null;
      
      set({ productsLastDoc: lastDoc, productsHasMore: productsSnapshot.docs.length === 50 });
      const visits = visitsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as VisitCall[];
      const categories = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      const taxes = taxesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Tax[];
      const companies = companiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Company[];
      const baristas = baristasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Barista[];
      const feedback = feedbackSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Feedback[];
      const areas = areasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DeliveryArea[];
      const maintenanceVisits = maintenanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MaintenanceVisit[];
      const maintenanceEmployees = employeesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MaintenanceEmployee[];
      const cancellationReasons = cancellationReasonsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() })
      ) as CancellationReason[];
      const manufacturers = manufacturersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Manufacturer[];

      // Group products by manufacturer for efficient lookup
      const productsByManufacturer = products.reduce((acc, product) => {
        const key = product.manufacturerId || "unassigned";
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(product);
        return acc;
      }, {} as Record<string, Product[]>);

      // Update all stores (orders loaded separately)
      set({ products, visits, categories, taxes, loading: false });
      useCompanyStore.setState({
        companies,
        baristas,
        feedback,
        areas,
        loading: false,
      });
      useMaintenanceStore.setState({
        maintenanceVisits,
        maintenanceEmployees,
        cancellationReasons,
        loading: false,
      });
      useManufacturerStore.setState({
        manufacturers,
        productsByManufacturer,
        loading: false,
      });
    } catch (e) {
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
      const q = query(
        collection(db, "orders"),
        orderBy("orderDate", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      set({
        orders,
        ordersLastDoc: lastDoc,
        ordersHasMore: snapshot.docs.length === limitCount,
        ordersLoading: false,
      });
    } catch (e) {
      set({ ordersLoading: false });
    }
  },

  fetchOrdersWithFilters: async (limitCount, filters) => {
    set({ ordersLoading: true });
    try {
      const constraints: any[] = [];

      if (filters.status && filters.status !== "All") {
        constraints.push(where("status", "==", filters.status));
      }
      if (filters.paymentStatus && filters.paymentStatus !== "All") {
        constraints.push(
          where("paymentStatus", "==", filters.paymentStatus)
        );
      }
      if (filters.companyId) {
        constraints.push(where("companyId", "==", filters.companyId));
      }

      constraints.push(orderBy("orderDate", "desc"));
      constraints.push(limit(limitCount));

      const q = query(collection(db, "orders"), ...constraints);
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      set({
        orders,
        ordersLastDoc: lastDoc,
        ordersHasMore: snapshot.docs.length === limitCount,
        ordersLoading: false,
      });
    } catch (e) {
      console.error("Error fetching orders with filters:", e);
      set({ ordersLoading: false });
    }
  },

  searchOrdersByText: async (searchTerm) => {
    if (!searchTerm.trim()) {
      await get().fetchOrders(20);
      return;
    }

    try {
      const allSnapshot = await getDocs(collection(db, "orders"));
      const allOrders = allSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      const searchLower = searchTerm.toLowerCase();
      const filtered = allOrders.filter(order =>
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
        ordersLastDoc: null,
        ordersHasMore: false,
      });
    } catch (e) {
      console.error("Error searching orders:", e);
    }
  },

  loadMoreOrders: async (limitCount) => {
    const { ordersLastDoc, ordersHasMore } = get();
    if (!ordersLastDoc || !ordersHasMore) return;

    set({ ordersLoading: true });
    try {
      const q = query(
        collection(db, "orders"),
        orderBy("orderDate", "desc"),
        startAfter(ordersLastDoc),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const newOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      set(
        produce((state: AppState) => {
          state.orders.push(...newOrders);
          state.ordersLastDoc = lastDoc;
          state.ordersHasMore = snapshot.docs.length === limitCount;
          state.ordersLoading = false;
        })
      );
    } catch (e) {
      set({ ordersLoading: false });
    }
  },

  refreshOrders: async () => {
    const limitCount = get().orders.length || 20;
    AnalyticsCache.clearAll();
    await get().fetchOrders(limitCount);
  },

  fetchOrdersByDateRange: async (from: string, to: string) => {
    // Check cache first
    const cached = AnalyticsCache.get(from, to);
    if (cached) {
      set({ analyticsOrders: cached, analyticsLoading: false });
      return;
    }
    
    set({ analyticsLoading: true });
    try {
      const q = query(
        collection(db, "orders"),
        where("orderDate", ">=", from),
        where("orderDate", "<=", to),
        orderBy("orderDate", "desc")
      );

      const snapshot = await getDocs(q);
      const analyticsOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      // Cache the result
      AnalyticsCache.set(from, to, analyticsOrders);

      set({ analyticsOrders, analyticsLoading: false });
    } catch (e) {
      console.error("Error fetching orders by date range:", e);
      set({ analyticsLoading: false });
    }
  },

  setNotifications: (notifications: Notification[]) => set({ notifications }),

  updateOrderStatus: async (orderId, status, reason, notes) => {
    set(
      produce((state: AppState) => {
        const order = state.orders.find((o) => o.id === orderId);
        if (order) {
          order.status = status;
          order.cancellationReason = reason;
          order.cancellationNotes = notes;
          if (order.statusHistory) {
            order.statusHistory.push({
              status,
              timestamp: new Date().toISOString(),
            });
          } else {
            order.statusHistory = [
              { status, timestamp: new Date().toISOString() },
            ];
          }
        }
      })
    );
  },

  updateOrderPaymentStatus: async (orderId, paymentStatus) => {
    await updateDoc(doc(db, "orders", orderId), { paymentStatus });
    await get().refreshOrders();
    toast({ title: "Payment Status Updated" });
  },

  markOrderAsPaid: async (orderId, paidDate, reference, notes) => {
    const updateData: any = {
      paymentStatus: "Paid",
      isPaid: true,
      paidDate,
      daysOverdue: 0,
      paymentScore: 100,
    };

    if (reference) updateData.paymentReference = reference;
    if (notes) updateData.paymentNotes = notes;

    await updateDoc(doc(db, "orders", orderId), updateData);
    await get().refreshOrders();
    await get().updatePaymentScores();
    toast({ title: "Payment Recorded" });
  },

  markBulkOrdersAsPaid: async (orderIds, paidDate, reference, notes) => {
    const batch = writeBatch(db);

    orderIds.forEach((orderId) => {
      const updateData: any = {
        paymentStatus: "Paid",
        isPaid: true,
        paidDate,
        daysOverdue: 0,
        paymentScore: 100,
      };

      if (reference) updateData.paymentReference = reference;
      if (notes) updateData.paymentNotes = notes;

      batch.update(doc(db, "orders", orderId), updateData);
    });

    await batch.commit();
    AnalyticsCache.clearAll();
    await get().refreshOrders();
    await get().updatePaymentScores();
    toast({
      title: "Bulk Payment Recorded",
      description: `${orderIds.length} orders marked as paid`,
    });
  },

  markBulkCycleAsPaid: async (
    cycleId,
    orderIds,
    paidDate,
    reference,
    notes
  ) => {
    const batch = writeBatch(db);

    orderIds.forEach((orderId) => {
      const updateData: any = {
        paymentStatus: "Paid",
        isPaid: true,
        paidDate,
        daysOverdue: 0,
        paymentScore: 100,
      };

      if (reference) updateData.paymentReference = reference;
      if (notes) updateData.paymentNotes = notes;

      batch.update(doc(db, "orders", orderId), updateData);
    });

    await batch.commit();
    await get().refreshOrders();
    await get().updatePaymentScores();
    toast({
      title: "Bulk Payment Recorded",
      description: `${orderIds.length} orders marked as paid`,
    });
  },

  updatePaymentScores: async () => {
    const { orders } = get();
    const { companies } = useCompanyStore.getState();
    const batch = writeBatch(db);

    // Update individual order scores
    orders.forEach((order) => {
      if (order.isPaid || order.paymentStatus === "Paid") return;

      if (order.expectedPaymentDate) {
        const daysOverdue = calculateDaysOverdue(order.expectedPaymentDate);
        const paymentScore = calculatePaymentScore(daysOverdue);

        batch.update(doc(db, "orders", order.id), {
          daysOverdue,
          paymentScore,
          paymentStatus: daysOverdue > 7 ? "Overdue" : "Pending",
        });
      }
    });

    // Update company aggregate scores
    companies.forEach((company: Company) => {
      if (company.isBranch) return;

      const companyOrders = orders.filter(
        (o: Order) =>
          o.companyId === company.id && !o.isPaid && o.paymentStatus !== "Paid"
      );

      const {
        score,
        status,
        totalUnpaid,
        totalOutstanding,
        pendingBulkAmount,
      } = calculateCompanyPaymentScore(companyOrders);

      batch.update(doc(db, "companies", company.id), {
        currentPaymentScore: score,
        paymentStatus: status,
        totalUnpaidOrders: totalUnpaid,
        totalOutstandingAmount: totalOutstanding,
        pendingBulkPaymentAmount: pendingBulkAmount,
      });
    });

    await batch.commit();
    await get().fetchInitialData();
  },

  deleteOrder: async (orderId: string) => {
    await deleteDoc(doc(db, "orders", orderId));
    await deleteOrderFromSearch(orderId);
    await get().refreshOrders();
    toast({
      title: "Order Deleted",
      description: "The order has been permanently removed.",
    });
  },

  deleteAllOrders: async () => {
    const ordersCollection = collection(db, "orders");
    const ordersSnapshot = await getDocs(ordersCollection);

    const BATCH_SIZE = 500;
    const batches = [];

    for (let i = 0; i < ordersSnapshot.docs.length; i += BATCH_SIZE) {
      const batchDocs = ordersSnapshot.docs.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      batches.push(batch.commit());
    }

    await Promise.all(batches);
    set({ orders: [], ordersLastDoc: null, ordersHasMore: false });
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

    const docRef = await addDoc(collection(db, "products"), dataToSave);
    const newProduct = { id: docRef.id, ...productData, imageUrl };

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

    await updateDoc(doc(db, "products", productId), dataToUpdate);
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
    await deleteDoc(doc(db, "products", productId));
    set(
      produce((state: AppState) => {
        state.products = state.products.filter((p) => p.id !== productId);
      })
    );
    productCache.setProducts(get().products).catch(console.error);
  },

  deleteAllProducts: async () => {
    const productsCollection = collection(db, "products");
    const productsSnapshot = await getDocs(productsCollection);
    const batch = writeBatch(db);
    productsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    set({ products: [] });
    productCache.clearProducts().catch(console.error);
    toast({
      title: "All Products Deleted",
      description: "All products have been removed from the database.",
    });
  },

  // Category Actions
  addCategory: async (category) => {
    const docRef = await addDoc(collection(db, "categories"), category);
    const newCategory = { id: docRef.id, ...category };
    set(
      produce((state) => {
        state.categories.push(newCategory);
      })
    );
    return newCategory;
  },
  updateCategory: async (categoryId, categoryData) => {
    await updateDoc(doc(db, "categories", categoryId), categoryData);
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
    await deleteDoc(doc(db, "categories", categoryId));
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
    const docRef = await addDoc(collection(db, "taxes"), tax);
    set(
      produce((state: AppState) => {
        state.taxes.push({ id: docRef.id, ...tax });
      })
    );
  },
  updateTax: async (taxId, taxData) => {
    await updateDoc(doc(db, "taxes", taxId), taxData);
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
    await deleteDoc(doc(db, "taxes", taxId));
    set(
      produce((state: AppState) => {
        state.taxes = state.taxes.filter((t) => t.id !== taxId);
      })
    );
  },

  submitOrder: async (data: any) => {
    const { isPotentialClient, temporaryCompanyName, branchId, ...orderCore } =
      data;
    const { items, region } = orderCore;

    if (items.length === 0) {
      toast({ title: "Cannot submit an empty order.", variant: "destructive" });
      throw new Error("Cannot submit an empty order.");
    }

    // Calculate totals using the new pricing equation: Total = ((Quantity × Unit Price) - Discount) × 1.14
    const calculatedTotals = calculateOrderTotals(items.map((item: any) => ({
      quantity: item.quantity,
      price: item.price,
      discountValue: item.discountValue || 0,
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
      client?.region || region,
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
    const sanitizedItems = items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      taxId: item.taxId || null,
      taxRate: item.taxRate || 0,
      discountType: item.discountType || null,
      discountValue: item.discountValue || null,
    }));

    const newOrderPayload: any = {
      companyId: client ? client.parentCompanyId || client.id : "",
      branchId: !isPotentialClient ? branchId : null,
      orderDate: orderDate.toISOString(),
      deliveryDate: deliveryDate.toISOString(),
      paymentDueDate: orderCore.paymentDueDate?.toISOString() || null,
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

    const docRef = await addDoc(collection(db, "orders"), newOrderPayload);
    const createdOrder = { id: docRef.id, ...newOrderPayload } as Order;
    await syncOrderToSearch(createdOrder);
    await get().refreshOrders();
    await get().updatePaymentScores();

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

    await updateDoc(doc(db, "orders", orderId), {
      isPotentialClient: false,
      temporaryCompanyName: null,
      temporaryBranchName: null,
      companyId: newCompany.id,
      branchId: newCompany.id,
      companyName: newCompany.name,
      branchName: newCompany.name,
    });

    await get().fetchInitialData();
    await get().fetchInitialData();

    toast({
      title: "Client Registered",
      description: `${newCompany.name} has been successfully created and linked to the order.`,
    });
  },

  addVisit: async (visit) => {
    const newVisit = { ...visit, status: "Scheduled" as const };
    const docRef = await addDoc(collection(db, "visits"), newVisit);
    set(
      produce((state: AppState) => {
        state.visits.push({ id: docRef.id, ...newVisit });
      })
    );
    toast({ title: "Interaction Logged" });
  },

  updateVisit: async (visitId, visitData) => {
    await updateDoc(doc(db, "visits", visitId), visitData);
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

  deleteVisit: async (visitId: string) => {
    await deleteDoc(doc(db, "visits", visitId));
    set(
      produce((state: AppState) => {
        state.visits = state.visits.filter((v) => v.id !== visitId);
      })
    );
    toast({ title: "Interaction Deleted" });
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
    
    // Persist to Firestore
    try {
      const { NotificationService } = await import('@/lib/notification-service');
      await NotificationService.markAsRead(notificationId);
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
    
    // Persist to Firestore
    try {
      const { NotificationService } = await import('@/lib/notification-service');
      await NotificationService.snoozeNotification(notificationId, snoozeUntil);
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
    
    // Persist to Firestore
    try {
      const { NotificationService } = await import('@/lib/notification-service');
      await NotificationService.clearSnooze(notificationId);
    } catch (e) {
      console.error('Failed to clear snooze:', e);
    }
  },

  syncAllOrdersToSearch: async () => {
    try {
      const snapshot = await getDocs(collection(db, "orders"));
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      await bulkSyncOrdersToSearch(orders);
      toast({
        title: "Search Index Synced",
        description: `${orders.length} orders synced to search collection.`,
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
      const { productsLastDoc, productsHasMore } = get();
      
      if (!productsHasMore || !productsLastDoc) return;
      
      const q = query(
        collection(db, "products"),
        startAfter(productsLastDoc),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const newProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      
      set(
        produce((state: AppState) => {
          state.products.push(...newProducts);
          state.productsLastDoc = lastDoc;
          state.productsHasMore = snapshot.docs.length === 50;
        })
      );
      
      // Update cache
      productCache.setProducts(get().products).catch(console.error);
    } catch (e) {
      console.error("Error loading remaining products:", e);
    }
  },

  searchProducts: async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      await get().fetchInitialData();
      return;
    }
    
    try {
      const allSnapshot = await getDocs(collection(db, "products"));
      const allProducts = allSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      
      const searchLower = searchTerm.toLowerCase();
      const filtered = allProducts.filter(product =>
        (product.name && product.name.toLowerCase().includes(searchLower)) ||
        (product.variantName && product.variantName.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
        (product.category && product.category.toLowerCase().includes(searchLower))
      );
      
      set({ products: filtered });
    } catch (e) {
      console.error("Error searching products:", e);
    }
  },

  filterProductsByCategory: async (category: string) => {
    if (category === "All") {
      await get().fetchInitialData();
      return;
    }
    
    set({ loading: true });
    try {
      const q = query(
        collection(db, "products"),
        where("category", "==", category),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      
      set({ products, loading: false });
    } catch (e) {
      console.error("Error filtering products:", e);
      set({ loading: false });
    }
  },

  subscribeToNotifications: (userId: string) => {
    return () => {}; // Placeholder - use notification store instead
  },

  syncNotificationsToFirestore: async (userId: string) => {
    const { notifications } = get();
    const { NotificationService } = await import('@/lib/notification-service');
    
    const notificationsWithUser = notifications.map(n => ({
      ...n,
      userId,
    }));
    
    try {
      await NotificationService.createNotifications(notificationsWithUser);
    } catch (e) {
      console.error('Failed to sync notifications to Firestore:', e);
    }
  },
}));

