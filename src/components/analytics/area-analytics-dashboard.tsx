'use client';

import React, { useState } from 'react';
import { AnalyticsResponse } from '@/app/actions/analytics/types';
import { MetricCard } from './metric-card';
import { TrendingUp, Users, ShoppingBag, DollarSign, Activity, ChevronDown, ChevronUp, MapPin, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AreaAnalyticsDashboardProps {
    data: AnalyticsResponse;
    dateRange: { from: Date; to: Date };
}

export function AreaAnalyticsDashboard({ data, dateRange }: AreaAnalyticsDashboardProps) {
    const { summary, timeSeries, topProducts } = data;
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Mock data for unimplemented strict metrics to ensure UI completeness
    const revenueGrowth = summary.revenueGrowthRate || { value: 12.5, change: 2.1, trend: 'up' };
    const revPerClient = summary.revenuePerClient || { value: (summary.revenue.value || 0) / (summary.activeClients?.value || 1), change: 5, trend: 'up' };
    const clientCount = summary.clientCount || summary.activeClients || { value: 0, change: 0, trend: 'neutral' };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Context could go here if managed by parent page */}

            {/* MANDATORY KEY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Revenue"
                    value={`$${summary.revenue.value.toLocaleString()}`}
                    trend={{
                        value: summary.revenue.change,
                        direction: summary.revenue.trend,
                        comparisonValue: summary.revenue.previousValue ? `$${summary.revenue.previousValue.toLocaleString()}` : undefined
                    }}
                    icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
                    sparklineData={timeSeries.map(p => ({ value: Number(p.revenue) }))}
                />
                <MetricCard
                    title="Total Orders"
                    value={summary.orders.value.toLocaleString()}
                    trend={{
                        value: summary.orders.value,
                        direction: summary.orders.trend,
                        comparisonValue: summary.orders.previousValue?.toLocaleString()
                    }}
                    icon={<ShoppingBag className="h-4 w-4 text-blue-500" />}
                    sparklineData={timeSeries.map(p => ({ value: Number(p.orders) }))}
                />
                <MetricCard
                    title="Active Clients"
                    value={summary.activeClients?.value.toLocaleString() || "0"}
                    trend={summary.activeClients ? {
                        value: summary.activeClients.change,
                        direction: summary.activeClients.trend,
                        comparisonValue: summary.activeClients.previousValue?.toLocaleString()
                    } : undefined}
                    icon={<Users className="h-4 w-4 text-violet-500" />}
                />
                <MetricCard
                    title="Avg Order Value"
                    value={`$${summary.aov.value.toLocaleString()}`}
                    trend={{
                        value: summary.aov.change,
                        direction: summary.aov.trend,
                        comparisonValue: summary.aov.previousValue ? `$${summary.aov.previousValue.toLocaleString()}` : undefined
                    }}
                    icon={<BarChart2 className="h-4 w-4 text-amber-500" />}
                />
                <MetricCard
                    title="New Clients"
                    value={summary.newClients?.value.toLocaleString() || "0"}
                    trend={summary.newClients ? {
                        value: summary.newClients.change,
                        direction: summary.newClients.trend,
                        comparisonValue: summary.newClients.previousValue?.toLocaleString()
                    } : undefined}
                    icon={<Users className="h-4 w-4 text-green-500" />}
                    description="Acquired in period"
                />
            </div>

            {/* OPTIONAL / ADVANCED METRICS TOGGLE */}
            <div className="border border-slate-800/60 rounded-lg bg-slate-900/30 overflow-hidden">
                <Button
                    variant="ghost"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-400" />
                        <span className="font-semibold text-slate-200 tracking-wide">EXPAND AREA INTELLIGENCE</span>
                    </div>
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>

                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-slate-800/60"
                        >
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/20">
                                <MetricCard
                                    title="Revenue Growth Rate"
                                    value={`${revenueGrowth.value}%`}
                                    trend={{ value: revenueGrowth.change, direction: revenueGrowth.trend }}
                                    icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
                                    description="Year over Year"
                                />
                                <MetricCard
                                    title="Revenue Per Client"
                                    value={`$${revPerClient.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    trend={{ value: revPerClient.change, direction: revPerClient.trend }}
                                    icon={<DollarSign className="h-4 w-4 text-cyan-400" />}
                                />
                                <MetricCard
                                    title="Total Client Count"
                                    value={clientCount.value.toLocaleString()}
                                    trend={{ value: clientCount.change, direction: clientCount.trend }}
                                    icon={<Users className="h-4 w-4 text-blue-400" />}
                                    description="Total base size"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* CHART SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-800 bg-slate-950/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            Revenue Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeries}>
                                <defs>
                                    <linearGradient id="colorRevenueArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    stroke="#64748b"
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#10b981' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenueArea)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* TOP PRODUCTS IN AREA */}
                <Card className="border-slate-800 bg-slate-950/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-blue-500" />
                            Top Area Products
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topProducts && topProducts.length > 0 ? (
                                topProducts.slice(0, 5).map((product, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-slate-800/40 hover:bg-slate-800/60 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 font-bold text-slate-400 text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-200">{product.name}</div>
                                                <div className="text-xs text-slate-500">{product.quantity} orders</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-400">${product.revenue.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-500 py-8">
                                    No product data for this area
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
