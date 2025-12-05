export const DASHBOARD_CONFIG = {
  STOCK_THRESHOLD: 10,
  ALERT_LIMIT: 5,
  CACHE_STALE_TIME: 1000 * 60 * 5,
  REFRESH_INTERVAL: 1000 * 60 * 5,
  SCROLL_AREA_HEIGHTS: {
    alerts: 400,
    activityFeed: 400,
    todayOrderLog: 200,
    todayAgenda: 300,
  },
  KPI_CARD_VARIANTS: {
    info: {
      card: "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-900/20 dark:border-blue-900",
      icon: "text-blue-600 dark:text-blue-400",
    },
    success: {
      card: "border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-900/20 dark:border-green-900",
      icon: "text-green-600 dark:text-green-400",
    },
    warning: {
      card: "border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-900/20 dark:border-orange-900",
      icon: "text-orange-600 dark:text-orange-400",
    },
    destructive: {
      card: "border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/10 dark:to-red-900/20 dark:border-red-900",
      icon: "text-red-600 dark:text-red-400",
    },
    default: {
      card: "border-border",
      icon: "text-muted-foreground",
    },
  },
  PRIORITY_LEVELS: {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  },
} as const;

export type PriorityLevelKey = keyof typeof DASHBOARD_CONFIG["PRIORITY_LEVELS"];
