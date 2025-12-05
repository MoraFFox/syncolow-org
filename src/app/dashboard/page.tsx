/** @format */

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";
import { DashboardHeader } from "./_components/dashboard-header";
import { KpiCard } from "./_components/kpi-card";
import { useDashboardMetrics } from "./_hooks/use-dashboard-data";
import { TodayAgenda } from "./_components/today-agenda";
import { Alerts } from "./_components/alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyLookahead } from "./_components/weekly-lookahead";
import { TodayOrderLog } from "./_components/today-order-log";
import { ActivityFeed } from "./_components/activity-feed";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// Removed unused Button import
import { Wrench, Truck, AlertTriangle, Package } from "lucide-react";
import { ErrorBoundary } from "./_components/error-boundary";
//

const TodayVisitsMap = dynamic(
  () =>
    import("./_components/today-visits-map").then((mod) => mod.TodayVisitsMap),
  {
    ssr: false,
    loading: () => <Skeleton className='h-[500px] w-full' />,
  }
);

export default function DashboardPage() {
  const {
    data: kpis,
    isLoading,
    refetch,
    isRefetching,
  } = useDashboardMetrics();
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const defaultKpis = {
    scheduledMaintenanceToday: 0,
    deliveriesToday: 0,
    overduePayments: 0,
    lowStock: 0,
  };

  const metrics = kpis || defaultKpis;

  useEffect(() => {
    if (!isLoading && kpis) setLastUpdated(new Date());
  }, [isLoading, kpis]);

  return (
    <div className='flex flex-col gap-8'>
      <DashboardHeader
        onRefresh={refetch}
        isRefreshing={isRefetching}
        userName={user?.displayName || "User"}
        lastUpdated={lastUpdated}
      />

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Link href='/maintenance'>
          <KpiCard
            title='Scheduled Maintenance Today'
            value={metrics.scheduledMaintenanceToday}
            icon={Wrench}
            loading={isLoading}
            variant='info'
          />
        </Link>
        <Link href='/orders?status=Pending'>
          <KpiCard
            title='Deliveries Today'
            value={metrics.deliveriesToday}
            icon={Truck}
            loading={isLoading}
            variant='success'
          />
        </Link>
        <Link href='/orders?paymentStatus=Overdue'>
          <KpiCard
            title='Overdue Payments'
            value={metrics.overduePayments}
            icon={AlertTriangle}
            loading={isLoading}
            variant='destructive'
          />
        </Link>
        <Link href='/products?stock=low'>
          <KpiCard
            title='Low Stock Items'
            value={metrics.lowStock}
            icon={Package}
            loading={isLoading}
            variant='warning'
          />
        </Link>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-start'>
        <div className='lg:col-span-2 space-y-8'>
          <Card>
            <CardHeader>
              <CardTitle>Today's Activities</CardTitle>
              <CardDescription>
                A summary of today's visits, maintenance tasks, and deliveries.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <ErrorBoundary>
                <TodayAgenda />
              </ErrorBoundary>
              <Separator />
              <ErrorBoundary>
                <TodayOrderLog />
              </ErrorBoundary>
            </CardContent>
          </Card>
          <ErrorBoundary>
            <TodayVisitsMap />
          </ErrorBoundary>
        </div>
        <div className='lg:col-span-1 space-y-8'>
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>
                Urgent items and recent activities.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <ErrorBoundary>
                <Alerts />
              </ErrorBoundary>
              <Separator />
              <ErrorBoundary>
                <ActivityFeed />
              </ErrorBoundary>
              <Separator />
              <ErrorBoundary>
                <WeeklyLookahead />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
