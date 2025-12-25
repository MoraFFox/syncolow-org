"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Order } from '@/lib/types';
import { subMonths, isAfter, startOfMonth, format } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ClientConsumptionAnalyticsProps {
    orders: Order[];
}

interface ProductConsumption {
    productId: string;
    productName: string;
    totalQuantity: number;
    monthlyAverage: number;
    trend: 'up' | 'down' | 'stable';
    lastMonthQuantity: number;
    monthlyData: { month: string; quantity: number }[];
}

export function ClientConsumptionAnalytics({ orders }: ClientConsumptionAnalyticsProps) {
    // ULTRATHINK: Deep calculation logic
    const analyticsData = useMemo(() => {
        const sixMonthsAgo = subMonths(new Date(), 6);
        // Filter pertinent orders
        const recentOrders = orders.filter(o =>
            isAfter(new Date(o.orderDate), sixMonthsAgo) &&
            o.status !== 'Cancelled' &&
            o.status !== 'Delivery Failed'
        );

        const productMap = new Map<string, {
            name: string;
            quantitiesByMonth: Map<string, number>;
            total: number;
        }>();

        // Aggregation Phase
        recentOrders.forEach(order => {
            const orderMonth = format(new Date(order.orderDate), 'MMM'); // Jan, Feb...

            order.items.forEach(item => {
                if (!productMap.has(item.productId)) {
                    productMap.set(item.productId, {
                        name: item.productName,
                        quantitiesByMonth: new Map(),
                        total: 0
                    });
                }

                const entry = productMap.get(item.productId)!;
                const currentMonthQty = entry.quantitiesByMonth.get(orderMonth) || 0;

                entry.quantitiesByMonth.set(orderMonth, currentMonthQty + item.quantity);
                entry.total += item.quantity;
            });
        });

        // Transformation Phase
        const results: ProductConsumption[] = [];
        const months = Array.from({ length: 6 }, (_, i) =>
            format(subMonths(new Date(), i), 'MMM')
        ).reverse(); // [Jan, Feb, Mar, Apr, May, Jun]

        productMap.forEach((value, key) => {
            const monthlyData = months.map(month => ({
                month,
                quantity: value.quantitiesByMonth.get(month) || 0
            }));

            // Trend Calculation: Simple comparison of last month vs average
            // For a more robust trend, we could use linear regression slope, 
            // but for "Avant-Garde" UX, simple indicators are often cleaner.

            const lastMonth = monthlyData[monthlyData.length - 1].quantity;
            const prevMonth = monthlyData[monthlyData.length - 2]?.quantity || 0;

            // Calculate average over 6 months (or less if new product?)
            // We divide by 6 for "Monthly Average in 6 months window"
            const average = value.total / 6;

            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (lastMonth > prevMonth * 1.1) trend = 'up';
            else if (lastMonth < prevMonth * 0.9) trend = 'down';

            results.push({
                productId: key,
                productName: value.name,
                totalQuantity: value.total,
                monthlyAverage: average,
                trend,
                lastMonthQuantity: lastMonth,
                monthlyData
            });
        });

        return results.sort((a, b) => b.totalQuantity - a.totalQuantity);
    }, [orders]);

    if (analyticsData.length === 0) {
        return (
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                    <Package className="h-12 w-12 mb-4 opacity-50" />
                    <p>No consumption data available for the last 6 months.</p>
                </CardContent>
            </Card>
        );
    }

    // Avant-garde Design: Minimalist list with integrated sparklines
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Consumed Products Chart */}
            <Card className="col-span-1 border-none shadow-sm bg-gradient-to-br from-card to-secondary/10">
                <CardHeader>
                    <CardTitle>Consumption Overview</CardTitle>
                    <CardDescription>Top products by volume (6 Months)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 30 }}>
                            <XAxis type="number" hide />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-popover border text-popover-foreground px-3 py-1.5 rounded-md text-xs shadow-md">
                                                <span className="font-semibold">{payload[0].payload.productName}</span>: {payload[0].value} units
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="totalQuantity" radius={[0, 4, 4, 0]} barSize={32}>
                                {analyticsData.slice(0, 5).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'][index % 5]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Detailed Velocity List */}
            <Card className="col-span-1 lg:row-span-2">
                <CardHeader>
                    <CardTitle>Product Velocity</CardTitle>
                    <CardDescription>Average monthly consumption rate</CardDescription>
                </CardHeader>
                <ScrollArea className="h-[600px] pr-4">
                    <CardContent className="space-y-6">
                        {analyticsData.map((product) => (
                            <div key={product.productId} className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                                            {product.productName}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className="font-mono text-[10px] px-1 h-5">
                                                {product.monthlyAverage.toFixed(1)} / mo
                                            </Badge>
                                            {product.trend === 'up' && <span className="text-green-500 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> Trending Up</span>}
                                            {product.trend === 'down' && <span className="text-red-500 flex items-center gap-0.5"><TrendingDown className="h-3 w-3" /> Trending Down</span>}
                                            {product.trend === 'stable' && <span className="text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> Stable</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold tabular-nums">{product.totalQuantity}</span>
                                        <span className="text-xs text-muted-foreground block">total</span>
                                    </div>
                                </div>

                                {/* Micro-chart (Sparkline) using simpler HTML/CSS or Recharts for each row is too heavy. 
                      Let's do a simple CSS bar visualization for the 6 months.
                  */}
                                <div className="flex items-end gap-1 h-8 mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    {product.monthlyData.map((d, i) => {
                                        const maxHelper = Math.max(...product.monthlyData.map(m => m.quantity), 1);
                                        const height = (d.quantity / maxHelper) * 100;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col justify-end gap-1 group/bar" title={`${d.month}: ${d.quantity}`}>
                                                <div
                                                    className={`w-full rounded-t-sm transition-all duration-500 ${d.quantity === product.lastMonthQuantity ? 'bg-primary' : 'bg-primary/20'}`}
                                                    style={{ height: `${height}%` }}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                                <Separator className="mt-4" />
                            </div>
                        ))}
                    </CardContent>
                </ScrollArea>
            </Card>
        </div>
    );
}
