import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../_lib/dashboard-api";

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: dashboardApi.getMetrics,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
};

export const useTodayAgenda = () => {
  return useQuery({
    queryKey: ["dashboard", "agenda"],
    queryFn: dashboardApi.getTodayAgenda,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
};

export const useRecentActivity = () => {
  return useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: dashboardApi.getRecentActivity,
    staleTime: 1000 * 60 * 5,
  });
};

export const useWeeklyStats = () => {
  return useQuery({
    queryKey: ["dashboard", "weekly"],
    queryFn: dashboardApi.getWeeklyStats,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useTodayDeliveries = () => {
  return useQuery({
    queryKey: ["dashboard", "today-deliveries"],
    queryFn: dashboardApi.getTodayDeliveries,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAlerts = () => {
  return useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: dashboardApi.getAlerts,
    staleTime: 1000 * 60 * 5,
  });
};
