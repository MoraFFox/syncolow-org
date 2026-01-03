'use client';

import { useState } from "react";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { AnalyticsControls } from "@/components/analytics/analytics-controls";
import { MetricCard } from "@/components/analytics/metric-card";
import { SmartChart } from "@/components/analytics/smart-chart";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, ShoppingCart, Activity, RefreshCw, Clock, CreditCard, ShoppingBag, Percent } from "lucide-react";
import { useAnalyticsDrilldown } from "@/hooks/use-analytics-drilldown";
import { DrilldownSheet } from "@/components/analytics/drilldown-sheet";
import { AnalyticsQuery } from "@/app/actions/analytics/types";

interface ClientAnalyticsDashboardProps {
    clientId: string;
}

export function ClientAnalyticsDashboard({ clientId }: ClientAnalyticsDashboardProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 90),
        to: new Date()
    });
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');

    const { data, isLoading, error } = useAnalyticsData({
        entityType: 'client',
        entityId: clientId,
        dateRange: { from: dateRange?.from || new Date(), to: dateRange?.to || new Date() },
        granularity,
        metrics: ['revenue', 'orders', 'aov']
    });

    const { drilldownState, openDrilldown, closeDrilldown } = useAnalyticsDrilldown();

    const handleChartClick = (data: any) => {
        if (!data || !data.activePayload) return;

        const payload = data.activePayload[0].payload;
        openDrilldown(
            payload.date, // ISO date string from the data point
            `Orders from ${payload.label}`,
            'date',
            {
                entityType: 'client',
                entityId: clientId
            } as Partial<AnalyticsQuery>
        );
    };

    const summary = data?.summary;
    const timeSeries = data?.timeSeries || [];

    return (
        <div id={`client-analytics-${clientId}`} className="flex flex-col gap-6 py-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-xl font-mono font-bold text-zinc-300 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    CLIENT PERFORMANCE
                </h3>
                <AnalyticsControls
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    granularity={granularity}
                    setGranularity={setGranularity}
                    exportTargetId={`client-analytics-${clientId}`}
                    className="w-full sm:w-auto"
                />
            </div>

            {/* KPI Cards */}
            {/* KPI Section - Metric Governance: Client Detail Page */}
            {/* Mandatory Metrics: Value, Activity, Risk */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <MetricCard
                        title="Total Revenue"
                        value={summary ? `$${summary.revenue.value.toLocaleString()}` : "---"}
                        trend={summary ? {
                            value: summary.revenue.change,
                            direction: summary.revenue.trend,
                            comparisonValue: summary.revenue.previousValue ? `$${summary.revenue.previousValue.toLocaleString()}` : undefined
                        } : undefined}
                        icon={<DollarSign className="h-4 w-4" />}
                        loading={isLoading}
                        className="bg-zinc-900/40 border-zinc-800"
                    />
                    <MetricCard
                        title="Order Count"
                        value={summary ? summary.orders.value.toLocaleString() : "---"}
                        trend={summary ? {
                            value: summary.orders.change,
                            direction: summary.orders.trend,
                            comparisonValue: summary.orders.previousValue?.toLocaleString()
                        } : undefined}
                        icon={<ShoppingCart className="h-4 w-4" />}
                        loading={isLoading}
                        className="bg-zinc-900/40 border-zinc-800"
                    />
                    <MetricCard
                        title="Avg Order Value"
                        value={summary ? `$${summary.aov.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "---"}
                        trend={summary ? {
                            value: summary.aov.change,
                            direction: summary.aov.trend,
                            comparisonValue: summary.aov.previousValue ? `$${summary.aov.previousValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : undefined
                        } : undefined}
                        icon={<DollarSign className="h-4 w-4" />}
                        loading={isLoading}
                        className="bg-zinc-900/40 border-zinc-800"
                    />
                    <MetricCard
                        title="Last Activity"
                        value={summary?.lastOrderDate ? new Date(summary.lastOrderDate).toLocaleDateString() : "Never"}
                        icon={<Activity className="h-4 w-4" />}
                        loading={isLoading}
                        className="bg-zinc-900/40 border-zinc-800"
                    />
                    <MetricCard
                        title="Unique Products"
                        value={summary?.uniqueProductsPurchased ? summary.uniqueProductsPurchased.value : "---"}
                        trend={summary?.uniqueProductsPurchased ? {
                            value: summary.uniqueProductsPurchased.change,
                            direction: summary.uniqueProductsPurchased.trend,
                            comparisonValue: summary.uniqueProductsPurchased.previousValue?.toLocaleString()
                        } : undefined}
                        icon={<ShoppingBag className="h-4 w-4" />}
                        loading={isLoading}
                        className="bg-zinc-900/40 border-zinc-800"
                    />
                </div>

                {/* Optional Metrics: Deep Insight / Role Specific */}
                <details className="group">
                    <summary className="list-none cursor-pointer flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-indigo-400 transition-colors w-fit select-none">
                        <span>[+] EXPAND INTELLIGENCE</span>
                        <span className="h-[1px] w-12 bg-zinc-800 group-hover:bg-indigo-500/50 transition-colors" />
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-4 animate-in slide-in-from-top-2 duration-300">
                        <MetricCard
                            title="CLV (Est)"
                            value={summary?.clv ? `$${summary.clv.value.toLocaleString()}` : "---"}
                            trend={summary?.clv ? { value: summary.clv.change, direction: summary.clv.trend } : undefined}
                            icon={<DollarSign className="h-4 w-4 text-emerald-400 opacity-70" />}
                            loading={isLoading}
                            className="bg-zinc-900/20 border-zinc-800/50"
                        />
                        <MetricCard
                            title="Repeat Rate"
                            value={summary?.repeatPurchaseRate ? `${(summary.repeatPurchaseRate.value * 100).toFixed(0)}%` : "---"}
                            trend={summary?.repeatPurchaseRate ? { value: summary.repeatPurchaseRate.change, direction: summary.repeatPurchaseRate.trend } : undefined}
                            icon={<Activity className="h-4 w-4 text-blue-400 opacity-70" />}
                            loading={isLoading}
                            className="bg-zinc-900/20 border-zinc-800/50"
                        />
                        <MetricCard
                            title="Return Rate"
                            value={summary?.returns ? `${summary.returns.value.toFixed(1)}%` : "---"}
                            trend={summary?.returns ? { value: summary.returns.change, direction: summary.returns.trend } : undefined}
                            icon={<RefreshCw className="h-4 w-4 text-rose-400 opacity-70" />}
                            loading={isLoading}
                            className="bg-zinc-900/20 border-zinc-800/50"
                        />
                        <MetricCard
                            title="Fulfillment Time"
                            value={summary?.fulfillmentTime ? `${summary.fulfillmentTime.value}d` : "---"}
                            icon={<Clock className="h-4 w-4 text-amber-400 opacity-70" />}
                            loading={isLoading}
                            className="bg-zinc-900/20 border-zinc-800/50"
                        />
                        <MetricCard
                            title="Discount Dep."
                            value={summary?.discountDependency ? `${(summary.discountDependency.value * 100).toFixed(0)}%` : "---"}
                            icon={<Percent className="h-4 w-4 text-purple-400 opacity-70" />}
                            loading={isLoading}
                            className="bg-zinc-900/20 border-zinc-800/50"
                        />
                    </div>
                </details>
            </div>

            {/* Charts */}
            <div className="h-[350px]">
                <SmartChart
                    title="Spending Habits"
                    description="Revenue over time"
                    loading={isLoading}
                    error={error?.message}
                >
                    <BarChart
                        data={timeSeries}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        onClick={handleChartClick}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                            dataKey="label"
                            stroke="#71717a"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#71717a"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: '#27272a' }}
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#e4e4e7' }}
                        />
                        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} className="cursor-pointer hover:opacity-80 transition-opacity">
                            {timeSeries.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.revenue as number > (summary?.aov?.value || 0) ? '#10b981' : '#3f3f46'} />
                            ))}
                        </Bar>
                    </BarChart>
                </SmartChart>
            </div>

            <DrilldownSheet state={drilldownState} onClose={closeDrilldown} />
        </div>
    );
}
