'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForecastDataPoint } from "@/app/actions/analytics/types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, Telescope } from "lucide-react";

interface ForecastHorizonProps {
    data?: ForecastDataPoint[];
    className?: string;
    loading?: boolean;
}

export function ForecastHorizon({ data, className, loading }: ForecastHorizonProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-[300px] flex items-center justify-center animate-pulse">
                    <Telescope className="h-8 w-8 text-zinc-700" />
                </div>
            </Card>
        );
    }

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Forecast Horizon (6 Mo)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#e4e4e7', fontSize: '12px', fontFamily: 'monospace' }}
                                cursor={{ stroke: '#52525b', strokeDasharray: '3 3' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                            />
                            <Area type="monotone" dataKey="confirmed" stroke="#10b981" fillOpacity={1} fill="url(#colorConfirmed)" stackId="1" />
                            <Area type="monotone" dataKey="projected" stroke="#8b5cf6" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProjected)" stackId="1" />
                            <Area type="monotone" dataKey="riskAdjusted" stroke="#f59e0b" fill="none" strokeWidth={2} dot={false} />
                            {/* Annotation */}
                            <ReferenceLine x={data[0]?.date} stroke="#52525b" label={{ value: "NOW", position: "insideTopLeft", fill: "#52525b", fontSize: 10 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex gap-4 justify-center mt-2 text-[10px] uppercase font-mono text-zinc-500">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> Confirmed Revenue</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-violet-500 rounded-full" /> Projected Growth</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-full" /> Risk Adjusted</div>
                </div>
            </CardContent>
        </Card>
    );
}
