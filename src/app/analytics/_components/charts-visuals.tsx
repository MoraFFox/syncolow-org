"use client";

import { useMemo } from 'react';
import { useProductsStore } from '@/store/use-products-store';
import { format, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, parse, isValid, startOfDay, endOfDay } from 'date-fns';
import { exportToCSV } from './export-utils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from '@/components/ui/chart';
import {
    Bar,
    BarChart,
    Line,
    LineChart,
    Pie,
    PieChart,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';
import { useDrillDown } from '@/hooks/use-drilldown';
import { Order } from '@/lib/types';

const chartConfigLine = {
    revenue: {
        label: "Revenue (Selected)",
        color: "#10b981", // Emerald-500
    },
    comparison: {
        label: "Revenue (Global)",
        color: "#6366f1", // Indigo-500
    }
};

const chartConfigBar = {
    revenue: {
        label: 'Revenue',
        color: '#10b981', // Emerald-500
    },
    stock: {
        label: 'Stock',
        color: '#f59e0b', // Amber-500
    }
};

const chartConfigPie = {
    pending: { label: 'Pending', color: '#f59e0b' }, // Amber
    processing: { label: 'Processing', color: '#3b82f6' }, // Blue
    shipped: { label: 'Shipped', color: '#8b5cf6' }, // Violet
    delivered: { label: 'Delivered', color: '#10b981' }, // Emerald
    cancelled: { label: 'Cancelled', color: '#ef4444' }, // Red
};


interface ChartsVisualsProps {
    dateRange: { from: string, to: string };
    orders: Order[];
    comparisonOrders?: Order[]; // Optional global/baseline data
}

export function ChartsVisuals({ dateRange, orders, comparisonOrders }: ChartsVisualsProps) {
    const { products } = useProductsStore();
    const { goToDetail, hidePreview } = useDrillDown();

    // Filter orders by Date Range and Status
    const activeOrders = useMemo(() => {
        const fromDate = parse(dateRange.from, 'yyyy-MM-dd', new Date());
        const toDate = parse(dateRange.to, 'yyyy-MM-dd', new Date());

        if (!isValid(fromDate) || !isValid(toDate)) return [];

        const start = startOfDay(fromDate);
        const end = endOfDay(toDate);

        return orders.filter(o =>
            o.status !== 'Cancelled' &&
            isWithinInterval(new Date(o.orderDate), { start, end })
        );
    }, [orders, dateRange]);

    const activeComparisonOrders = useMemo(() => {
        if (!comparisonOrders) return [];

        const fromDate = parse(dateRange.from, 'yyyy-MM-dd', new Date());
        const toDate = parse(dateRange.to, 'yyyy-MM-dd', new Date());

        if (!isValid(fromDate) || !isValid(toDate)) return [];

        const start = startOfDay(fromDate);
        const end = endOfDay(toDate);

        return comparisonOrders.filter(o =>
            o.status !== 'Cancelled' &&
            isWithinInterval(new Date(o.orderDate), { start, end })
        );
    }, [comparisonOrders, dateRange]);


    const revenueGrowthData = useMemo(() => {
        const fromDate = parse(dateRange.from, 'yyyy-MM-dd', new Date());
        const toDate = parse(dateRange.to, 'yyyy-MM-dd', new Date());

        if (!isValid(fromDate) || !isValid(toDate)) return [];

        const start = startOfMonth(fromDate);
        const end = endOfMonth(toDate);

        // Map Monthly Revenue
        const monthlyRevenue: { [key: string]: number } = {};
        const monthlyComparison: { [key: string]: number } = {};

        activeOrders.forEach(order => {
            const orderMonth = format(new Date(order.orderDate), 'yyyy-MM');
            monthlyRevenue[orderMonth] = (monthlyRevenue[orderMonth] || 0) + (order.total || order.grandTotal || 0);
        });

        activeComparisonOrders.forEach(order => {
            const orderMonth = format(new Date(order.orderDate), 'yyyy-MM');
            monthlyComparison[orderMonth] = (monthlyComparison[orderMonth] || 0) + (order.total || order.grandTotal || 0);
        });

        const months = eachMonthOfInterval({ start, end });

        return months.map(month => {
            const monthKey = format(month, 'yyyy-MM');
            return {
                date: format(month, 'MMM yyyy'),
                revenue: monthlyRevenue[monthKey] || 0,
                comparison: monthlyComparison[monthKey] || 0
            }
        });

    }, [activeOrders, activeComparisonOrders, dateRange]);

    const topProductsData = useMemo(() => {
        const productRevenue: { [key: string]: { name: string, revenue: number } } = {};

        activeOrders
            .forEach(o => o.items
                .forEach(item => {
                    if (productRevenue[item.productId]) {
                        productRevenue[item.productId].revenue += item.price * item.quantity;
                    } else {
                        productRevenue[item.productId] = {
                            name: item.productName,
                            revenue: item.price * item.quantity
                        };
                    }
                }));

        return Object.values(productRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .reverse();
    }, [activeOrders]);

    const stockOverviewData = useMemo(() => {
        return [...products]
            .sort((a, b) => b.stock - a.stock)
            .slice(0, 5)
            .map(p => ({ name: p.name, stock: p.stock }));
    }, [products]);

    const aovTrendData = useMemo(() => {
        const fromDate = parse(dateRange.from, 'yyyy-MM-dd', new Date());
        const toDate = parse(dateRange.to, 'yyyy-MM-dd', new Date());

        if (!isValid(fromDate) || !isValid(toDate)) return [];

        const start = startOfMonth(fromDate);
        const end = endOfMonth(toDate);

        const monthlyData: { [key: string]: { revenue: number; orders: number } } = {};

        activeOrders.forEach(order => {
            const orderMonth = format(new Date(order.orderDate), 'yyyy-MM');
            if (!monthlyData[orderMonth]) {
                monthlyData[orderMonth] = { revenue: 0, orders: 0 };
            }
            monthlyData[orderMonth].revenue += (order.total || order.grandTotal || 0);
            monthlyData[orderMonth].orders += 1;
        });

        const months = eachMonthOfInterval({ start, end });

        return months.map(month => {
            const monthKey = format(month, 'yyyy-MM');
            const data = monthlyData[monthKey] || { revenue: 0, orders: 0 };
            return {
                date: format(month, 'MMM yyyy'),
                aov: data.orders > 0 ? data.revenue / data.orders : 0
            }
        });
    }, [activeOrders, dateRange]);

    const orderStatusData = useMemo(() => {
        const statusCounts: { [key: string]: number } = {};

        activeOrders.forEach(order => {
            const status = order.status.toLowerCase();
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        return Object.entries(statusCounts).map(([status, count]) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: count,
            fill: `var(--color-${status})`
        }));
    }, [activeOrders]);

    const enhancedCustomerSegments = useMemo(() => {
        if (activeOrders.length === 0) {
            return [
                { name: 'New', value: 0, fill: '#3b82f6' },
                { name: 'Repeat', value: 0, fill: '#10b981' },
                { name: 'VIP', value: 0, fill: '#8b5cf6' },
                { name: 'At Risk', value: 0, fill: '#ef4444' }
            ];
        }

        const customerStats = activeOrders.reduce((acc, order) => {
            if (order.companyId) {
                if (!acc[order.companyId]) {
                    acc[order.companyId] = { orders: 0, revenue: 0 };
                }
                acc[order.companyId].orders += 1;
                acc[order.companyId].revenue += (order.total || order.grandTotal || 0);
            }
            return acc;
        }, {} as Record<string, { orders: number; revenue: number }>);

        // Use local average for segmentation logic
        const avgRevenue = activeOrders.reduce((sum, o) => sum + (o.total || o.grandTotal || 0), 0) / Math.max(activeOrders.length, 1);

        let newCustomers = 0;
        let repeatCustomers = 0;
        let vipCustomers = 0;
        let atRiskCustomers = 0;

        for (const [companyId, stats] of Object.entries(customerStats)) {
            const totalOrders = activeOrders.filter(o => o.companyId === companyId).length;

            if (stats.revenue > avgRevenue * 3) {
                vipCustomers++;
            } else if (stats.orders === 1 && totalOrders === 1) {
                newCustomers++;
            } else if (stats.orders > 1) {
                repeatCustomers++;
            } else if (totalOrders > 1 && stats.orders === 0) {
                atRiskCustomers++;
            } else {
                repeatCustomers++;
            }
        }

        return [
            { name: 'New', value: newCustomers, fill: '#3b82f6' },
            { name: 'Repeat', value: repeatCustomers, fill: '#10b981' },
            { name: 'VIP', value: vipCustomers, fill: '#8b5cf6' },
            { name: 'At Risk', value: atRiskCustomers, fill: '#ef4444' }
        ];
    }, [activeOrders]);


    return (
        <div>
            <div className="mb-4 flex items-center justify-between no-print">
                <h2 className="text-2xl font-bold">Charts & Visuals</h2>
            </div>
            <h2 className="text-2xl font-bold mb-4 hidden print:block">Charts & Visuals</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">

                {/* REVENUE CHART */}
                <Card className="bg-zinc-950/30 border-zinc-800 backdrop-blur-sm shadow-sm group hover:border-emerald-500/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-zinc-200 font-mono tracking-tight uppercase text-sm">Revenue Trajectory</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Monthly Performance & Comparison</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-600 hover:text-emerald-500"
                            onClick={() => exportToCSV(revenueGrowthData, 'revenue-growth')}
                            disabled={revenueGrowthData.length === 0}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {revenueGrowthData.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground font-mono text-xs">
                                <p>NO SIGNAL DETECTED</p>
                            </div>
                        ) : (
                            <ChartContainer config={chartConfigLine} className="h-[300px] w-full">
                                <LineChart
                                    data={revenueGrowthData}
                                    margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={12}
                                        stroke="#52525b"
                                        fontSize={12}
                                        fontFamily="monospace"
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={12}
                                        stroke="#52525b"
                                        fontSize={12}
                                        fontFamily="monospace"
                                        tickFormatter={(value) => `$${Number(value) / 1000}k`}
                                    />
                                    <Tooltip content={<ChartTooltipContent indicator="line" className="bg-zinc-950 border-zinc-800 font-mono" />} />
                                    {comparisonOrders && comparisonOrders.length > 0 && (
                                        <Line
                                            dataKey="comparison"
                                            type="monotone"
                                            stroke="#6366f1" // Indigo
                                            strokeWidth={2}
                                            strokeDasharray="4 4"
                                            dot={false}
                                            activeDot={{ r: 4, fill: "#6366f1" }}
                                            animationDuration={1500}
                                        />
                                    )}
                                    <Line
                                        dataKey="revenue"
                                        type="monotone"
                                        stroke="#10b981" // Emerald
                                        strokeWidth={3}
                                        dot={{ r: 0, fill: "#10b981" }}
                                        activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                                        animationDuration={2000}
                                    />
                                    {comparisonOrders && <ChartLegend content={<ChartLegendContent />} className="mt-4" />}
                                </LineChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* TOP PRODUCTS CHART */}
                <Card className="bg-zinc-950/30 border-zinc-800 backdrop-blur-sm shadow-sm hover:border-emerald-500/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-zinc-200 font-mono tracking-tight uppercase text-sm">Top Performers</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Highest Yield Assets</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-600 hover:text-emerald-500"
                            onClick={() => exportToCSV(topProductsData, 'top-products')}
                            disabled={topProductsData.length === 0}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {topProductsData.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground font-mono text-xs">
                                <p>NO DATA AVAILABLE</p>
                            </div>
                        ) : (
                            <ChartContainer config={chartConfigBar} className="h-[300px] w-full">
                                <BarChart
                                    data={topProductsData}
                                    layout="vertical"
                                    margin={{ left: 0, right: 20, top: 20, bottom: 0 }}
                                    className="cursor-pointer"
                                    onClick={(data) => {
                                        if (data && data.activePayload && data.activePayload.length > 0) {
                                            const productName = data.activePayload[0].payload.name;
                                            const product = products.find(p => p.name === productName);
                                            if (product) goToDetail('product', { id: product.id });
                                        }
                                    }}
                                >
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                        width={140}
                                        className="text-xs font-mono fill-zinc-400"
                                        interval={0}
                                    />
                                    <Tooltip content={<ChartTooltipContent indicator="dot" className="bg-zinc-950 border-zinc-800 font-mono" />} />
                                    <Bar
                                        dataKey="revenue"
                                        radius={[0, 4, 4, 0]}
                                        fill="#10b981"
                                        fillOpacity={0.8}
                                        barSize={24}
                                    />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* CUSTOMER SEGMENTS */}
                <Card className="bg-zinc-950/30 border-zinc-800 backdrop-blur-sm shadow-sm hover:border-emerald-500/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-zinc-200 font-mono tracking-tight uppercase text-sm">Segment Distribution</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Client Composition</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-600 hover:text-emerald-500"
                            onClick={() => exportToCSV(enhancedCustomerSegments, 'customer-segments')}
                            disabled={enhancedCustomerSegments.every(d => d.value === 0)}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <ChartContainer config={{}} className="h-[200px] w-full max-w-[300px]">
                            <PieChart>
                                <Tooltip content={<ChartTooltipContent hideLabel className="bg-zinc-950 border-zinc-800 font-mono" />} />
                                <Pie data={enhancedCustomerSegments} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} strokeWidth={2} stroke="rgba(0,0,0,0)">
                                    {enhancedCustomerSegments.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][index % 4]} fillOpacity={0.8} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent />} className="-translate-y-2 flex-wrap gap-2 justify-center" />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* STOCK OVERVIEW */}
                <Card className="bg-zinc-950/30 border-zinc-800 backdrop-blur-sm shadow-sm hover:border-emerald-500/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-zinc-200 font-mono tracking-tight uppercase text-sm">Stock Levels</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Inventory Status</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-600 hover:text-emerald-500"
                            onClick={() => exportToCSV(stockOverviewData, 'stock-overview')}
                            disabled={stockOverviewData.length === 0}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {stockOverviewData.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground font-mono text-xs">
                                <p>NO DATA AVAILABLE</p>
                            </div>
                        ) : (
                            <ChartContainer config={chartConfigBar} className="h-[200px] w-full">
                                <BarChart
                                    data={stockOverviewData}
                                    margin={{ left: -20, right: 20, bottom: 20 }}
                                    onClick={(data) => {
                                        if (data && data.activePayload && data.activePayload.length > 0) {
                                            const productName = data.activePayload[0].payload.name;
                                            const product = products.find(p => p.name === productName);
                                            if (product) {
                                                goToDetail('product', { id: product.id });
                                            }
                                        }
                                    }}
                                    className="cursor-pointer"
                                >
                                    <XAxis
                                        dataKey="name"
                                        tickLine={false}
                                        axisLine={false}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                        interval={0}
                                        className="text-[10px] font-mono fill-zinc-400"
                                    />
                                    <YAxis tickFormatter={(val) => `${val}`} className="text-[10px] font-mono fill-zinc-400" />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        content={<ChartTooltipContent indicator="dot" className="bg-zinc-950 border-zinc-800 font-mono" />}
                                    />
                                    <Bar dataKey="stock" radius={4} fill="#8b5cf6" />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* AOV TREND */}
                <Card className="bg-zinc-950/30 border-zinc-800 backdrop-blur-sm shadow-sm hover:border-emerald-500/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-zinc-200 font-mono tracking-tight uppercase text-sm">Avg. Order Value</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Transaction Value Trend</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-600 hover:text-emerald-500"
                            onClick={() => exportToCSV(aovTrendData, 'aov-trend')}
                            disabled={aovTrendData.length === 0}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {aovTrendData.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground font-mono text-xs">
                                <p>NO DATA AVAILABLE</p>
                            </div>
                        ) : (
                            <ChartContainer config={chartConfigLine} className="h-[200px] w-full">
                                <LineChart
                                    data={aovTrendData}
                                    margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
                                >
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        className="text-[10px] font-mono fill-zinc-400"
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                                        className="text-[10px] font-mono fill-zinc-400"
                                    />
                                    <Tooltip
                                        content={<ChartTooltipContent indicator="dot" className="bg-zinc-950 border-zinc-800 font-mono" />}
                                    />
                                    <Line
                                        dataKey="aov"
                                        type="monotone"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        dot={{ r: 2 }}
                                        activeDot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* ORDER STATUS */}
                <Card className="bg-zinc-950/30 border-zinc-800 backdrop-blur-sm shadow-sm hover:border-emerald-500/20 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-zinc-200 font-mono tracking-tight uppercase text-sm">Order Status</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">Pipeline Velocity</CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-600 hover:text-emerald-500"
                            onClick={() => exportToCSV(orderStatusData, 'order-status')}
                            disabled={orderStatusData.length === 0}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <ChartContainer config={chartConfigPie} className="h-[200px] w-full max-w-[300px]">
                            <PieChart>
                                <Tooltip content={<ChartTooltipContent hideLabel className="bg-zinc-950 border-zinc-800 font-mono" />} />
                                <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} strokeWidth={2} stroke="rgba(0,0,0,0)">
                                    {orderStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'][index % 5]} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent />} className="-translate-y-2 flex-wrap gap-2 justify-center" />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
