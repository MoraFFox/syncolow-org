"use client";

import { useRecentActivity } from '../_hooks/use-dashboard-data';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShoppingCart, Star, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { formatRelative } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Skeleton } from '@/components/ui/skeleton';

type ActivityType = 'New Order' | 'New Feedback' | 'New Client';

interface Activity {
  type: ActivityType;
  data: any;
  date: Date;
}

interface ActivityItemProps {
    activity: Activity;
}

const ActivityIcon = ({ type }: { type: ActivityType }) => {
    switch (type) {
        case 'New Order': return <ShoppingCart className="h-5 w-5 text-green-500" />;
        case 'New Feedback': return <Star className="h-5 w-5 text-yellow-500" />;
        case 'New Client': return <UserPlus className="h-5 w-5 text-blue-500" />;
        default: return null;
    }
};

const ActivityDetails = ({ activity }: { activity: Activity }) => {
    switch (activity.type) {
        case 'New Order':
            const order = activity.data;
            return (
                <p className="text-sm">
                    New order from <DrillTarget kind="company" payload={{ id: order.companyId, name: order.companyName }} asChild>
                        <span className="font-medium hover:underline cursor-pointer text-primary">{order.companyName}</span>
                    </DrillTarget>.
                </p>
            )
        case 'New Feedback':
            const feedback = activity.data;
            return (
                <p className="text-sm">
                    New feedback from <Link href={`/clients/${feedback.clientId}`} className="font-medium hover:underline">Client</Link>: "{feedback.message?.slice(0, 30)}..."
                </p>
            )
        case 'New Client':
            const client = activity.data;
            return (
                <p className="text-sm">
                    Welcome <Link href={`/clients/${client.id}`} className="font-medium hover:underline">{client.name}</Link>!
                </p>
            )
        default: return null;
    }
}

const ActivityLink = ({activity}: {activity: Activity}) => {
    switch (activity.type) {
        case 'New Order': return `/orders/${activity.data.id}`;
        case 'New Feedback': return `/feedback`;
        case 'New Client': return `/clients/${activity.data.id}`;
        default: return '#';
    }
}

const ActivityItem = ({ activity }: ActivityItemProps) => {
    return (
        <div className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors">
             <div className="flex items-start gap-4">
                <div className="pt-1">
                    <ActivityIcon type={activity.type} />
                </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm">{activity.type}</p>
                        <span className="text-xs text-muted-foreground">{formatRelative(new Date(activity.date), new Date())}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <ActivityDetails activity={activity} />
                    </div>
                    <div className="mt-2">
                         <Link href={ActivityLink({activity})}>
                            <Button variant="secondary" size="sm" className="text-xs h-7">
                                View
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function ActivityFeed() {
    const { data: recentActivities, isLoading } = useRecentActivity();

    if (isLoading) {
        return (
             <div>
                <CardHeader className="p-0 mb-4">
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>A feed of the latest events in your system.</CardDescription>
                </CardHeader>
                <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
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
        )
    }

    return (
        <div>
            <CardHeader className="p-0 mb-4">
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>A feed of the latest events in your system.</CardDescription>
            </CardHeader>
            <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                    {recentActivities && recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                            <ActivityItem key={index} activity={activity} />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 rounded-lg border-2 border-dashed py-10">
                            <UserPlus className="h-12 w-12 mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="font-semibold">No recent activity.</p>
                            <p className="text-sm">New orders, clients, and feedback will appear here.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}