

"use client";

import { Button } from '@/components/ui/button';
import { ScrollIndicator } from './scroll-indicator';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { useTodayDeliveries } from '../_hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionCard } from './section-card';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { Order } from '@/lib/types';
import { DASHBOARD_CONFIG } from '../_lib/dashboard-config';
const OrderCard = ({ order }: { order: Pick<Order, 'id' | 'companyId' | 'companyName'> }) => {
  return (
    <div className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="pt-1">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div className="font-semibold text-sm flex items-center gap-1 flex-wrap">
              <span>Order</span>
              <DrillTarget kind="order" payload={{ id: order.id }} asChild>
                <span className="text-primary hover:underline cursor-pointer">#{order.id.slice(0, 5)}</span>
              </DrillTarget>
              <span>for</span>
              <DrillTarget kind="company" payload={{ id: order.companyId, name: order.companyName }} asChild>
                <span className="text-primary hover:underline cursor-pointer">{order.companyName}</span>
              </DrillTarget>
            </div>
          </div>
          <div className="mt-2">
            <Link href={`/orders/${order.id}`}>
              <Button variant="secondary" size="sm" className="text-xs h-7">
                View Order
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TodayOrderLog() {
  const { data: todayDeliveries, isLoading } = useTodayDeliveries();

  return (
    <SectionCard title="Today's Delivery Log" description="All orders scheduled for delivery today." loading={isLoading}>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-start gap-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ScrollIndicator height={DASHBOARD_CONFIG.SCROLL_AREA_HEIGHTS.todayOrderLog}>
          <div className="space-y-3 pr-4">
            {todayDeliveries && todayDeliveries.length > 0 ? (
              todayDeliveries.map((order: Pick<Order, 'id' | 'companyId' | 'companyName'>) => <OrderCard key={order.id} order={order} />)
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No deliveries scheduled for today.</p>
            )}
          </div>
        </ScrollIndicator>
      )}
    </SectionCard>
  );
}
