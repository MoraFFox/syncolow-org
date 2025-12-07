"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { useAlerts } from '../_hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { SectionCard } from './section-card';
import { EmptyState } from './empty-state';
import { PriorityBadge } from './priority-badge';
import { toAlertItems, sortAlertsByPriority, getAlertIcon, formatAlertMessage } from '../_lib/alert-utils';
import type { AlertItem } from '../_lib/types';
import type { Order, Product } from '@/lib/types';

const AlertRow = ({ alert }: { alert: AlertItem }) => {
  const Icon = getAlertIcon(alert.type);
  return (
    <Alert className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full border-l-4", "hover:bg-muted/50 transition-colors")}> 
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AlertTitle className="text-sm font-semibold">
              {alert.type === 'Overdue Payment' && (
                <span className="flex items-center gap-1 flex-wrap">
                  <span>Order</span>
                  <DrillTarget kind="order" payload={{ id: alert.data.id }} asChild>
                    <span className="hover:underline cursor-pointer">#{String(alert.data.id).slice(0, 5)}</span>
                  </DrillTarget>
                  <span>Overdue</span>
                </span>
              )}
              {alert.type === 'Low Stock' && (
                <span className="flex items-center gap-1 flex-wrap">
                  <DrillTarget kind="product" payload={{ id: alert.data.id, name: alert.data.name, stock: alert.data.stock }} asChild>
                    <span className="hover:underline cursor-pointer">{alert.data.name}</span>
                  </DrillTarget>
                  <span>is Low</span>
                </span>
              )}
              {alert.type === 'Inactive Client' && (
                <span className="flex items-center gap-1 flex-wrap">
                  <DrillTarget kind="company" payload={{ id: alert.data.id, name: alert.data.name }} asChild>
                    <span className="hover:underline cursor-pointer">{alert.data.name}</span>
                  </DrillTarget>
                  <span>is Inactive</span>
                </span>
              )}
              {alert.type === 'Tomorrow Delivery' && (
                <span className="flex items-center gap-1 flex-wrap">
                  <span>Delivery for</span>
                  <DrillTarget kind="order" payload={{ id: alert.data.id }} asChild>
                    <span className="hover:underline cursor-pointer">#{String(alert.data.id).slice(0, 5)}</span>
                  </DrillTarget>
                </span>
              )}
            </AlertTitle>
            <PriorityBadge priority={alert.priority} />
          </div>
          <AlertDescription className="text-xs">
            {formatAlertMessage(alert)}
          </AlertDescription>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 flex-shrink-0 self-end sm:self-center">
        <Link href={alert.link}>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">View Details</Button>
        </Link>
      </div>
    </Alert>
  );
};

export function Alerts() {
  const { data, isLoading } = useAlerts();

  const items = toAlertItems([
    ...(data?.overdue || []).map((o) => ({ type: 'Overdue Payment' as const, data: o as Pick<Order, 'id' | 'companyName'>, link: `/orders?filter=overdue` })),
    ...(data?.lowStock || []).map((p) => ({ type: 'Low Stock' as const, data: p as Pick<Product, 'id' | 'name' | 'stock'>, link: `/products/${p.id}` })),
    ...(data?.tomorrowDeliveries || []).map((o) => ({ type: 'Tomorrow Delivery' as const, data: o as Pick<Order, 'id' | 'deliveryDate'>, link: `/orders/${o.id}` })),
  ]);
  const sorted = sortAlertsByPriority(items);

  return (
    <SectionCard title="Alerts" description="Urgent action items and notifications." loading={isLoading}>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full p-4 border rounded-lg">
              <div className="flex items-start gap-3 w-full">
                <Skeleton className="h-4 w-4" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.length > 0 ? (
            sorted.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          ) : (
            <EmptyState title="No alerts right now" description="Everything is up-to-date." />
          )}
        </div>
      )}
    </SectionCard>
  );
}
