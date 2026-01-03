'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyStore } from '@/store/use-company-store';
import { getAnalyticsData } from '@/app/actions/analytics/get-analytics-data';
import { AnalyticsResponse } from '@/app/actions/analytics/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Package, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { DeliveryArea } from '@/lib/types';

export default function AreaAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { areas } = useCompanyStore();

    // State
    const [area, setArea] = useState<DeliveryArea | null>(null);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load handled by store reaction below

    // Effect to react to store changes
    useEffect(() => {
        if (!id) return;
        const found = areas.find(a => a.id === id);
        if (found) {
            setArea(found);
            fetchAnalytics(found);
        } else if (areas.length > 0) {
            // Areas loaded but ID not found
            setIsLoading(false); // Stop loading to show 404 state
        }
    }, [id, areas]);

    const fetchAnalytics = async (areaItem: DeliveryArea) => {
        try {
            const today = new Date();
            const last30Days = subDays(today, 30);

            const data = await getAnalyticsData({
                dateRange: { from: startOfDay(last30Days), to: endOfDay(today) },
                granularity: 'day',
                entityType: 'area',
                entityId: areaItem.name, // Pass NAME as ID for analytics action compatibility
                metrics: ['revenue', 'orders', 'activeClients', 'aov'],
                comparisonMode: 'previous'
            });
            setAnalyticsData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in">
                <div className="flex items-center gap-4 mb-8">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        );
    }

    if (!area) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
                <p>Area not found.</p>
                <Button variant="link" onClick={() => router.push('/orders/areas')}>Return to Areas</Button>
            </div>
        );
    }

    const { revenue, orders, activeClients, aov } = analyticsData?.summary || {};
    const chartData = analyticsData?.timeSeries || [];

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2 rounded-full hover:bg-muted/50" onClick={() => router.push('/orders/areas')}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                            {area.name} <span className="text-lg font-normal text-muted-foreground bg-muted/20 px-3 py-1 rounded-full">Schedule {area.deliverySchedule}</span>
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Tactical performance overview for the last 30 days.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/analytics?entityType=area&entityId=' + area.name)}>
                        Advanced Report
                    </Button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.1)]">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium text-primary">
                            <TrendingUp className="h-4 w-4" /> Total Revenue
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            {formatCurrency(revenue?.value || 0)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-xs ${(revenue?.change ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                            {(revenue?.change ?? 0) >= 0 ? '+' : ''}{(revenue?.change ?? 0).toFixed(1)}%
                            <span className="text-muted-foreground">vs prev 30 days</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-muted/40">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <Package className="h-4 w-4" /> Order Volume
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            {orders?.value || 0}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-xs ${(orders?.change ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                            {(orders?.change ?? 0) >= 0 ? '+' : ''}{(orders?.change ?? 0).toFixed(1)}%
                            <span className="text-muted-foreground">vs prev 30 days</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-muted/40">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <Users className="h-4 w-4" /> Active Clients
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            {activeClients?.value || 0}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-xs ${(activeClients?.change ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                            {(activeClients?.change ?? 0) > 0 ? '+' : ''}{(activeClients?.change ?? 0).toFixed(1)}%
                            <span className="text-muted-foreground">vs prev 30 days</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-muted/40">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium">
                            <Calendar className="h-4 w-4" /> Avg Order Value
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            {formatCurrency(aov?.value || 0)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Per transaction average
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Revenue Chart */}
                <Card className="lg:col-span-2 border-muted/40 bg-gradient-to-br from-card to-card/50">
                    <CardHeader>
                        <CardTitle>Revenue Velocity</CardTitle>
                        <CardDescription>Daily revenue performance over the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickMargin={10}
                                />
                                <YAxis
                                    tickFormatter={(val) => `${val / 1000}k`}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.2)" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="hsl(var(--primary))"
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Secondary Metrics */}
                <div className="space-y-6">
                    <Card className="h-full border-muted/40">
                        <CardHeader>
                            <CardTitle>Orders Trend</CardTitle>
                            <CardDescription>Daily order volume.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[200px] lg:h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis hide />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                                    />
                                    <Bar dataKey="orders" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
