
"use client";

import { useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { isAfter, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShoppingCart, Star, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { formatRelative } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Company, Order, Feedback } from '@/lib/types';

type ActivityType = 'New Order' | 'New Feedback' | 'New Client';

interface Activity {
  type: ActivityType;
  data: any;
  date: Date;
}

interface ActivityItemProps {
    activity: Activity;
    companies: Company[];
}

const ActivityIcon = ({ type }: { type: ActivityType }) => {
    switch (type) {
        case 'New Order': return <ShoppingCart className="h-5 w-5 text-green-500" />;
        case 'New Feedback': return <Star className="h-5 w-5 text-yellow-500" />;
        case 'New Client': return <UserPlus className="h-5 w-5 text-blue-500" />;
        default: return null;
    }
};

const ActivityDetails = ({ activity, companies }: { activity: Activity, companies: Company[] }) => {
    switch (activity.type) {
        case 'New Order':
            const order = activity.data as Order;
            return (
                <p className="text-sm">
                    New order from <Link href={`/clients/${order.companyId}`} className="font-medium hover:underline">{order.companyName}</Link>.
                </p>
            )
        case 'New Feedback':
            const feedback = activity.data as Feedback;
            const company = companies.find(c => c.id === feedback.clientId);
            return (
                <p className="text-sm">
                    New feedback from <Link href={`/clients/${feedback.clientId}`} className="font-medium hover:underline">{company?.name}</Link>: "{feedback.message.slice(0, 30)}..."
                </p>
            )
        case 'New Client':
            const client = activity.data as Company;
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
        case 'New Order': return `/orders/${(activity.data as Order).id}`;
        case 'New Feedback': return `/feedback`;
        case 'New Client': return `/clients/${(activity.data as Company).id}`;
        default: return '#';
    }
}

const ActivityItem = ({ activity, companies }: ActivityItemProps) => {
    return (
        <div className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors">
             <div className="flex items-start gap-4">
                <div className="pt-1">
                    <ActivityIcon type={activity.type} />
                </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm">{activity.type}</p>
                        <span className="text-xs text-muted-foreground">{formatRelative(activity.date, new Date())}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <ActivityDetails activity={activity} companies={companies} />
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
    const { orders } = useOrderStore();
    const { companies, feedback } = useCompanyStore();

    const recentActivities: Activity[] = useMemo(() => {
        const threeDaysAgo = subDays(new Date(), 3);

        const recentOrders: Activity[] = orders
            .filter(o => isAfter(new Date(o.orderDate), threeDaysAgo))
            .map(o => ({ type: 'New Order', data: o, date: new Date(o.orderDate) }));

        const recentFeedback: Activity[] = feedback
            .filter(f => isAfter(new Date(f.feedbackDate), threeDaysAgo))
            .map(f => ({ type: 'New Feedback', data: f, date: new Date(f.feedbackDate) }));

        const knownCompanyIds = new Set(orders.filter(o => !isAfter(new Date(o.orderDate), threeDaysAgo)).map(o => o.companyId));
        const newClientOrders = orders.filter(o => isAfter(new Date(o.orderDate), threeDaysAgo) && !knownCompanyIds.has(o.companyId));
        const newClientsFromOrders: Activity[] = Array.from(new Set(newClientOrders.map(o => o.companyId))).map(companyId => {
            const order = newClientOrders.find(o => o.companyId === companyId)!;
            const company = companies.find(c => c.id === companyId);
            return { type: 'New Client', data: { ...company, id: companyId }, date: new Date(order.orderDate) };
        });

        return [...recentOrders, ...recentFeedback, ...newClientsFromOrders]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 10);
    }, [orders, companies, feedback]);

    return (
        <div>
            <CardHeader className="p-0 mb-4">
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>A feed of the latest events in your system.</CardDescription>
            </CardHeader>
            <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                    {recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                            <ActivityItem key={index} activity={activity} companies={companies} />
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

    