
"use client";
import { useEffect } from "react";
import dynamic from 'next/dynamic';
import { useOrderStore } from "@/store/use-order-store";
import Loading from "@/app/loading";
import { TodayAgenda } from "./_components/today-agenda";
import { Alerts } from "./_components/alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyLookahead } from "./_components/weekly-lookahead";
import { TodayOrderLog } from "./_components/today-order-log";
import { ActivityFeed } from "./_components/activity-feed";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const TodayVisitsMap = dynamic(() => import('./_components/today-visits-map').then(mod => mod.TodayVisitsMap), {
    ssr: false,
    loading: () => <Skeleton className="h-[500px] w-full" />
});

export default function DashboardPage() {
    const { 
        loading, 
        fetchInitialData 
    } = useOrderStore();
    
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    if (loading) {
        return <Loading />
    }
    
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold">Today's Dashboard</h1>
                <p className="text-muted-foreground">
                    Your daily hub for events, alerts, and actions.
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Today's Activities</CardTitle>
                            <CardDescription>A summary of today's visits, maintenance tasks, and deliveries.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <TodayAgenda />
                            <Separator />
                            <TodayOrderLog />
                        </CardContent>
                    </Card>
                    <TodayVisitsMap />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Key Insights</CardTitle>
                            <CardDescription>Urgent items and recent activities.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alerts />
                            <Separator />
                            <ActivityFeed />
                            <Separator />
                            <WeeklyLookahead />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
