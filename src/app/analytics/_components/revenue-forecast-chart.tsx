"use client"

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, addMonths, subMonths, eachMonthOfInterval } from 'date-fns';
import type { Order } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useSalesAccountStore } from '@/store/use-sales-account-store';

const chartConfig = {
  actual: { label: 'Actual Revenue', color: '#10b981' },
  forecast: { label: 'Projected', color: '#a855f7' },
};

interface RevenueForecastChartProps {
  selectedAccountId?: string;
}

export function RevenueForecastChart({ selectedAccountId }: RevenueForecastChartProps) {
  const [historicalOrders, setHistoricalOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { accounts } = useSalesAccountStore();

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        const twelveMonthsAgo = subMonths(new Date(), 11);
        const fromISO = `${format(twelveMonthsAgo, 'yyyy-MM-dd')}T00:00:00.000Z`;
        const toISO = `${format(new Date(), 'yyyy-MM-dd')}T23:59:59.999Z`;

        const { data, error } = await supabase
          .from('orders')
          .select('id, orderDate, total, grandTotal, status, customerAccount, companyId')
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
    let filteredOrders = historicalOrders.filter(o => o.status !== 'Cancelled');

    // Apply Account Filter
    if (selectedAccountId && selectedAccountId !== 'all') {
      const minAccount = accounts.find(a => a.id === selectedAccountId);
      if (minAccount) {
        filteredOrders = filteredOrders.filter(o => {
          const accCode = o.customerAccount;
          return accCode ? minAccount.codes.some(c => accCode.toString().trim().startsWith(c)) : false;
        });
      }
    }

    return Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i);
      const monthRevenue = filteredOrders
        .filter(o => format(new Date(o.orderDate), 'yyyy-MM') === format(date, 'yyyy-MM'))
        .reduce((sum, o) => sum + (o.total || o.grandTotal || 0), 0);
      return {
        date: format(date, 'MMM yyyy'),
        revenue: monthRevenue
      };
    });
  }, [historicalOrders, selectedAccountId, accounts]);

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
    <Card className="bg-transparent border-0 shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-sm font-mono uppercase tracking-widest text-zinc-400">Revenue Forecast</CardTitle>
        <CardDescription className="text-xs text-zinc-600">3-Month Predictive Analysis</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-zinc-600 font-mono text-xs animate-pulse">
            <p>CALCULATING TRAJECTORY...</p>
          </div>
        ) : forecastData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-zinc-700 font-mono text-xs">
            <p>INSUFFICIENT HISTORICAL DATA</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart data={forecastData} margin={{ left: -10, right: 10 }}>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                className="text-[10px] font-mono fill-zinc-500"
              />
              <YAxis
                tickFormatter={(val) => `$${Number(val) / 1000}k`}
                className="text-[10px] font-mono fill-zinc-500"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: '#27272a' }}
                content={<ChartTooltipContent className="bg-zinc-950 border-zinc-800 font-mono" />}
              />
              <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} />
              <Line
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                type="monotone"
              />
              <Line
                dataKey="forecast"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
                connectNulls={false}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
