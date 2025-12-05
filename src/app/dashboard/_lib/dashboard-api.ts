import { supabase } from "@/lib/supabase";
import { startOfDay, endOfDay } from "date-fns";
import type { MaintenanceVisit, VisitCall } from "@/lib/types";

export interface DashboardMetrics {
  scheduledMaintenanceToday: number;
  deliveriesToday: number;
  overduePayments: number;
  lowStock: number;
}

export interface AgendaItem {
  type: "Maintenance" | "Visit";
  data: MaintenanceVisit | VisitCall;
  clientName?: string;
  date: string;
}

export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    // Parallelize count queries for performance
    const [
      maintenanceResult,
      deliveriesResult,
      overdueResult,
      lowStockResult
    ] = await Promise.all([
      // Scheduled Maintenance Today
      supabase
        .from("maintenance")
        .select("*", { count: "exact", head: true })
        .eq("status", "Scheduled")
        .gte("date", todayStart)
        .lte("date", todayEnd),

      // Deliveries Today
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .neq("status", "Delivered")
        .neq("status", "Cancelled")
        .gte("deliveryDate", todayStart)
        .lte("deliveryDate", todayEnd),

      // Overdue Payments
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("paymentStatus", "Overdue"),

      // Low Stock Items (Note: This might still need a full scan if not indexed, but better than fetching all data)
      // Supabase doesn't support .lt('stock', 10) on a head query easily if stock is computed or JSON. 
      // Assuming stock is a column.
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .lt("stock", 10)
    ]);

    return {
      scheduledMaintenanceToday: maintenanceResult.count || 0,
      deliveriesToday: deliveriesResult.count || 0,
      overduePayments: overdueResult.count || 0,
      lowStock: lowStockResult.count || 0,
    };
  },

  getTodayAgenda: async (): Promise<AgendaItem[]> => {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    const [maintenanceResult, visitsResult] = await Promise.all([
      supabase
        .from("maintenance")
        .select("*")
        .eq("status", "Scheduled")
        .gte("date", todayStart)
        .lte("date", todayEnd),
      
      supabase
        .from("visits")
        .select("*")
        .neq("status", "Completed")
        .gte("date", todayStart)
        .lte("date", todayEnd)
    ]);

    const maintenanceItems: AgendaItem[] = (maintenanceResult.data || []).map((item) => ({
      type: "Maintenance",
      data: item as MaintenanceVisit,
      clientName: item.branchName, // Assuming branchName is the display name
      date: item.date as string
    }));

    const visitItems: AgendaItem[] = (visitsResult.data || []).map((item) => ({
      type: "Visit",
      data: item as VisitCall,
      clientName: item.clientName,
      date: item.date
    }));

    return [...maintenanceItems, ...visitItems].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  },

  getRecentActivity: async () => {
    // Fetch last 5 orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id, companyId, companyName, orderDate")
      .order("orderDate", { ascending: false })
      .limit(5);

    // Fetch last 5 feedback
    const { data: feedback } = await supabase
      .from("feedback")
      .select("id, clientId, message, feedbackDate")
      .order("feedbackDate", { ascending: false })
      .limit(5);

    // Fetch last 5 new clients (companies created recently)
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, createdAt")
      .order("createdAt", { ascending: false })
      .limit(5);

    const activities = [
      ...(orders || []).map(o => ({ type: 'New Order', data: o, date: o.orderDate })),
      ...(feedback || []).map(f => ({ type: 'New Feedback', data: f, date: f.feedbackDate })),
      ...(companies || []).map(c => ({ type: 'New Client', data: c, date: c.createdAt }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

    return activities;
  },

  getWeeklyStats: async () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const start = today.toISOString();
    const end = nextWeek.toISOString();

    const [deliveries, maintenance] = await Promise.all([
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .neq("status", "Delivered")
        .neq("status", "Cancelled")
        .gte("deliveryDate", start)
        .lte("deliveryDate", end),
      
      supabase
        .from("maintenance")
        .select("*", { count: "exact", head: true })
        .eq("status", "Scheduled")
        .gte("date", start)
        .lte("date", end)
    ]);

    return {
      deliveries: deliveries.count || 0,
      maintenance: maintenance.count || 0
    };
  },

  getTodayDeliveries: async () => {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    const { data } = await supabase
      .from("orders")
      .select("id, companyId, companyName, deliveryDate, status")
      .neq("status", "Delivered")
      .neq("status", "Cancelled")
      .gte("deliveryDate", todayStart)
      .lte("deliveryDate", todayEnd);
      
    return data || [];
  },

  getAlerts: async () => {
    const tomorrowStart = startOfDay(new Date());
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = endOfDay(new Date());
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const [overdue, lowStock, tomorrowDeliveries] = await Promise.all([
      supabase
        .from("orders")
        .select("id, companyName, paymentStatus")
        .eq("paymentStatus", "Overdue")
        .limit(5),
      
      supabase
        .from("products")
        .select("id, name, stock")
        .lt("stock", 10)
        .limit(5),

      supabase
        .from("orders")
        .select("id, deliveryDate")
        .neq("status", "Delivered")
        .neq("status", "Cancelled")
        .gte("deliveryDate", tomorrowStart.toISOString())
        .lte("deliveryDate", tomorrowEnd.toISOString())
        .limit(5)
    ]);

    return {
      overdue: overdue.data || [],
      lowStock: lowStock.data || [],
      tomorrowDeliveries: tomorrowDeliveries.data || []
    };
  }
};
