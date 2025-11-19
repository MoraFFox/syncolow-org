

"use client";

import { useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Order } from '@/lib/types';

const OrderCard = ({ order }: { order: Order }) => {
    return (
        <div className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
                 <div className="pt-1">
                    <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm">Order #{order.id.slice(0, 5)} for {order.companyName}</p>
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
    const { orders } = useOrderStore();

    const todayDeliveries = useMemo(() => {
        return orders.filter(o => o.deliveryDate && o.status !== 'Delivered' && o.status !== 'Cancelled' && isToday(new Date(o.deliveryDate)));
    }, [orders]);

    return (
        <div>
            <CardHeader className="p-0 mb-4">
                <CardTitle>Today's Delivery Log</CardTitle>
                <CardDescription>All orders scheduled for delivery today.</CardDescription>
            </CardHeader>
            <ScrollArea className="h-[200px] w-full pr-4">
                <div className="space-y-3">
                    {todayDeliveries.length > 0 ? (
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
