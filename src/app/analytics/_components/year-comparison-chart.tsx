"use client"

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, subYears, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import type { Order } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useSalesAccountStore } from '@/store/use-sales-account-store';

const chartConfig = {
  currentYear: { label: 'Current Year', color: '#10b981' }, // Emerald
  lastYear: { label: 'Last Year', color: '#3f3f46' }, // Zinc-700
};

interface YearComparisonChartProps {
  selectedAccountId?: string;
}

export function YearComparisonChart({ selectedAccountId }: YearComparisonChartProps) {
  const [yearOrders, setYearOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { accounts } = useSalesAccountStore();

  useEffect(() => {
    const fetchYearData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const currentYearStart = startOfYear(now);
        // We need data from start of LAST year to end of CURRENT year
        const lastYearStart = startOfYear(subYears(now, 1));
        const currentYearEnd = endOfYear(now);

        const fromISO = `${format(lastYearStart, 'yyyy-MM-dd')}T00:00:00.000Z`;
        const toISO = `${format(currentYearEnd, 'yyyy-MM-dd')}T23:59:59.999Z`;

        let allOrders: Order[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
          const { data: chunk, error } = await supabase
            .from('orders')
            .select('id, orderDate, total, grandTotal, status, customerAccount, companyId')
            .gte('orderDate', fromISO)
            .lte('orderDate', toISO)
            .order('orderDate', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;

          if (chunk && chunk.length > 0) {
            allOrders = [...allOrders, ...(chunk as unknown as Order[])];
            if (chunk.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }

        setYearOrders(allOrders);
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

    let filteredOrders = yearOrders.filter(o => o.status !== 'Cancelled');

    // Apply Account Filter Logic
    if (selectedAccountId && selectedAccountId !== 'all') {
      const minAccount = accounts.find(a => a.id === selectedAccountId);
      if (minAccount) {
        // DEBUG: Log filtering for first 5 orders
        console.warn('[YearComparisonChart] Filtering by account:', minAccount.name, 'codes:', JSON.stringify(minAccount.codes));
        console.warn('[YearComparisonChart] Sample orders customerAccount values:', filteredOrders.slice(0, 5).map(o => ({ id: o.id, customerAccount: o.customerAccount })));

        // DEBUG: Test a sample match
        if (filteredOrders.length > 0 && minAccount.codes.length > 0) {
          const sampleOrder = filteredOrders[0];
          const sampleCode = minAccount.codes[0];
          const sampleAccCode = sampleOrder.customerAccount;
          console.warn('[YearComparisonChart] TEST MATCH:', {
            orderCustomerAccount: sampleAccCode,
            salesAccountCode: sampleCode,
            startsWithResult: sampleAccCode?.toString().trim().startsWith(sampleCode)
          });
        }

        filteredOrders = filteredOrders.filter(o => {
          const accCode = o.customerAccount;
          return accCode ? minAccount.codes.some(c => accCode.toString().trim().startsWith(c)) : false;
        });

        console.warn('[YearComparisonChart] After filtering:', filteredOrders.length, 'orders');
      }
    }

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      const monthKey = format(orderDate, 'MMM');

      if (orderDate >= currentYearStart && orderDate <= currentYearEnd) {
        currentYearData[monthKey] = (currentYearData[monthKey] || 0) + (order.total || order.grandTotal || 0);
      } else if (orderDate >= lastYearStart && orderDate <= lastYearEnd) {
        lastYearData[monthKey] = (lastYearData[monthKey] || 0) + (order.total || order.grandTotal || 0);
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
  }, [yearOrders, selectedAccountId, accounts]);

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-sm font-mono uppercase tracking-widest text-zinc-400">Year-over-Year Comparison</CardTitle>
        <CardDescription className="text-xs text-zinc-600">Revenue Performance Vector</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-zinc-600 font-mono text-xs animate-pulse">
            <p>SYNCING HISTORICAL DATA...</p>
          </div>
        ) : comparisonData.every(d => d.currentYear === 0 && d.lastYear === 0) ? (
          <div className="h-[300px] flex items-center justify-center text-zinc-700 font-mono text-xs">
            <p>NO COMPARATIVE DATA DETECTED</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={comparisonData} margin={{ left: -10, right: 10 }}>
              <XAxis
                dataKey="month"
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
                cursor={{ fill: '#18181b' }}
                content={<ChartTooltipContent className="bg-zinc-950 border-zinc-800 font-mono" />}
              />
              <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} />
              <Bar dataKey="currentYear" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="lastYear" fill="#27272a" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
