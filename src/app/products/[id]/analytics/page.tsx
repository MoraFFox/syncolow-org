'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { useProductsStore } from '@/store/use-products-store';
import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

const chartConfig = {
    sales: {
        label: "Sales",
        color: "hsl(var(--chart-1))",
    },
};

export default function ProductAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { analyticsOrders } = useOrderStore();
    const { products } = useProductsStore();

    const productId = params.id as string;
    const product = products.find(p => p.id === productId);

    const { salesTrend, recentOrders, totalSales, totalRevenue } = useMemo(() => {
        if (!analyticsOrders.length || !productId) return { salesTrend: [], recentOrders: [], totalSales: 0, totalRevenue: 0 };

        const relevantOrders = analyticsOrders.filter(o =>
            o.status !== 'Cancelled' && o.items.some(i => i.productId === productId)
        );

        const totalSalesCount = relevantOrders.reduce((sum, o) => {
            const item = o.items.find(i => i.productId === productId);
            return sum + (item?.quantity || 0);
        }, 0);

        const totalRev = relevantOrders.reduce((sum, o) => {
            const item = o.items.find(i => i.productId === productId);
            return sum + ((item?.price || 0) * (item?.quantity || 0));
        }, 0);

        // Monthly Trend (Last 12 Months)
        const end = new Date();
        const start = subMonths(end, 11);
        const months = eachMonthOfInterval({ start, end });

        const trend = months.map(month => {
            const monthSales = relevantOrders
                .filter(o => isSameMonth(new Date(o.orderDate), month))
                .reduce((sum, o) => {
                    const item = o.items.find(i => i.productId === productId);
                    return sum + (item?.quantity || 0);
                }, 0);

            return {
                date: format(month, 'MMM yyyy'),
                sales: monthSales
            };
        });

        const sortedOrders = [...relevantOrders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 10);

        return { salesTrend: trend, recentOrders: sortedOrders, totalSales: totalSalesCount, totalRevenue: totalRev };

    }, [analyticsOrders, productId]);

    if (!product) {
        return <div className="p-8 text-center">Product not found or loading...</div>;
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{product.name} Analytics</h1>
                    <p className="text-muted-foreground">Sales performance and history</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSales}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue Generated</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{product.stock}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Monthly Sales Trend (Units)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LineChart data={salesTrend}>
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Line dataKey="sales" type="monotone" stroke="var(--color-sales)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentOrders.map(order => {
                                const item = order.items.find(i => i.productId === productId);
                                return (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                                                {order.id.slice(0, 8)}...
                                            </Link>
                                        </TableCell>
                                        <TableCell>{format(new Date(order.orderDate), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">{item?.quantity}</TableCell>
                                        <TableCell className="text-right">${((item?.price || 0) * (item?.quantity || 0)).toFixed(2)}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
