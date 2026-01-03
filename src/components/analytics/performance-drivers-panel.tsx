'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import { DriverTimeSeries, DriverTimeSeriesPoint } from '@/app/actions/analytics/types';
import { ShoppingCart, TrendingUp, Users } from 'lucide-react';

interface PerformanceDriversPanelProps {
    driverTimeSeries?: DriverTimeSeries;
    loading?: boolean;
    className?: string;
}

interface DriverChartProps {
    title: string;
    data: DriverTimeSeriesPoint[];
    icon: React.ReactNode;
    color: string;
    formatValue?: (value: number) => string;
    loading?: boolean;
}

function DriverChart({ title, data, icon, color, formatValue, loading }: DriverChartProps) {
    if (loading) {
        return (
            <Card className="bg-black/30 border-zinc-800/50">
                <CardHeader className="pb-2">
                    <div className="h-4 w-20 bg-zinc-800 animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                    <div className="h-24 bg-zinc-900/50 animate-pulse rounded" />
                </CardContent>
            </Card>
        );
    }

    // Calculate change
    const currentTotal = data.reduce((sum, d) => sum + d.value, 0);
    const previousTotal = data.reduce((sum, d) => sum + d.previousValue, 0);
    const changePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    return (
        <Card className="bg-black/30 border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
            <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="text-zinc-500">{icon}</div>
                        <CardTitle className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                            {title}
                        </CardTitle>
                    </div>
                    <div className={cn(
                        "text-xs font-mono font-medium",
                        changePercent > 0 ? "text-emerald-500" : changePercent < 0 ? "text-rose-500" : "text-zinc-500"
                    )}>
                        {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-2 pb-3">
                <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <XAxis
                                dataKey="label"
                                hide
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    border: '1px solid #27272a',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                }}
                                labelStyle={{ color: '#a1a1aa' }}
                                formatter={(value: number, name: string) => [
                                    formatValue ? formatValue(value) : value.toFixed(0),
                                    name === 'value' ? 'Current' : 'Previous'
                                ]}
                            />
                            {/* Previous period - dashed */}
                            <Line
                                type="monotone"
                                dataKey="previousValue"
                                stroke="#52525b"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                isAnimationActive={false}
                            />
                            {/* Current period - solid */}
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                            {/* Zero line if data spans negative */}
                            <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="2 2" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function PerformanceDriversPanel({
    driverTimeSeries,
    loading = false,
    className,
}: PerformanceDriversPanelProps) {
    return (
        <div className={cn("space-y-3", className)}>
            {/* Section Header */}
            <div className="flex items-center gap-3">
                <h3 className="text-xs font-mono uppercase text-zinc-500 tracking-widest">
                    Performance Drivers
                </h3>
                <div className="flex-1 h-px bg-zinc-800/50" />
                <span className="text-[10px] text-zinc-600 font-mono">
                    Why revenue changed
                </span>
            </div>

            {/* Driver Charts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DriverChart
                    title="Orders"
                    data={driverTimeSeries?.orders || []}
                    icon={<ShoppingCart className="h-3.5 w-3.5" />}
                    color="#10b981"
                    loading={loading}
                />
                <DriverChart
                    title="Avg Order Value"
                    data={driverTimeSeries?.aov || []}
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    color="#3b82f6"
                    formatValue={(v) => `$${v.toFixed(0)}`}
                    loading={loading}
                />
                <DriverChart
                    title="Active Clients"
                    data={driverTimeSeries?.activeClients || []}
                    icon={<Users className="h-3.5 w-3.5" />}
                    color="#8b5cf6"
                    loading={loading}
                />
            </div>
        </div>
    );
}
