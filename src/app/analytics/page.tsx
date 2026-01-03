"use client";

import { useState, useEffect } from "react";
import { useAnalyticsData } from "@/hooks/use-analytics-data";
import { AnalyticsControls } from "@/components/analytics/analytics-controls";
import { MetricCard } from "@/components/analytics/metric-card";
import { SmartChart } from "@/components/analytics/smart-chart";
import { CommandConsole } from "@/components/analytics/command-console";
import { HeatMapGrid } from "@/components/analytics/heat-map-grid";
import { DebtRadar } from "@/components/analytics/debt-radar";
import { RetentionOrbit } from "@/components/analytics/retention-orbit";
import { SpoilageTicker } from "@/components/analytics/spoilage-ticker";
import { FrictionGauge } from "@/components/analytics/friction-gauge";
import { LogisticsPulse } from "@/components/analytics/logistics-pulse";
import { ForecastHorizon } from "@/components/analytics/forecast-horizon";

import { CustomerSegments } from "@/components/analytics/customer-segments";
import { ConsumptionRateList } from "@/components/analytics/consumption-rate-list";
import { AovChart } from "@/components/analytics/aov-chart";
import { TopProductsChart } from "@/components/analytics/top-products-chart";
import { DateRange } from "react-day-picker";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import {
    DollarSign,
    Activity,
    Users
} from "lucide-react";
import { useAnalyticsDrilldown } from "@/hooks/use-analytics-drilldown";
import { DrilldownSheet } from "@/components/analytics/drilldown-sheet";
import { SalesAccountSelector } from "./_components/sales-account-selector";
import { MetricExportHub } from "@/components/analytics/metric-export-hub";
import { useSalesAccounts } from "@/hooks/use-sales-accounts";


export default function AnalyticsPage() {
    // Fetch sales accounts with proper user filtering via hook
    const { refreshAccounts } = useSalesAccounts();

    useEffect(() => {
        refreshAccounts();
    }, [refreshAccounts]);

    // State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(startOfDay(new Date()), 30),
        to: endOfDay(new Date())
    });
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

    // Determine entity type and ID based on selection
    const entityType = selectedAccountId === 'all' ? 'global' : 'client';
    const entityId = selectedAccountId === 'all' ? undefined : selectedAccountId;

    // Data Fetching
    const { data: analyticsData, isLoading } = useAnalyticsData({
        entityType,
        entityId,
        dateRange: { from: dateRange?.from || new Date(), to: dateRange?.to || new Date() },
        granularity,
        metrics: ['revenue', 'orders', 'aov']
    });

    const { drilldownState, closeDrilldown } = useAnalyticsDrilldown();



    const summary = analyticsData?.summary;
    const timeSeries = analyticsData?.timeSeries || [];

    // Heatmap data transformation
    // Use topCategories from response
    const categoryHeatMapItems = (analyticsData?.topCategories || [])
        .slice(0, 15)
        .map((c) => ({
            id: c.name,
            label: c.name,
            value: c.percentageOfTotal / 100,
            displayValue: `$${c.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            trend: c.trend
        }));

    // Use topAreas from response
    const areaHeatMapItems = (analyticsData?.topAreas || [])
        .slice(0, 15)
        .map((a) => ({
            id: a.name,
            label: a.name,
            value: summary?.revenue.value ? (a.revenue / summary.revenue.value) : 0,
            displayValue: `$${a.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            trend: 'neutral' as const
        }));


    return (
        <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-emerald-500/30 pb-20 overflow-x-hidden">
            {/* Ambient Background - Scanner Effect */}
            <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            {/* Ambient Glows */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div id="analytics-dashboard" className="relative z-10 flex flex-col gap-6 max-w-[1920px] mx-auto">

                {/* HUD Console */}
                <div className="sticky top-0 z-50">
                    <CommandConsole />
                </div>

                <div className="px-6 pb-8 space-y-6">
                    {/* Header Controls */}
                    {/* Header Controls */}
                    <div className="flex flex-col xl:flex-row items-end xl:items-center justify-between gap-8 pl-2 border-l-2 border-emerald-500/50">
                        <div className="space-y-1">
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter font-mono uppercase text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 relative">
                                Command Deck
                                <span className="absolute -top-2 -right-4 text-[10px] text-emerald-500 bg-emerald-950/30 px-1 py-0.5 rounded border border-emerald-500/20">v3.0.0</span>
                            </h1>
                            <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">
                                Real-time Tactical Analytics Environment
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <SalesAccountSelector
                                selectedAccountId={selectedAccountId}
                                onSelectAccount={setSelectedAccountId}
                            />
                            <AnalyticsControls
                                dateRange={dateRange}
                                setDateRange={setDateRange}
                                granularity={granularity}
                                setGranularity={setGranularity}
                                exportTargetId="analytics-dashboard"
                                exportData={timeSeries}
                            />
                        </div>
                    </div>

                    {/* Spoilage Ticker - Critical Alerts */}
                    <div className="-mt-4">
                        <SpoilageTicker items={summary?.inventoryRisk} />
                    </div>

                    {/* Bento Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[minmax(140px,auto)]">

                        {/* Top Row: Strategic Pillars (Finance, Revenue, Retention) */}
                        <div className="md:col-span-4 md:row-span-1">
                            <DebtRadar
                                data={summary?.debtAging}
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>

                        <div className="md:col-span-4 md:row-span-1">
                            <MetricCard
                                title="Total Revenue"
                                value={summary ? `$${summary.revenue.value.toLocaleString()}` : "---"}
                                trend={summary ? {
                                    value: summary.revenue.change,
                                    direction: summary.revenue.trend,
                                    comparisonValue: summary.revenue.previousValue ? `$${summary.revenue.previousValue.toLocaleString()}` : undefined
                                } : undefined}
                                drivers={summary ? [
                                    { label: 'Orders', value: `${summary.orders.change > 0 ? '+' : ''}${summary.orders.change.toFixed(1)}%`, trend: summary.orders.trend },
                                    { label: 'AOV', value: `${summary.aov.change > 0 ? '+' : ''}${summary.aov.change.toFixed(1)}%`, trend: summary.aov.trend }
                                ] : undefined}
                                icon={<DollarSign className="h-6 w-6" />}
                                loading={isLoading}
                                sparklineData={timeSeries.map(d => ({ value: Number(d.revenue) }))}
                                variant="hero" // We might want to tone down variant if it's smaller now, but let's keep it punchy
                                className="h-full border-emerald-500/20 bg-emerald-950/10"
                            />
                        </div>

                        <div className="md:col-span-4 md:row-span-1">
                            <RetentionOrbit
                                data={summary?.clientRetention}
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>

                        {/* Middle Row: Operational Health (Domain Gap) */}
                        <div className="md:col-span-3 md:row-span-1">
                            <FrictionGauge
                                data={summary?.operational}
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>
                        <div className="md:col-span-5 md:row-span-1">
                            <LogisticsPulse
                                data={summary?.operational}
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>
                        <div className="md:col-span-4 md:row-span-1">
                            <MetricCard
                                title="Demand Missed (Stockouts)"
                                value={summary?.operational ? `$${summary.operational.stockoutMisses.value.toLocaleString()}` : "---"}
                                trend={summary?.operational ? {
                                    value: summary.operational.stockoutMisses.change,
                                    direction: summary.operational.stockoutMisses.trend
                                } : undefined}
                                icon={<Activity className="h-4 w-4" />} // Or BoxSelect
                                loading={isLoading}
                                className="h-full border-red-500/20 bg-red-950/10"
                            />
                        </div>

                        {/* Main Visualization & Heatmaps */}
                        <div className="md:col-span-8 md:row-span-3">
                            <SmartChart
                                title="Revenue & Order Volume"
                                description="Daily performance correlation"
                                height="100%"
                                className="h-full bg-zinc-900/10 border-zinc-800/30"
                            >
                                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#grid)" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        stroke="#52525b"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={40}
                                        fontFamily="monospace"
                                    />
                                    <YAxis
                                        stroke="#52525b"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                        fontFamily="monospace"
                                        width={60}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#e4e4e7', fontFamily: 'monospace' }}
                                        itemStyle={{ color: '#e4e4e7' }}
                                        cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5 5' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                        className="cursor-pointer"
                                        activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 1 }}
                                        name="Current"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="previousRevenue"
                                        stroke="#3f3f46"
                                        strokeWidth={1}
                                        strokeDasharray="4 4"
                                        fillOpacity={0}
                                        name="Previous"
                                    />
                                </AreaChart>
                            </SmartChart>
                        </div>

                        {/* Breakdown Heatmaps */}
                        <div className="md:col-span-4 md:row-span-3 flex flex-col gap-4">
                            <HeatMapGrid
                                title="Category Velocity"
                                items={categoryHeatMapItems}
                                className="flex-1 min-h-[200px]"
                            />
                            <HeatMapGrid
                                title="Regional Density"
                                items={areaHeatMapItems}
                                className="flex-1 min-h-[200px]"
                            />
                        </div>

                        {/* Row 3: Strategic Intelligence (Ultramode) */}
                        <div className="md:col-span-6 md:row-span-1">
                            <ForecastHorizon
                                data={summary?.forecast}
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>
                        <div className="md:col-span-6 md:row-span-1">
                            <CustomerSegments
                                data={summary?.customerSegments}
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>

                        {/* Row 4: Product Deep Dive */}
                        <div className="md:col-span-4 md:row-span-2">
                            <TopProductsChart
                                data={analyticsData?.topProducts} // Corrected access
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>
                        <div className="md:col-span-4 md:row-span-2">
                            <ConsumptionRateList
                                data={summary?.productConsumption}
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>
                        <div className="md:col-span-4 md:row-span-1">
                            <AovChart
                                data={timeSeries}
                                loading={isLoading}
                                className="h-full"
                            />
                        </div>
                        <div className="md:col-span-4 md:row-span-1">
                            <MetricCard
                                title="New Clients"
                                value={summary?.newClients ? summary.newClients.value.toLocaleString() : "---"}
                                trend={summary?.newClients ? {
                                    value: summary.newClients.change,
                                    direction: summary.newClients.trend
                                } : undefined}
                                icon={<Users className="h-4 w-4" />}
                                loading={isLoading}
                                variant="compact"
                                className="h-full bg-zinc-900/10 border-zinc-800/30"
                            />
                        </div>

                    </div>
                </div>
            </div>

            <DrilldownSheet state={drilldownState} onClose={closeDrilldown} />

            {/* Metric Export Hub - Floating Action Button */}
            <MetricExportHub
                data={analyticsData ?? null}
                dateRange={dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined}
            />
        </div>
    );
}
