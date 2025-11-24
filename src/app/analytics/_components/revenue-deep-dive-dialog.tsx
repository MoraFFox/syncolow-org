
"use client";

import { useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { DrillTarget } from '@/components/drilldown/drill-target';

interface RevenueDeepDiveDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
};

export function RevenueDeepDiveDialog({ isOpen, onOpenChange }: RevenueDeepDiveDialogProps) {
  const { analyticsOrders } = useOrderStore();
  const { companies } = useCompanyStore();

  const analytics = useMemo(() => {
    const validOrders = analyticsOrders.filter(o => o.status !== 'Cancelled');
    
    // Monthly Revenue
    const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
    const now = endOfMonth(new Date());
    const monthlyRevenue: { [key: string]: number } = {};
    validOrders.forEach(order => {
        const orderDate = parseISO(order.orderDate);
        if (isValid(orderDate) && orderDate >= twelveMonthsAgo && orderDate <= now) {
            const monthKey = format(orderDate, 'yyyy-MM');
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + order.total;
        }
    });
    const months = eachMonthOfInterval({ start: twelveMonthsAgo, end: now });
    const revenueTrendData = months.map(month => {
        const monthKey = format(month, 'yyyy-MM');
        return {
            name: format(month, 'MMM'),
            revenue: monthlyRevenue[monthKey] || 0
        }
    });

    // Top Clients & Products
    const clientRevenue: Record<string, number> = {};
    const productRevenue: Record<string, number> = {};
    validOrders.forEach(order => {
        if(order.companyId) clientRevenue[order.companyId] = (clientRevenue[order.companyId] || 0) + order.total;
        order.items.forEach(item => {
            productRevenue[item.productId] = (productRevenue[item.productId] || 0) + (item.price * item.quantity);
        });
    });

    const topClients = Object.entries(clientRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([id, revenue]) => ({ id, name: companies.find(c=>c.id === id)?.name || 'Unknown', revenue }));

    const topProducts = Object.entries(productRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([id, revenue]) => ({ id, name: analyticsOrders.flatMap(o => o.items).find(i => i.productId === id)?.productName || 'Unknown', revenue }));
        
    return { revenueTrendData, topClients, topProducts };

  }, [analyticsOrders, companies]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Revenue Deep Dive</DialogTitle>
          <DialogDescription>A detailed look into your revenue sources and trends over the last 12 months.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Monthly Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={chartConfig} className="h-64 w-full">
                           <BarChart data={analytics.revenueTrendData}>
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickFormatter={(val) => `$${Number(val) / 1000}k`} />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent indicator="dot" />} />
                                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                           </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Clients by Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Client</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {analytics.topClients.map(client => (
                                        <DrillTarget key={client.id} kind="company" payload={{ id: client.id }} asChild>
                                            <TableRow className="cursor-pointer hover:bg-muted/50">
                                                <TableCell className="font-medium">{client.name}</TableCell>
                                                <TableCell className="text-right">${client.revenue.toFixed(2)}</TableCell>
                                            </TableRow>
                                        </DrillTarget>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Products by Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {analytics.topProducts.map(product => (
                                        <DrillTarget key={product.id} kind="product" payload={{ id: product.id }} asChild>
                                            <TableRow className="cursor-pointer hover:bg-muted/50">
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="text-right">${product.revenue.toFixed(2)}</TableCell>
                                            </TableRow>
                                        </DrillTarget>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
