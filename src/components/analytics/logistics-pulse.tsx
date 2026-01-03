'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalMetrics } from "@/app/actions/analytics/types";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { Truck } from "lucide-react";

interface LogisticsPulseProps {
    data?: OperationalMetrics;
    className?: string;
    loading?: boolean;
}

export function LogisticsPulse({ data, className, loading }: LogisticsPulseProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-[200px] flex items-center justify-center animate-pulse">
                    <Truck className="h-8 w-8 text-zinc-700" />
                </div>
            </Card>
        );
    }

    // Use history from data if available, otherwise fallback to a flat line or empty state
    // (mockTrendData removed to prefer real or representative data from server)
    const trendData = data.history?.map(h => ({
        day: h.date,
        late: h.late,
        otif: h.otif
    })) || [];

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center justify-between">
                    <span className="flex items-center gap-2"><Truck className="h-4 w-4" /> Logistics Pulse (OTIF)</span>
                    <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded border",
                        data.otifRate.value >= 98 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" :
                            data.otifRate.value >= 95 ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                                "bg-red-500/10 border-red-500/30 text-red-500"
                    )}>
                        {data.otifRate.value.toFixed(1)}%
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[150px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="day" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis yAxisId="left" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} hide />
                            <YAxis yAxisId="right" orientation="right" domain={[80, 100]} hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#e4e4e7', fontSize: '12px' }}
                                cursor={{ fill: '#27272a' }}
                            />
                            <Bar yAxisId="left" dataKey="late" barSize={10} fill="#ef4444" radius={[2, 2, 0, 0]} opacity={0.6} />
                            <Line yAxisId="right" type="monotone" dataKey="otif" stroke="#10b981" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
