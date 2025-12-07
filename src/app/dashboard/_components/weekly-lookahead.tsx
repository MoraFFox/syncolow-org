"use client";

import { SectionCard } from './section-card';
import { Calendar, Truck, Wrench } from 'lucide-react';
import { useWeeklyStats } from '../_hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';

export function WeeklyLookahead() {
  const { data: stats, isLoading } = useWeeklyStats();

  return (
    <SectionCard title="Upcoming Week" description="A summary of key events in the next 7 days." icon={<Calendar className="h-5 w-5 text-primary" />} loading={isLoading}>
      {isLoading ? (
        <div className="space-y-4">
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
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>Deliveries</span>
            </div>
            <span className="font-bold">{stats?.deliveries || 0}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span>Maintenance</span>
            </div>
            <span className="font-bold">{stats?.maintenance || 0}</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
