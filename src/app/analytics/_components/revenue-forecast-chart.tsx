
"use client"

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, addMonths, subMonths, eachMonthOfInterval } from 'date-fns';
import type { Order } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const chartConfig = {
  actual: { label: 'Actual', color: 'hsl(var(--chart-1))' },
  forecast: { label: 'Forecast', color: 'hsl(var(--chart-3))' },
};

export function RevenueForecastChart() {
  const [historicalOrders, setHistoricalOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        const twelveMonthsAgo = subMonths(new Date(), 11);
        const fromISO = `${format(twelveMonthsAgo, 'yyyy-MM-dd')}T00:00:00.000Z`;
        const toISO = `${format(new Date(), 'yyyy-MM-dd')}T23:59:59.999Z`;
        
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('orderDate', fromISO)
          .lte('orderDate', toISO)
          .order('orderDate', { ascending: false });
        
        if (error) throw error;
        
        setHistoricalOrders((data || []) as Order[]);
      } catch (e) {
        console.error('Error fetching forecast data:', e);
      }
      setLoading(false);
    };
    
    fetchHistoricalData();
  }, []);

  const historicalData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i);
      const monthRevenue = historicalOrders
        .filter(o => o.status !== 'Cancelled' && 
          format(new Date(o.orderDate), 'yyyy-MM') === format(date, 'yyyy-MM'))
        .reduce((sum, o) => sum + o.total, 0);
      return {
        date: format(date, 'MMM yyyy'),
        revenue: monthRevenue
      };
    });
  }, [historicalOrders]);
  const forecastData = useMemo(() => {
    if (historicalData.length < 3) return [];

    const recentData = historicalData.slice(-6);
    const revenues = recentData.map(d => d.revenue);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    
    const trend = revenues.length > 1 
      ? (revenues[revenues.length - 1] - revenues[0]) / revenues.length
      : 0;

    // Use current date to generate forecast months
    const now = new Date();
    const forecastMonths = eachMonthOfInterval({
      start: addMonths(now, 1),
      end: addMonths(now, 3)
    });

    const combined = [
      ...recentData.map(d => ({
        date: d.date,
        actual: d.revenue,
        forecast: null as number | null
      })),
      ...forecastMonths.map((month, index) => ({
        date: format(month, 'MMM yyyy'),
        actual: null as number | null,
        forecast: Math.max(0, avgRevenue + trend * (index + 1))
      }))
    ];

    return combined;
  }, [historicalData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Forecast</CardTitle>
        <CardDescription>3-month projection based on recent trends</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>Loading...</p>
          </div>
        ) : forecastData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>Insufficient data for forecasting (need at least 3 months)</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart data={forecastData} margin={{ left: -10, right: 20 }}>
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(val) => `$${Number(val) / 1000}k`} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line 
                dataKey="actual" 
                stroke="var(--color-actual)" 
                strokeWidth={2} 
                dot={{ r: 4 }}
                connectNulls={false}
              />
              <Line 
                dataKey="forecast" 
                stroke="var(--color-forecast)" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
