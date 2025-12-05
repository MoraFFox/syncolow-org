import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../_lib/dashboard-api";
import { DASHBOARD_CONFIG } from "../_lib/dashboard-config";

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: dashboardApi.getMetrics,
    staleTime: DASHBOARD_CONFIG.CACHE_STALE_TIME,
    refetchInterval: DASHBOARD_CONFIG.REFRESH_INTERVAL,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useTodayAgenda = () => {
  return useQuery({
    queryKey: ["dashboard", "agenda"],
    queryFn: dashboardApi.getTodayAgenda,
    staleTime: DASHBOARD_CONFIG.CACHE_STALE_TIME,
    refetchInterval: DASHBOARD_CONFIG.REFRESH_INTERVAL,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useRecentActivity = () => {
  return useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: dashboardApi.getRecentActivity,
    staleTime: DASHBOARD_CONFIG.CACHE_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useWeeklyStats = () => {
  return useQuery({
    queryKey: ["dashboard", "weekly"],
    queryFn: dashboardApi.getWeeklyStats,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useTodayDeliveries = () => {
  return useQuery({
    queryKey: ["dashboard", "today-deliveries"],
    queryFn: dashboardApi.getTodayDeliveries,
    staleTime: DASHBOARD_CONFIG.CACHE_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useAlerts = () => {
  return useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: dashboardApi.getAlerts,
    staleTime: DASHBOARD_CONFIG.CACHE_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useTodayVisits = () => {
  return useQuery({
    queryKey: ["dashboard", "today-visits"],
    queryFn: dashboardApi.getTodayVisits,
    staleTime: DASHBOARD_CONFIG.CACHE_STALE_TIME,
    refetchInterval: DASHBOARD_CONFIG.REFRESH_INTERVAL,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useDashboardData = () => {
  const metrics = useDashboardMetrics();
  const agenda = useTodayAgenda();
  const activity = useRecentActivity();
  const weekly = useWeeklyStats();
  return { metrics, agenda, activity, weekly };
};
