
"use client";

import { useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { isWithinInterval, addDays, parseISO, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Truck, Wrench } from 'lucide-react';

export function WeeklyLookahead() {
    const { orders } = useOrderStore();
    const { maintenanceVisits } = useMaintenanceStore();

    const upcomingEvents = useMemo(() => {
        const now = new Date();
        const nextSevenDays = {
            start: now,
            end: addDays(now, 7)
        };

        const deliveries = orders.filter(o => 
            o.deliveryDate && 
            (o.status === 'Pending' || o.status === 'Processing' || o.status === 'Shipped') &&
            isWithinInterval(new Date(o.deliveryDate), nextSevenDays)
        ).length;

        const maintenance = (maintenanceVisits || []).filter(v => {
            if (v.status !== 'Scheduled' || !v.date) return false;
            const visitDate = typeof v.date === 'string' ? parseISO(v.date) : v.date;
            if (!isValid(visitDate)) return false;
            return isWithinInterval(visitDate, nextSevenDays);
        }).length;

        return { deliveries, maintenance };
    }, [orders, maintenanceVisits]);

    return (
        <div>
            <CardHeader className="p-0 mb-4">
                <CardTitle className="flex items-center gap-2">
                     <Calendar className="h-5 w-5 text-primary" />
                    Upcoming Week
                </CardTitle>
                <CardDescription>A summary of key events in the next 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span>Deliveries</span>
                    </div>
                    <span className="font-bold">{upcomingEvents.deliveries}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                     <div className="flex items-center gap-2 text-sm">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span>Maintenance</span>
                    </div>
                    <span className="font-bold">{upcomingEvents.maintenance}</span>
                </div>
            </CardContent>
        </div>
    );
}
