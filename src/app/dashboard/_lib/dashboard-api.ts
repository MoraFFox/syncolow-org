/** @format */

import { supabase } from "@/lib/supabase";
import { startOfDay, endOfDay } from "date-fns";
import type { MaintenanceVisit, VisitCall, Company } from "@/lib/types";
import { DASHBOARD_CONFIG } from "../_lib/dashboard-config";
import type { VisitWithCoords } from "../_lib/types";
import { geocodeService } from "@/services/geocode-service";

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
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      const [
        maintenanceResult,
        deliveriesResult,
        overdueResult,
        lowStockResult,
      ] = await Promise.all([
        supabase
          .from("maintenance")
          .select("*", { count: "exact", head: true })
          .eq("status", "Scheduled")
          .gte("date", todayStart)
          .lte("date", todayEnd),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .neq("status", "Delivered")
          .neq("status", "Cancelled")
          .gte("deliveryDate", todayStart)
          .lte("deliveryDate", todayEnd),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("paymentStatus", "Overdue"),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .lt("stock", DASHBOARD_CONFIG.STOCK_THRESHOLD),
      ]);

      return {
        scheduledMaintenanceToday: maintenanceResult.count || 0,
        deliveriesToday: deliveriesResult.count || 0,
        overduePayments: overdueResult.count || 0,
        lowStock: lowStockResult.count || 0,
      };
    } catch {
      return {
        scheduledMaintenanceToday: 0,
        deliveriesToday: 0,
        overduePayments: 0,
        lowStock: 0,
      };
    }
  },

  getTodayAgenda: async (): Promise<AgendaItem[]> => {
    try {
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
          .lte("date", todayEnd),
      ]);

      const maintenanceItems: AgendaItem[] = (maintenanceResult.data || []).map(
        (item) => ({
          type: "Maintenance",
          data: item as MaintenanceVisit,
          clientName: item.branchName,
          date: item.date as string,
        })
      );

      const visitItems: AgendaItem[] = (visitsResult.data || []).map(
        (item) => ({
          type: "Visit",
          data: item as VisitCall,
          clientName: item.clientName,
          date: item.date,
        })
      );

      return [...maintenanceItems, ...visitItems].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch {
      return [];
    }
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
      ...(orders || []).map((o) => ({
        type: "New Order",
        data: o,
        date: o.orderDate,
      })),
      ...(feedback || []).map((f) => ({
        type: "New Feedback",
        data: f,
        date: f.feedbackDate,
      })),
      ...(companies || []).map((c) => ({
        type: "New Client",
        data: c,
        date: c.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
        .lte("date", end),
    ]);

    return {
      deliveries: deliveries.count || 0,
      maintenance: maintenance.count || 0,
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

  getTodayVisits: async (): Promise<VisitWithCoords[]> => {
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      const [visitsResult, maintenanceResult, companiesResult] =
        await Promise.all([
          supabase
            .from("visits")
            .select("id, clientName, address, outcome, status, date")
            .neq("status", "Completed")
            .gte("date", todayStart)
            .lte("date", todayEnd),
          supabase
            .from("maintenance")
            .select(
              "id, branchName, companyName, branchId, companyId, maintenanceNotes, status, date"
            )
            .eq("status", "Scheduled")
            .gte("date", todayStart)
            .lte("date", todayEnd),
          supabase
            .from("companies")
            .select("id, name, location, warehouseLocation"),
        ]);

      const companiesIndex = new Map<
        string,
        Pick<Company, "id" | "name" | "location" | "warehouseLocation">
      >(
        (
          (companiesResult.data || []) as Pick<
            Company,
            "id" | "name" | "location" | "warehouseLocation"
          >[]
        ).map((c) => [c.id, c])
      );

      const visitItems: VisitWithCoords[] = (
        (visitsResult.data || []) as Pick<
          VisitCall,
          "id" | "clientName" | "address" | "outcome" | "status" | "date"
        >[]
      ).map((v) => ({
        id: v.id,
        clientName: v.clientName || "Custom",
        address: v.address || "",
        outcome: v.outcome,
        type: "Visit",
        date: v.date,
        coords: null,
      }));

      const maintenanceItems: VisitWithCoords[] = (
        (maintenanceResult.data || []) as Pick<
          MaintenanceVisit,
          | "id"
          | "branchName"
          | "companyName"
          | "branchId"
          | "companyId"
          | "maintenanceNotes"
          | "status"
          | "date"
        >[]
      )
        .map((m) => {
          const entity =
            companiesIndex.get(m.branchId) || companiesIndex.get(m.companyId);
          const address = entity?.location || entity?.warehouseLocation || "";
          return {
            id: m.id,
            clientName: m.branchName || m.companyName || "Maintenance",
            address,
            outcome: m.maintenanceNotes,
            type: "Maintenance",
            date: m.date,
            coords: null,
          } as VisitWithCoords;
        })
        .filter((v: VisitWithCoords) => !!v.address);

      const all = [...visitItems, ...maintenanceItems];
      const geocoded = await Promise.all(
        all.map(async (item) => {
          const coords = item.address
            ? await geocodeService.geocode(item.address)
            : null;
          return { ...item, coords } as VisitWithCoords;
        })
      );

      return geocoded;
    } catch {
      return [];
    }
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
        .limit(DASHBOARD_CONFIG.ALERT_LIMIT),

      supabase
        .from("products")
        .select("id, name, stock")
        .lt("stock", DASHBOARD_CONFIG.STOCK_THRESHOLD)
        .limit(DASHBOARD_CONFIG.ALERT_LIMIT),

      supabase
        .from("orders")
        .select("id, deliveryDate")
        .neq("status", "Delivered")
        .neq("status", "Cancelled")
        .gte("deliveryDate", tomorrowStart.toISOString())
        .lte("deliveryDate", tomorrowEnd.toISOString())
        .limit(DASHBOARD_CONFIG.ALERT_LIMIT),
    ]);

    return {
      overdue: overdue.data || [],
      lowStock: lowStock.data || [],
      tomorrowDeliveries: tomorrowDeliveries.data || [],
    };
  },
};
