
"use client";

import { useMemo } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { Product } from '@/lib/types';
import { format, subMonths, differenceInMonths } from 'date-fns';
import Link from 'next/link';
import { DrillTarget } from '@/components/drilldown/drill-target';

interface ProductSalesAnalyticsProps {
    product: Product;
}

const chartConfig = {
    unitsSold: {
      label: "Units Sold",
      color: "hsl(var(--chart-1))",
    },
};

export function ProductSalesAnalytics({ product }: ProductSalesAnalyticsProps) {
    const { orders } = useOrderStore();
    const { companies } = useCompanyStore();

    const analytics = useMemo(() => {
        const productOrders = orders.filter(order => order.items.some(item => item.productId === product.id) && order.status !== 'Cancelled');
        
        let totalRevenue = 0;
        let unitsSold = 0;
        const clientPurchases: Record<string, {name: string, quantity: number, id: string}> = {};
        const monthlySales: Record<string, number> = {};

        if (productOrders.length === 0) {
           return {
                totalRevenue: 0, unitsSold: 0, salesVelocity: 0,
                stockDepletionMonths: Infinity,
                topClients: [], salesTrendData: [], recentProductOrders: []
           }
        }

        let firstOrderDate = new Date();
        productOrders.forEach(order => {
            const orderDate = new Date(order.orderDate);
            if(orderDate < firstOrderDate) firstOrderDate = orderDate;
            
            const orderMonth = format(orderDate, 'yyyy-MM');
            const item = order.items.find(i => i.productId === product.id);

            if (item) {
                const orderMultiplier = order.total >= 0 ? 1 : -1;
                totalRevenue += item.quantity * item.price * orderMultiplier;
                unitsSold += item.quantity * orderMultiplier;

                if (order.companyId) {
                  if (clientPurchases[order.companyId]) {
                      clientPurchases[order.companyId].quantity += item.quantity * orderMultiplier;
                  } else {
                      const client = companies.find(c => c.id === order.companyId);
                      clientPurchases[order.companyId] = {
                          id: client?.id || order.companyId,
                          name: client?.name || 'Unknown Client',
                          quantity: item.quantity * orderMultiplier
                      };
                  }
                }
                
                monthlySales[orderMonth] = (monthlySales[orderMonth] || 0) + (item.quantity * orderMultiplier);
            }
        });

        const topClients = Object.values(clientPurchases).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

        const monthsActive = differenceInMonths(new Date(), firstOrderDate) || 1;
        const salesVelocity = unitsSold / monthsActive; // Units per month
        const stockDepletionMonths = salesVelocity > 0 ? product.stock / salesVelocity : Infinity;
        

        const salesTrendData = Array.from({ length: 12 }).map((_, i) => {
            const date = subMonths(new Date(), 11 - i);
            const monthKey = format(date, 'yyyy-MM');
            return {
                month: format(date, 'MMM'),
                unitsSold: monthlySales[monthKey] || 0,
            };
        });

        const recentProductOrders = productOrders
            .sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
            .slice(0, 5);


        return {
            totalRevenue,
            unitsSold,
            topClients,
            salesTrendData,
            recentProductOrders,
            salesVelocity,
            stockDepletionMonths,
        }

    }, [product, orders, companies]);


    return (
        <div className="grid gap-8 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Revenue</CardTitle>
                        <CardDescription>Lifetime sales for this product.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Units Sold</CardTitle>
                         <CardDescription>Total units sold lifetime.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{analytics.unitsSold}</p>
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <CardTitle>Sales Velocity</CardTitle>
                        <CardDescription>Average units sold per month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{analytics.salesVelocity.toFixed(1)} <span className="text-base font-normal">units/mo</span></p>
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <CardTitle>Est. Stock Depletion</CardTitle>
                        <CardDescription>Predicted time until stock runs out.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <p className="text-2xl font-bold">
                           {isFinite(analytics.stockDepletionMonths) ? `${analytics.stockDepletionMonths.toFixed(1)} months` : "N/A"}
                       </p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Sales Trend (Last 12 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <ResponsiveContainer>
                            <RechartsLineChart data={analytics.salesTrendData} margin={{ left: -20, right: 20, top: 5, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="unitsSold" stroke="var(--color-unitsSold)" strokeWidth={2} />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Clients</CardTitle>
                        <CardDescription>Clients who purchased this product the most.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 md:hidden">
                            {analytics.topClients.map(client => (
                                <div key={client.id} className="p-3 border rounded-md hover:bg-muted flex justify-between items-center">
                                    <DrillTarget kind="company" payload={{ id: client.id, name: client.name }} asChild>
                                        <Link href={`/clients/${client.id}`} className="font-medium hover:underline">{client.name}</Link>
                                    </DrillTarget>
                                    <p className="text-sm font-bold">{client.quantity} units</p>
                                </div>
                            ))}
                            {analytics.topClients.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No purchases yet.</p>}
                        </div>
                         <div className="overflow-x-auto hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client Name</TableHead>
                                        <TableHead className="text-right">Units Purchased</TableHead>
                                    </TableRow>
                                </TableHeader>
                                 <TableBody>
                                    {analytics.topClients.map(client => (
                                        <TableRow key={client.id}>
                                            <TableCell>
                                                <DrillTarget kind="company" payload={{ id: client.id, name: client.name }} asChild>
                                                    <Link href={`/clients/${client.id}`} className="font-medium hover:underline">{client.name}</Link>
                                                </DrillTarget>
                                            </TableCell>
                                            <TableCell className="text-right">{client.quantity}</TableCell>
                                        </TableRow>
                                    ))}
                                    {analytics.topClients.length === 0 && <TableRow><TableCell colSpan={2} className="text-center">No purchases yet.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>The last 5 orders including this product.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-3 md:hidden">
                            {analytics.recentProductOrders.map(order => (
                                <div key={order.id} className="p-3 border rounded-md hover:bg-muted">
                                    <div className="flex justify-between items-center">
                                        <DrillTarget kind="order" payload={{ id: order.id }} asChild>
                                            <Link href={`/orders/${order.id}`} className="font-semibold hover:underline">#{order.id.slice(0, 7)}</Link>
                                        </DrillTarget>
                                        <p className="text-sm">{order.items.find(i => i.productId === product.id)?.quantity} units</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{format(new Date(order.orderDate), 'PPP')}</p>
                                </div>
                            ))}
                            {analytics.recentProductOrders.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No recent orders.</p>}
                        </div>
                         <div className="overflow-x-auto hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analytics.recentProductOrders.map(order => (
                                         <TableRow key={order.id}>
                                            <TableCell>
                                                <DrillTarget kind="order" payload={{ id: order.id }} asChild>
                                                    <Link href={`/orders/${order.id}`} className="font-medium hover:underline">#{order.id.slice(0, 7)}</Link>
                                                </DrillTarget>
                                            </TableCell>
                                            <TableCell>{format(new Date(order.orderDate), 'PPP')}</TableCell>
                                            <TableCell className="text-right">{order.items.find(i => i.productId === product.id)?.quantity}</TableCell>
                                        </TableRow>
                                    ))}
                                    {analytics.recentProductOrders.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">No recent orders.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
