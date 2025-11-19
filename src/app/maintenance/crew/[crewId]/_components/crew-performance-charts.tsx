
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import type { MaintenanceEmployee, MaintenanceVisit } from '@/lib/types';

interface CrewPerformanceChartsProps {
  crewMember: MaintenanceEmployee;
  visits: MaintenanceVisit[];
}

export function CrewPerformanceCharts({ crewMember, visits }: CrewPerformanceChartsProps) {
  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(new Date(), 11 - i)));
    
    return months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const monthVisits = visits.filter(v => format(new Date(v.date as string), 'yyyy-MM') === monthKey);
      
      let totalRating = 0;
      let ratedVisits = 0;
      monthVisits.forEach(visit => {
        const ratingMap = { 'Excellent': 5, 'Good': 4, 'Average': 3, 'Poor': 2, 'Very Poor': 1 };
        const rating = visit.overallReport && ratingMap[visit.overallReport as keyof typeof ratingMap];
        if (rating) {
          totalRating += rating;
          ratedVisits++;
        }
      });
      
      const avgSatisfaction = ratedVisits > 0 ? totalRating / ratedVisits : 0;

      return {
        month: format(month, 'MMM'),
        visits: monthVisits.length,
        avgSatisfaction,
      };
    });
  }, [visits]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Visits</CardTitle>
          <CardDescription>Number of visits attended per month over the last year.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Satisfaction Trend</CardTitle>
          <CardDescription>Average client satisfaction rating per month.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgSatisfaction" name="Avg. Rating" stroke="hsl(var(--primary))" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
