'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeSeriesPoint } from "@/app/actions/analytics/types";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

interface AovChartProps {
    data?: TimeSeriesPoint[];
    className?: string;
    loading?: boolean;
}

export function AovChart({ data, className, loading }: AovChartProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-[200px] flex items-center justify-center animate-pulse">
                    <ShoppingBag className="h-8 w-8 text-zinc-700" />
                </div>
            </Card>
        );
    }

    const currentAov = data.length > 0 ? (data.reduce((sum, p) => sum + p.aov, 0) / data.length) : 0;

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center justify-between">
                    <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Average Order Value</span>
                    <span className="text-emerald-500 font-bold">${currentAov.toFixed(2)}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[150px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorAov" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="label" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#e4e4e7', fontSize: '12px', fontFamily: 'monospace' }}
                                cursor={{ stroke: '#52525b', strokeDasharray: '3 3' }}
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'AOV']}
                            />
                            <Area type="monotone" dataKey="aov" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAov)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
