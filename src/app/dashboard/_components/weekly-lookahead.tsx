
"use client";

import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Truck, Wrench } from 'lucide-react';
import { useWeeklyStats } from '../_hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';

export function WeeklyLookahead() {
    const { data: stats, isLoading } = useWeeklyStats();

    if (isLoading) {
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
                        <Skeleton className="h-5 w-10" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                         <div className="flex items-center gap-2 text-sm">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span>Maintenance</span>
                        </div>
                        <Skeleton className="h-5 w-10" />
                    </div>
                </CardContent>
            </div>
        );
    }

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
                    <span className="font-bold">{stats?.deliveries || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                     <div className="flex items-center gap-2 text-sm">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span>Maintenance</span>
                    </div>
                    <span className="font-bold">{stats?.maintenance || 0}</span>
                </div>
            </CardContent>
        </div>
    );
}
