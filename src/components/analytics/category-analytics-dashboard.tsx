'use client';

import { motion } from 'framer-motion';
import { useState } from "react";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { Area, Bar, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line } from "recharts";
import { DollarSign, Activity, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Package, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsControls } from "@/components/analytics/analytics-controls";
import { cn } from "@/lib/utils";

// --- Ultramode Components (Localized for Speed) ---

function MetricPulse({ title, value, subtext, trend, icon: Icon, color = "indigo" }: any) {
    const isPositive = trend === 'up';
    const trendColor = isPositive ? "text-emerald-400" : trend === 'down' ? "text-rose-400" : "text-zinc-400";
    const TrendIcon = isPositive ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Activity;

    return (
        <div className="relative overflow-hidden rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5 group hover:border-zinc-700/50 transition-all">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-${color}-500`}>
                <Icon className="w-16 h-16" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-400 text-xs font-mono tracking-wider uppercase">{title}</span>
                    <Icon className={`w-4 h-4 text-${color}-500`} />
                </div>
                <div>
                    <div className="text-2xl font-bold text-zinc-100 tabular-nums tracking-tight">{value}</div>
                    {subtext && <div className="text-zinc-500 text-xs mt-1">{subtext}</div>}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-medium mt-3 ${trendColor}`}>
                        <TrendIcon className="w-3 h-3" />
                        <span>{trend === 'neutral' ? 'Stable' : 'Trending'}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                <p className="text-zinc-400 text-xs font-mono mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-zinc-300">{entry.name}:</span>
                        <span className="font-mono font-bold text-zinc-100">
                            {entry.name.includes('Revenue') ? '$' : ''}{entry.value.toLocaleString()}
                        </span>
                        {entry.payload.cumulativePercentage && entry.dataKey === 'revenue' && (
                            <span className="text-zinc-500 text-xs ml-1">({entry.payload.percentageOfTotal?.toFixed(1)}%)</span>
                        )}
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

interface CategoryAnalyticsDashboardProps {
    categoryId: string;
}

export function CategoryAnalyticsDashboard({ categoryId }: CategoryAnalyticsDashboardProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 90),
        to: new Date()
    });
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');

    const { data, isLoading } = useAnalyticsData({
        entityType: 'category',
        entityId: categoryId,
        dateRange: { from: dateRange?.from || new Date(), to: dateRange?.to || new Date() },
        granularity,
        metrics: ['revenue', 'orders', 'units', 'activeClients']
    });

    const summary = data?.summary;
    const timeSeries = data?.timeSeries || [];
    const topProducts = data?.topProducts || [];

    // Filter out products with 0 revenue or negligible share for Pareto
    const paretoData = topProducts.filter(p => p.revenue > 0);

    if (isLoading && !data) {
        return <div className="p-8"><Skeleton className="h-[400px] w-full bg-zinc-900/50" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Category Command Center
                </h2>
                <div className="flex items-center gap-4">
                    <AnalyticsControls
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        granularity={granularity}
                        setGranularity={setGranularity}
                    />
                </div>
            </div>

            {/* Metric Pulse Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricPulse
                    title="Category Revenue"
                    value={`$${summary?.revenue?.value?.toLocaleString() ?? '0'}`}
                    subtext="Gross Sales"
                    trend={summary?.revenue?.trend}
                    icon={DollarSign}
                    color="emerald"
                />
                <MetricPulse
                    title="Units Sold"
                    value={summary?.unitsSold?.value?.toLocaleString() ?? '0'}
                    subtext="Volume"
                    trend={summary?.unitsSold?.trend}
                    icon={Package}
                    color="blue"
                />
                <MetricPulse
                    title="Active Products"
                    value={summary?.activeProducts?.value ?? 0}
                    subtext="Inventory Mix"
                    trend={summary?.activeProducts?.trend}
                    icon={Layers}
                    color="violet"
                />
                <MetricPulse
                    title="Active Consumers"
                    value={summary?.activeClients?.value ?? 0}
                    subtext="Unique Buyers"
                    trend={summary?.activeClients?.trend}
                    icon={Users}
                    color="amber"
                />
            </div>

            {/* Chart Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 h-[450px]">
                {/* 1. Pareto / Product Mix Chart */}
                <Card className="col-span-2 bg-zinc-900/20 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-zinc-100">
                            <TrendingUp className="w-4 h-4 text-indigo-400" />
                            Pareto Product Mix
                        </CardTitle>
                        <CardDescription>Top products driving 80% of revenue</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={paretoData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val / 1000}k`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val}%`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="cumulativePercentage"
                                    name="Cum. Share %"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 2. Category Trend */}
                <Card className="col-span-1 bg-zinc-900/20 border-zinc-800/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-zinc-100">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            Category Velocity
                        </CardTitle>
                        <CardDescription>Revenue trend over time</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={timeSeries}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Product Performance Matrix (Redesigned) */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                            Asset Performance Matrix
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-mono tracking-[0.2em] uppercase">Sector-Specific Revenue Dominance</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {topProducts.map((product, index) => {
                        const isLeader = index === 0;
                        const isTopThree = index < 3;

                        return (
                            <motion.div
                                key={product.productId}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ y: -5 }}
                                className="group relative"
                            >
                                {/* Leadership Glow */}
                                {isLeader && (
                                    <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500" />
                                )}

                                <Card className={cn(
                                    "relative h-full overflow-hidden bg-zinc-950/40 border-zinc-900/50 backdrop-blur-xl transition-all duration-300",
                                    isLeader ? "border-indigo-500/30" : "hover:border-zinc-700/50"
                                )}>
                                    <CardContent className="p-4 flex flex-col h-full space-y-4">
                                        {/* Header Row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn(
                                                        "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                                                        isLeader ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                                                    )}>
                                                        #{index + 1} {isLeader ? "LEADER" : ""}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">
                                                    {product.name}
                                                </h4>
                                            </div>
                                            <div className={cn(
                                                "p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50",
                                                isTopThree ? "text-indigo-400" : "text-zinc-600"
                                            )}>
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                        </div>

                                        {/* Main Metric */}
                                        <div className="py-2 border-y border-zinc-900/50">
                                            <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Net Revenue</div>
                                            <div className="text-xl font-black text-white tabular-nums tracking-tighter flex items-baseline gap-1">
                                                <span className="text-indigo-500 text-sm font-mono">$</span>
                                                {product.revenue?.toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Secondary Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">Volume</div>
                                                <div className="text-sm font-bold text-zinc-300 font-mono tabular-nums">
                                                    {product.quantity?.toLocaleString()}
                                                    <span className="text-[10px] font-normal text-zinc-600 ml-1">U</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">Domination</div>
                                                <div className="text-sm font-bold text-emerald-400 font-mono">
                                                    {product.percentageOfTotal?.toFixed(1)}
                                                    <span className="text-[10px] font-normal text-emerald-900 ml-0.5">%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Domination Progress Bar */}
                                        <div className="relative h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${product.percentageOfTotal}%` }}
                                                className={cn(
                                                    "absolute top-0 left-0 h-full rounded-full transition-all duration-1000",
                                                    isLeader ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-zinc-700"
                                                )}
                                            />
                                        </div>

                                        {/* Strategic Footer (Hidden until hover) */}
                                        <div className="text-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter">
                                                Strategic Asset Verification Confirmed
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {topProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/20 border-2 border-dashed border-zinc-900 rounded-3xl">
                        <Package className="w-12 h-12 text-zinc-800 mb-4" />
                        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">No Sector Performance Data Available</p>
                    </div>
                )}
            </section>
        </div>
    );
}
