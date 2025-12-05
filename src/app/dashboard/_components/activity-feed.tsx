"use client";

import { useRecentActivity } from '../_hooks/use-dashboard-data';
import { SectionCard } from './section-card';
import { ShoppingCart, Star, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import type { Order, Feedback, Company } from '@/lib/types';

type ActivityType = 'New Order' | 'New Feedback' | 'New Client';

type ActivityData =
  | Pick<Order, 'id' | 'companyId' | 'companyName' | 'orderDate'>
  | Pick<Feedback, 'id' | 'clientId' | 'message' | 'feedbackDate'>
  | Pick<Company, 'id' | 'name' | 'createdAt'>;

interface Activity {
  type: ActivityType;
  data: ActivityData;
  date: string;
}

interface ActivityItemProps {
    activity: Activity;
}

const ActivityIcon = ({ type }: { type: ActivityType }) => {
    switch (type) {
        case 'New Order': return <ShoppingCart className="h-5 w-5 text-primary" />;
        case 'New Feedback': return <Star className="h-5 w-5 text-yellow-500" />;
        case 'New Client': return <UserPlus className="h-5 w-5 text-blue-500" />;
        default: return null;
    }
};

const ActivityDetails = ({ activity }: { activity: Activity }) => {
    switch (activity.type) {
        case 'New Order':
            const order = activity.data as Pick<Order, 'id' | 'companyId' | 'companyName' | 'orderDate'>;
            return (
                <p className="text-sm">
                    New order from <DrillTarget kind="company" payload={{ id: order.companyId, name: order.companyName }} asChild>
                        <span className="font-medium hover:underline cursor-pointer text-primary">{order.companyName}</span>
                    </DrillTarget>.
                </p>
            )
        case 'New Feedback':
            const feedback = activity.data as Pick<Feedback, 'id' | 'clientId' | 'message' | 'feedbackDate'>;
            return (
                <p className="text-sm">
                    New feedback from <Link href={`/clients/${feedback.clientId}`} className="font-medium hover:underline">Client</Link>: "{feedback.message?.slice(0, 30)}..."
                </p>
            )
        case 'New Client':
            const client = activity.data as Pick<Company, 'id' | 'name' | 'createdAt'>;
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
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.date), { addSuffix: true })}</span>
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

  return (
    <SectionCard title="Recent Activity" description="A feed of the latest events in your system." loading={isLoading}>
      {isLoading ? (
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
      ) : (
        <div className="space-y-3">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))
          ) : (
            <EmptyState title="No recent activity" description="New orders, clients, and feedback will appear here." />
          )}
        </div>
      )}
    </SectionCard>
  );
}
