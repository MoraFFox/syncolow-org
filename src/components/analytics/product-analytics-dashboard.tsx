'use client';

import { useAnalyticsData } from '@/hooks/use-analytics-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, Package, Activity, AlertCircle, RefreshCcw, Info, Download, CalendarDays } from 'lucide-react';
import { ComposedChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis, Brush, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ProductConsumersList } from './product-consumers-list';
import { ProductAffinityChart } from './product-affinity-chart';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { endOfDay, format, subMonths } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface ProductAnalyticsDashboardProps {
    productId: string;
}

export function ProductAnalyticsDashboard({ productId }: ProductAnalyticsDashboardProps) {
    // State for custom date range selection (affects CHART ONLY, not metrics)
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Calculate optimal granularity based on date range span
    const chartGranularity = useMemo(() => {
        if (!customDateRange?.from || !customDateRange?.to) return 'month' as const;

        const diffMs = customDateRange.to.getTime() - customDateRange.from.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        // < 60 days: show daily
        if (diffDays <= 60) return 'day' as const;
        // < 180 days (6 months): show weekly
        if (diffDays <= 180) return 'week' as const;
        // otherwise: show monthly
        return 'month' as const;
    }, [customDateRange]);

    // Primary analytics query for METRICS (always monthly, full range)
    const metricsQuery = useMemo(() => ({
        entityType: 'product' as const,
        entityId: productId,
        granularity: 'month' as const,
        dateRange: {
            from: new Date('2023-01-01'),
            to: endOfDay(new Date())
        },
        metrics: ['revenue', 'orders', 'units', 'activeClients', 'returns'] as ('revenue' | 'orders' | 'units' | 'returns' | 'aov' | 'profit' | 'cogs' | 'revenueGrowthRate' | 'activeClients')[]
    }), [productId]);

    // Secondary query for CHART (dynamic granularity based on selected range)
    const chartQuery = useMemo(() => {
        if (!customDateRange?.from || !customDateRange?.to) return null;

        return {
            entityType: 'product' as const,
            entityId: productId,
            granularity: chartGranularity,
            dateRange: {
                from: customDateRange.from,
                to: endOfDay(customDateRange.to)
            },
            metrics: ['revenue', 'orders'] as ('revenue' | 'orders')[]
        };
    }, [productId, customDateRange, chartGranularity]);

    const { data: metricsData, isLoading: metricsLoading } = useAnalyticsData(metricsQuery);
    const { data: chartData, isLoading: chartLoading } = useAnalyticsData(chartQuery || metricsQuery);

    const summary = metricsData?.summary;
    const rawTimeSeries = metricsData?.timeSeries || [];
    const chartTimeSeries = chartData?.timeSeries || [];

    // CHART DATA: Use custom range data if available, otherwise use filtered metrics data
    const timeSeries = useMemo(() => {
        // If a custom range is selected and we have chart-specific data, use it
        if (customDateRange?.from && customDateRange?.to && chartTimeSeries.length > 0) {
            return chartTimeSeries;
        }

        // Otherwise, filter the monthly metrics data (default view)
        if (!rawTimeSeries.length) return [];

        // Default: SMART TRIM - filter out leading zeros
        const firstActiveIndex = rawTimeSeries.findIndex(p => p.revenue > 0 || p.orders > 0);
        if (firstActiveIndex === -1) {
            return rawTimeSeries.slice(-6);
        }
        const startIndex = Math.max(0, firstActiveIndex - 2);
        return rawTimeSeries.slice(startIndex);
    }, [rawTimeSeries, chartTimeSeries, customDateRange]);

    // DEBUG: Log chart query details
    console.log('[Chart Debug]', {
        customDateRange,
        chartGranularity,
        chartQueryExists: !!chartQuery,
        chartTimeSeriesLength: chartTimeSeries.length,
        rawTimeSeriesLength: rawTimeSeries.length,
        finalTimeSeriesLength: timeSeries.length,
        firstTimeSeriesLabel: timeSeries[0]?.label,
    });

    const isLoading = metricsLoading || (chartQuery && chartLoading);

    // Derive product specific data from the summary arrays
    const currentProductConsumption = useMemo(() => {
        return summary?.productConsumption?.find(p => p.productId === productId);
    }, [summary, productId]);

    // Use topClients from the product slice if available
    const topClients = currentProductConsumption?.topClients || [];
    const repeatRate = summary?.repeatPurchaseRate?.value || 0;
    const returnRate = summary?.returnRate?.value || 0;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl bg-zinc-900/50" />
                ))}
                <Skeleton className="col-span-1 md:col-span-3 h-80 rounded-xl bg-zinc-900/50" />
                <Skeleton className="col-span-1 h-80 rounded-xl bg-zinc-900/50" />
            </div>
        );
    }

    // Colors for Avant-Garde Theme
    const neonEmerald = '#10b981';

    return (
        <div className="space-y-6">
            {/* 1. HERO METRICS (Avant-Garde Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Revenue"
                    value={`$${summary?.revenue?.value?.toLocaleString() || '0'}`}
                    change={summary?.revenue?.change}
                    icon={TrendingUp}
                    color="violet"
                />
                <MetricCard
                    title="Sales Velocity"
                    value={summary?.orders?.value?.toLocaleString() || '0'}
                    subtitle="Orders / Period"
                    change={summary?.orders?.change}
                    icon={Activity}
                    color="emerald"
                />
                <MetricCard
                    title="Active Stock"
                    value={summary?.stockLevel?.value?.toLocaleString() || 'N/A'}
                    subtitle="Units Available"
                    icon={Package}
                    color="blue"
                />
                <MetricCard
                    title="Active Consumers"
                    value={summary?.activeClients?.value?.toLocaleString() || '0'}
                    icon={Users}
                    color="orange"
                />
            </div>

            {/* 2. SECONDARY METRICS (Loyalty & Risk) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-zinc-950/30 border-zinc-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <RefreshCcw className="w-12 h-12" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-zinc-500 tracking-widest">Loyalty Loop</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-2xl font-bold text-zinc-200">{repeatRate.toFixed(1)}%</div>
                                <div className="text-[10px] text-zinc-600">Repeat Purchase Rate</div>
                            </div>
                            <Progress value={repeatRate} className="w-20 h-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-950/30 border-zinc-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <AlertCircle className="w-12 h-12 text-rose-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-zinc-500 tracking-widest">Friction Index</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-2xl font-bold text-zinc-200">{returnRate.toFixed(1)}%</div>
                                <div className="text-[10px] text-zinc-600">Return / Cancellation Rate</div>
                            </div>
                            <div className={`text-xs font-bold ${returnRate > 5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {returnRate > 5 ? 'Check Quality' : 'Healthy'}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="hidden md:block">
                    {/* Spacer */}
                </div>
            </div>

            {/* 3. MAIN VISUALIZATION ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Performance Trajectory (Chart) */}
                <Card className="col-span-2 bg-zinc-950/50 border-zinc-900 shadow-xl overflow-hidden backdrop-blur-sm flex flex-col relative" id="performance-chart-card">
                    <CardHeader className="border-b border-zinc-800/50 pb-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                <Activity className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-medium text-zinc-300 uppercase tracking-widest">
                                    Performance Trajectory
                                </CardTitle>
                                <p className="text-[10px] text-zinc-500 font-mono hidden md:block">Revenue & Order Volume Analysis</p>
                            </div>
                        </div>

                        {/* ULTRATHINK TOOLBAR */}
                        <div className="flex items-center gap-1">
                            <TooltipProvider>
                                <ShadcnTooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10">
                                            <Info className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-950 border-zinc-800 text-zinc-300 max-w-xs">
                                        <p>Displays revenue (area) and order volume (line) over time.</p>
                                        <p className="mt-2 text-xs text-zinc-500">Use the bottom slider to zoom/pan specific periods.</p>
                                    </TooltipContent>
                                </ShadcnTooltip>
                            </TooltipProvider>

                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-7 w-7 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 ${customDateRange?.from ? 'text-blue-400 bg-blue-500/10' : ''}`}
                                    >
                                        <CalendarDays className="w-3.5 h-3.5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800" align="end">
                                    <div className="p-3 border-b border-zinc-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono text-zinc-400">Select Date Range</span>
                                            {customDateRange?.from && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs text-zinc-500 hover:text-zinc-300"
                                                    onClick={() => {
                                                        setCustomDateRange(undefined);
                                                        setIsDatePickerOpen(false);
                                                    }}
                                                >
                                                    Reset
                                                </Button>
                                            )}
                                        </div>
                                        {customDateRange?.from && customDateRange?.to && (
                                            <p className="text-xs text-emerald-400 mt-1">
                                                {format(customDateRange.from, 'MMM d, yyyy')} — {format(customDateRange.to, 'MMM d, yyyy')}
                                            </p>
                                        )}
                                    </div>
                                    <Calendar
                                        mode="range"
                                        selected={customDateRange}
                                        onSelect={(range) => {
                                            console.log('[Calendar onSelect]', range, {
                                                from: range?.from?.toISOString(),
                                                to: range?.to?.toISOString(),
                                            });
                                            setCustomDateRange(range);
                                            // Auto-close after selecting full range
                                            if (range?.from && range?.to) {
                                                setTimeout(() => setIsDatePickerOpen(false), 300);
                                            }
                                        }}
                                        numberOfMonths={2}
                                        className="bg-zinc-950"
                                    />
                                    <div className="p-2 border-t border-zinc-800 flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                                            onClick={() => {
                                                setCustomDateRange({ from: subMonths(new Date(), 3), to: new Date() });
                                                setIsDatePickerOpen(false);
                                            }}
                                        >
                                            Last 3 Months
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                                            onClick={() => {
                                                setCustomDateRange({ from: subMonths(new Date(), 6), to: new Date() });
                                                setIsDatePickerOpen(false);
                                            }}
                                        >
                                            Last 6 Months
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                                            onClick={() => {
                                                setCustomDateRange({ from: subMonths(new Date(), 12), to: new Date() });
                                                setIsDatePickerOpen(false);
                                            }}
                                        >
                                            Last Year
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10"
                                onClick={async () => {
                                    const chartArea = document.getElementById('chart-capture-area');
                                    const brushEl = document.querySelector('.recharts-brush') as HTMLElement | null;

                                    if (chartArea) {
                                        // 1. Hide Brush for clean export
                                        if (brushEl) brushEl.style.display = 'none';

                                        const html2canvas = (await import('html2canvas')).default;
                                        const jspdf = await import('jspdf');

                                        const canvas = await html2canvas(chartArea, {
                                            backgroundColor: '#ffffff',
                                            scale: 2,
                                            logging: false,
                                            useCORS: true
                                        });

                                        // 2. Restore Brush
                                        if (brushEl) brushEl.style.display = '';

                                        const imgData = canvas.toDataURL('image/png');
                                        const pdf = new jspdf.default('l', 'mm', 'a4');
                                        const pdfWidth = pdf.internal.pageSize.getWidth();
                                        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                                        // Center vertically if PDF page is taller than image
                                        const yOffset = pdfHeight < pdf.internal.pageSize.getHeight() ? (pdf.internal.pageSize.getHeight() - pdfHeight) / 2 : 0;

                                        pdf.addImage(imgData, 'PNG', 0, yOffset, pdfWidth, pdfHeight);
                                        pdf.save('performance-trajectory.pdf');
                                    }
                                }}
                            >
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4" id="chart-capture-area">
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={neonEmerald} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={neonEmerald} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#27272a"
                                    opacity={0.5}
                                />
                                <XAxis
                                    dataKey="label"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={{ stroke: '#27272a' }}
                                    dy={10}
                                    minTickGap={20}
                                />
                                <YAxis
                                    yAxisId="revenue"
                                    orientation="left"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                />
                                <YAxis
                                    yAxisId="orders"
                                    orientation="right"
                                    stroke="#52525b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    hide // Hide duplicate axis for cleanliness, but keep ID
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#09090b',
                                        borderColor: '#27272a',
                                        color: '#f4f4f5',
                                        fontSize: '12px',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ color: '#e4e4e7' }}
                                    cursor={{ stroke: '#27272a', strokeWidth: 1 }}
                                />
                                <Brush
                                    dataKey="label"
                                    height={25}
                                    stroke="#10b981"
                                    fill="#18181b"
                                    tickFormatter={() => ''}
                                />

                                <Area
                                    yAxisId="revenue"
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Revenue"
                                    stroke={neonEmerald}
                                    strokeWidth={2}
                                    fill="url(#splitColor)"
                                    activeDot={{ r: 4, fill: neonEmerald, stroke: '#09090b', strokeWidth: 2 }}
                                />
                                <Line
                                    yAxisId="revenue" // Scaling to revenue for visual harmony, technically distinct but mapped
                                    type="monotone"
                                    dataKey="orders"
                                    name="Orders"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#8b5cf6' }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Right: Affinity Nexus */}
                <div className="col-span-1 h-full">
                    <ProductAffinityChart data={summary?.productAffinity || []} />
                </div>
            </div>

            {/* 4. DETAILS ROW (Consumer Index) */}
            <div className="pt-4">
                <ProductConsumersList productId={productId} initialConsumers={topClients} />
            </div>
        </div>
    );
}

// Sub-component for strict standard styling
function MetricCard({ title, value, subtitle, change, icon: Icon, color }: any) {
    const isPositive = change > 0;
    const isNeutral = change === 0 || change === undefined;

    // Dynamic glow based on color prop
    const glowColor = color === 'violet' ? 'shadow-violet-500/10' : color === 'emerald' ? 'shadow-emerald-500/10' : 'shadow-zinc-500/10';
    const textColor = color === 'violet' ? 'text-violet-400' : color === 'emerald' ? 'text-emerald-400' : color === 'orange' ? 'text-orange-400' : 'text-blue-400';

    return (
        <Card className={`bg-zinc-950/50 border-zinc-900 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-zinc-800 transition-all duration-500 ${glowColor}`}>
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${textColor}`}>
                <Icon className="w-16 h-16" />
            </div>
            <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
                        <Icon className={`w-5 h-5 ${textColor}`} />
                    </div>
                    {!isNeutral && (
                        <Badge variant="outline" className={`bg-zinc-950 border-zinc-800 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {Math.abs(change).toFixed(1)}%
                        </Badge>
                    )}
                </div>
                <div className="space-y-1">
                    <h3 className="text-zinc-500 text-xs font-mono uppercase tracking-widest">{title}</h3>
                    <div className="text-2xl font-bold text-zinc-100 tabular-nums tracking-tight">{value}</div>
                    {subtitle && <p className="text-zinc-600 text-[10px] font-mono">{subtitle}</p>}
                </div>
            </CardContent>
        </Card>
    );
}
