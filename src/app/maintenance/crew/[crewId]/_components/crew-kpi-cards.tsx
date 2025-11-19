
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Star, Timer, DollarSign } from 'lucide-react';
import type { MaintenanceEmployee, MaintenanceVisit } from '@/lib/types';
import { differenceInDays, parseISO, isValid } from 'date-fns';

interface CrewKpiCardsProps {
  crewMember: MaintenanceEmployee;
  visits: MaintenanceVisit[];
}

export function CrewKpiCards({ crewMember, visits }: CrewKpiCardsProps) {
  const kpiData = useMemo(() => {
    const totalVisits = visits.length;
    const completedVisits = visits.filter(v => v.status === 'Completed');

    // Calculate Average Satisfaction Score
    let totalRating = 0;
    let ratedVisits = 0;
    completedVisits.forEach(visit => {
      const ratingMap = { 'Excellent': 5, 'Good': 4, 'Average': 3, 'Poor': 2, 'Very Poor': 1 };
      const rating = visit.overallReport && ratingMap[visit.overallReport as keyof typeof ratingMap];
      if (rating) {
        totalRating += rating;
        ratedVisits++;
      }
    });
    const avgSatisfaction = ratedVisits > 0 ? (totalRating / ratedVisits) : 0;
    
    // Calculate Average Resolution Time
    let totalResolutionDays = 0;
    let resolvedCases = 0;
    const rootVisits = visits.filter(v => v.status === 'Completed' && v.resolutionTimeDays !== undefined && !v.rootVisitId);
    if(rootVisits.length > 0) {
        totalResolutionDays = rootVisits.reduce((sum, v) => sum + v.resolutionTimeDays!, 0);
        resolvedCases = rootVisits.length;
    }
    const avgResolutionTime = resolvedCases > 0 ? (totalResolutionDays / resolvedCases) : 0;
    
    // Calculate Total Value of Parts/Services
    const totalValue = visits.reduce((sum, visit) => {
        const partsCost = visit.spareParts?.filter(p => p.paidBy === 'Company').reduce((s, p) => s + (p.price || 0) * p.quantity, 0) || 0;
        const servicesCost = visit.services?.filter(s => s.paidBy === 'Company').reduce((s, p) => s + p.cost * p.quantity, 0) || 0;
        const labor = visit.laborCost || 0;
        return sum + partsCost + servicesCost + labor;
    }, 0);

    return { totalVisits, avgSatisfaction, avgResolutionTime, totalValue };
  }, [visits]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Visits Attended</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData.totalVisits}</div>
          <p className="text-xs text-muted-foreground">All visits assigned to this crew member.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Client Satisfaction</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData.avgSatisfaction.toFixed(1)} / 5.0</div>
          <p className="text-xs text-muted-foreground">Average rating from client visit reports.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData.avgResolutionTime.toFixed(1)} days</div>
          <p className="text-xs text-muted-foreground">Average time from case creation to completion.</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Company Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${kpiData.totalValue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Sum of parts and services paid by company.</p>
        </CardContent>
      </Card>
    </div>
  );
}
