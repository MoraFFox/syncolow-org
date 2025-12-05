/** @format */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DASHBOARD_CONFIG } from "../_lib/dashboard-config";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  className?: string;
  trend?: number;
  sparklineData?: number[];
}

const variantStyles = {
  default: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.default.card,
  destructive: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.destructive.card,
  success: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.success.card,
  warning: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.warning.card,
  info: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.info.card,
};

const iconStyles = {
  default: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.default.icon,
  destructive: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.destructive.icon,
  success: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.success.icon,
  warning: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.warning.icon,
  info: DASHBOARD_CONFIG.KPI_CARD_VARIANTS.info.icon,
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  loading = false,
  variant = "default",
  className,
  trend,
  sparklineData,
}: KpiCardProps) {
  const trendPositive = typeof trend === "number" ? trend >= 0 : undefined;
  const TrendIcon = trendPositive ? ArrowUpRight : ArrowDownRight;
  const trendColor = trendPositive
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        variantStyles[variant],
        className
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium flex items-center gap-2'>
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", iconStyles[variant])} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className='h-8 w-20' />
        ) : (
          <div className='flex items-end justify-between gap-2'>
            <div>
              <div
                className={cn(
                  "text-3xl font-bold leading-tight",
                  iconStyles[variant]
                )}
              >
                {value}
              </div>
              {typeof trend === "number" && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs mt-1",
                    trendColor
                  )}
                >
                  <TrendIcon className='h-3.5 w-3.5' />
                  <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
              )}
            </div>
            {Array.isArray(sparklineData) && sparklineData.length > 1 && (
              <div className='h-10 w-24'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={sparklineData.map((v) => ({ v }))}>
                    <Area
                      type='monotone'
                      dataKey='v'
                      strokeWidth={2}
                      stroke='currentColor'
                      fill='currentColor'
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
