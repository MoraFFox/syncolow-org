'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { format, parse, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
};

export default function RevenueDrillDownPage() {
  const params = useParams();
  const router = useRouter();
  const { analyticsOrders } = useOrderStore();
  const { companies } = useCompanyStore();

  const granularity = params.granularity as string;
  const value = params.value as string; // e.g., '2023-10'

  const { dailyRevenue, topOrders, totalRevenue } = useMemo(() => {
    if (!analyticsOrders.length) return { dailyRevenue: [], topOrders: [], totalRevenue: 0 };

    let start: Date, end: Date;
    
    if (granularity === 'monthly') {
      const date = parse(value, 'yyyy-MM', new Date());
      if (!isValid(date)) return { dailyRevenue: [], topOrders: [], totalRevenue: 0 };
      start = startOfMonth(date);
      end = endOfMonth(date);
    } else {
      // Default fallback or other granularities
      return { dailyRevenue: [], topOrders: [], totalRevenue: 0 };
    }

    const relevantOrders = analyticsOrders.filter(o => {
        const orderDate = new Date(o.orderDate);
        return o.status !== 'Cancelled' && orderDate >= start && orderDate <= end;
    });

    const total = relevantOrders.reduce((sum, o) => sum + o.total, 0);

    // Daily breakdown
    const days = eachDayOfInterval({ start, end });
    const dailyData = days.map(day => {
        const dayRevenue = relevantOrders
            .filter(o => isSameDay(new Date(o.orderDate), day))
            .reduce((sum, o) => sum + o.total, 0);
        return {
            date: format(day, 'd MMM'),
            revenue: dayRevenue
        };
    });

    const sortedOrders = [...relevantOrders].sort((a, b) => b.total - a.total).slice(0, 10);

    return { dailyRevenue: dailyData, topOrders: sortedOrders, totalRevenue: total };

  }, [analyticsOrders, granularity, value]);

  if (!analyticsOrders.length) {
      return <div className="p-8 text-center">Loading data...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Revenue Drill-Down</h1>
            <p className="text-muted-foreground capitalize">{granularity} View: {value}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Daily Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={dailyRevenue}>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(val) => `$${val}`} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Top Orders this Month</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {topOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">
                                <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                                    {order.id.slice(0, 8)}...
                                </Link>
                            </TableCell>
                            <TableCell>
                                {companies.find(c => c.id === order.companyId)?.name || 'Unknown'}
                            </TableCell>
                            <TableCell>{format(new Date(order.orderDate), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
