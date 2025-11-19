"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { differenceInDays, parseISO, isValid, format, subMonths } from 'date-fns';

export function DelayAnalytics() {
  const { maintenanceVisits } = useMaintenanceStore();

  const delayStats = useMemo(() => {
    console.log('All maintenance visits:', maintenanceVisits.length);
    const completedVisits = maintenanceVisits.filter(v => v.status === 'Completed');
    console.log('Completed visits:', completedVisits.length);
    const visitsWithDelay = completedVisits.filter(v => {
      // Check if delay data exists directly
      if (v.delayDays && v.delayDays > 0) return true;
      
      // Fallback to calculating from dates
      if (!v.scheduledDate || !v.actualArrivalDate) return false;
      
      const scheduled = typeof v.scheduledDate === 'string' ? parseISO(v.scheduledDate) : v.scheduledDate;
      const actual = typeof v.actualArrivalDate === 'string' ? parseISO(v.actualArrivalDate) : v.actualArrivalDate;
      
      if (!isValid(scheduled) || !isValid(actual)) return false;
      
      return differenceInDays(actual, scheduled) > 0;
    });
    console.log('Visits with delay:', visitsWithDelay.length);

    const significantDelays = visitsWithDelay.filter(v => {
      // Check if delay data exists directly
      if (v.delayDays && v.delayDays > 3) return true;
      if (v.isSignificantDelay) return true;
      
      // Fallback to calculating from dates
      if (!v.scheduledDate || !v.actualArrivalDate) return false;
      
      const scheduled = typeof v.scheduledDate === 'string' ? parseISO(v.scheduledDate) : v.scheduledDate;
      const actual = typeof v.actualArrivalDate === 'string' ? parseISO(v.actualArrivalDate) : v.actualArrivalDate;
      
      if (!isValid(scheduled) || !isValid(actual)) return false;
      
      return differenceInDays(actual, scheduled) > 3;
    });

    const totalDelayDays = visitsWithDelay.reduce((sum, v) => {
      // Use stored delay data if available
      if (v.delayDays && v.delayDays > 0) return sum + v.delayDays;
      
      // Fallback to calculating from dates
      if (!v.scheduledDate || !v.actualArrivalDate) return sum;
      
      const scheduled = typeof v.scheduledDate === 'string' ? parseISO(v.scheduledDate) : v.scheduledDate;
      const actual = typeof v.actualArrivalDate === 'string' ? parseISO(v.actualArrivalDate) : v.actualArrivalDate;
      
      if (!isValid(scheduled) || !isValid(actual)) return sum;
      
      return sum + differenceInDays(actual, scheduled);
    }, 0);

    const averageDelay = visitsWithDelay.length > 0 ? totalDelayDays / visitsWithDelay.length : 0;
    const onTimePercentage = completedVisits.length > 0 ? ((completedVisits.length - visitsWithDelay.length) / completedVisits.length) * 100 : 100;

    // Delay reasons analysis
    const delayReasons = visitsWithDelay.reduce((acc, v) => {
      if (v.delayReason) {
        acc[v.delayReason] = (acc[v.delayReason] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topDelayReason = Object.entries(delayReasons).sort(([,a], [,b]) => b - a)[0];

    // Technician performance
    const technicianDelays = visitsWithDelay.reduce((acc, v) => {
      if (v.technicianName) {
        acc[v.technicianName] = (acc[v.technicianName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const worstTechnician = Object.entries(technicianDelays).sort(([,a], [,b]) => b - a)[0];

    return {
      totalVisits: completedVisits.length,
      delayedVisits: visitsWithDelay.length,
      significantDelays: significantDelays.length,
      averageDelay: Math.round(averageDelay * 10) / 10,
      onTimePercentage: Math.round(onTimePercentage),
      topDelayReason: topDelayReason ? { reason: topDelayReason[0], count: topDelayReason[1] } : null,
      worstTechnician: worstTechnician ? { name: worstTechnician[0], delays: worstTechnician[1] } : null,
    };
  }, [maintenanceVisits]);

  const getDelayColor = (days: number) => {
    if (days === 0) return 'bg-green-500';
    if (days <= 1) return 'bg-yellow-500';
    if (days <= 3) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">On-Time Performance</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{delayStats.onTimePercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {delayStats.totalVisits - delayStats.delayedVisits} of {delayStats.totalVisits} visits on time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Delay</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{delayStats.averageDelay} days</div>
          <p className="text-xs text-muted-foreground">
            Across {delayStats.delayedVisits} delayed visits
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Significant Delays</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{delayStats.significantDelays}</div>
          <p className="text-xs text-muted-foreground">
            Visits delayed more than 3 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Delay Reason</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium">
            {delayStats.topDelayReason?.reason || 'None'}
          </div>
          <p className="text-xs text-muted-foreground">
            {delayStats.topDelayReason?.count || 0} occurrences
          </p>
        </CardContent>
      </Card>
    </div>
  );
}