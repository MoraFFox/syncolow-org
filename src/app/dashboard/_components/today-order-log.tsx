

"use client";

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { useTodayDeliveries } from '../_hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { Order } from '@/lib/types';
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

    if (isLoading) {
        return (
            <div>
                <CardHeader className="p-0 mb-4">
                    <CardTitle>Today's Delivery Log</CardTitle>
                    <CardDescription>All orders scheduled for delivery today.</CardDescription>
                </CardHeader>
                <ScrollArea className="h-[200px] w-full pr-4">
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
                </ScrollArea>
            </div>
        );
    }

    return (
        <div>
            <CardHeader className="p-0 mb-4">
                <CardTitle>Today's Delivery Log</CardTitle>
                <CardDescription>All orders scheduled for delivery today.</CardDescription>
            </CardHeader>
            <ScrollArea className="h-[200px] w-full pr-4">
                <div className="space-y-3">
                    {todayDeliveries && todayDeliveries.length > 0 ? (
                        todayDeliveries.map(order => (
                            <OrderCard key={order.id} order={order} />
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No deliveries scheduled for today.</p>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
