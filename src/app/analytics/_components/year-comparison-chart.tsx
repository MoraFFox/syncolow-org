
"use client"

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, subYears, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import type { Order } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const chartConfig = {
  currentYear: { label: 'Current Year', color: 'hsl(var(--chart-1))' },
  lastYear: { label: 'Last Year', color: 'hsl(var(--chart-2))' },
};

export function YearComparisonChart() {
  const [yearOrders, setYearOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYearData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const currentYearStart = startOfYear(now);
        const lastYearStart = startOfYear(subYears(now, 1));
        const currentYearEnd = endOfYear(now);
        
        const fromISO = `${format(lastYearStart, 'yyyy-MM-dd')}T00:00:00.000Z`;
        const toISO = `${format(currentYearEnd, 'yyyy-MM-dd')}T23:59:59.999Z`;
        
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('orderDate', fromISO)
          .lte('orderDate', toISO)
          .order('orderDate', { ascending: false });

        if (error) throw error;

        setYearOrders((data || []) as Order[]);
      } catch (e) {
        console.error('Error fetching year comparison data:', e);
      }
      setLoading(false);
    };
    
    fetchYearData();
  }, []);

  const comparisonData = useMemo(() => {
    const now = new Date();
    const currentYearStart = startOfYear(now);
    const currentYearEnd = endOfYear(now);
    const lastYearStart = startOfYear(subYears(now, 1));
    const lastYearEnd = endOfYear(subYears(now, 1));

    const currentMonths = eachMonthOfInterval({ start: currentYearStart, end: currentYearEnd });

    const currentYearData: { [key: string]: number } = {};
    const lastYearData: { [key: string]: number } = {};

    yearOrders.filter(o => o.status !== 'Cancelled').forEach(order => {
      const orderDate = new Date(order.orderDate);
      const monthKey = format(orderDate, 'MMM');

      if (orderDate >= currentYearStart && orderDate <= currentYearEnd) {
        currentYearData[monthKey] = (currentYearData[monthKey] || 0) + order.total;
      } else if (orderDate >= lastYearStart && orderDate <= lastYearEnd) {
        lastYearData[monthKey] = (lastYearData[monthKey] || 0) + order.total;
      }
    });

    return currentMonths.map((month) => {
      const monthKey = format(month, 'MMM');
      return {
        month: monthKey,
        currentYear: currentYearData[monthKey] || 0,
        lastYear: lastYearData[monthKey] || 0,
      };
    });
  }, [yearOrders]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Year-over-Year Comparison</CardTitle>
        <CardDescription>Revenue comparison: Current year vs. last year</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>Loading...</p>
          </div>
        ) : comparisonData.every(d => d.currentYear === 0 && d.lastYear === 0) ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>No data available for comparison</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={comparisonData} margin={{ left: -10, right: 20 }}>
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(val) => `$${Number(val) / 1000}k`} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="currentYear" fill="var(--color-currentYear)" radius={4} />
              <Bar dataKey="lastYear" fill="var(--color-lastYear)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
