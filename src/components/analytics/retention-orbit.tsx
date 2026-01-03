'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientRetention } from "@/app/actions/analytics/types";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface RetentionOrbitProps {
    data?: ClientRetention;
    className?: string;
    loading?: boolean;
}

export function RetentionOrbit({ data, className, loading }: RetentionOrbitProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-[300px] flex items-center justify-center animate-pulse">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                </div>
            </Card>
        );
    }

    // Transform data for scatter plot
    // Y-axis will be pseudo-random to create "cloud" effect, or banded by value
    const chartData = data.clients.map((c, i) => ({
        ...c,
        y: i % 2 === 0 ? 1 : -1 * (Math.random() * 0.5 + 0.5), // Spread vertically
        size: Math.sqrt(c.value) / 10 // Scale bubble size
    }));


    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as ClientRetention['clients'][0];
            return (
                <div className="bg-zinc-950 border border-zinc-800 p-2 rounded shadow-xl text-xs font-mono">
                    <div className="font-bold text-zinc-200">{data.name}</div>
                    <div className="text-zinc-500 mb-1">Last Order: {data.daysSinceLastOrder} days ago</div>
                    <div className={cn(
                        "font-bold",
                        data.status === 'at-risk' ? "text-red-500" :
                            data.status === 'drifting' ? "text-amber-500" : "text-emerald-500"
                    )}>
                        {data.status.toUpperCase()} ({(data.churnProbability * 100).toFixed(0)}%)
                    </div>
                    <div className="mt-1 pt-1 border-t border-zinc-800 flex justify-between gap-4">
                        <span>Value:</span>
                        <span className="text-zinc-200">${data.value.toLocaleString()}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden", className)}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none" />

            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Retention Orbit
                </CardTitle>
                <div className="flex gap-2 text-[10px] font-mono">
                    <span className="text-emerald-500 text-shadow-sm px-2 py-0.5 bg-emerald-950/30 rounded border border-emerald-900/50">
                        {data.safeCount} Safe
                    </span>
                    <span className="text-amber-500 text-shadow-sm px-2 py-0.5 bg-amber-950/30 rounded border border-amber-900/50 animate-pulse">
                        {data.driftingCount} Drift
                    </span>
                    <span className="text-red-500 text-shadow-sm px-2 py-0.5 bg-red-950/30 rounded border border-red-900/50 animate-pulse">
                        {data.atRiskCount} Risk
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <XAxis
                                type="number"
                                dataKey="daysSinceLastOrder"
                                name="Days Inactive"
                                unit="d"
                                reversed={true} // 0 days (Active) on RIGHT side
                                stroke="#52525b"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 90]}
                            />
                            <YAxis type="number" dataKey="y" hide domain={[-2, 2]} />
                            <ZAxis type="number" dataKey="value" range={[50, 400]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                            {/* Zones */}
                            <ReferenceLine x={30} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "DRIFT ZONE", position: "insideTop", fill: "#f59e0b", fontSize: 10 }} />
                            <ReferenceLine x={60} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "DANGER ZONE", position: "insideTop", fill: "#ef4444", fontSize: 10 }} />

                            <Scatter name="Clients" data={chartData}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.status === 'at-risk' ? '#ef4444' :
                                                entry.status === 'drifting' ? '#f59e0b' : '#10b981'
                                        }
                                        className="hover:opacity-80 transition-opacity cursor-pointer"
                                        stroke="rgba(255,255,255,0.1)"
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Micro-Interaction Hint */}
                <div className="flex justify-center mt-2">
                    <p className="text-[10px] text-zinc-600 font-mono text-center">
                        &larr; Risk Increasing | Hover to init Rescue Protocol
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
