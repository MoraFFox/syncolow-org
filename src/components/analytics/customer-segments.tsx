'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerSegment } from "@/app/actions/analytics/types";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, ZAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { Users, UserCheck } from "lucide-react";

interface CustomerSegmentsProps {
    data?: CustomerSegment[];
    className?: string;
    loading?: boolean;
}

export function CustomerSegments({ data, className, loading }: CustomerSegmentsProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-[300px] flex items-center justify-center animate-pulse">
                    <Users className="h-8 w-8 text-zinc-700" />
                </div>
            </Card>
        );
    }

    // Prepare data for Scatter Plot (X: Count, Y: TotalValue, Z: Percentage/Size)
    // We map segments to coordinates manually for a "Strategic Map" feel
    const scatterData = data.map(s => ({
        ...s,
        x: s.count,
        y: s.totalValue,
        z: s.percentage
    }));

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center gap-2">
                    <UserCheck className="h-4 w-4" /> Customer Segmentation (RFM)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis type="number" dataKey="x" name="Count" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} label={{ value: "Client Count", position: "insideBottom", offset: -10, fontSize: 10, fill: "#52525b" }} />
                            <YAxis type="number" dataKey="y" name="Value" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                            <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-zinc-950 border border-zinc-800 p-2 rounded shadow-xl text-xs font-mono">
                                                <div className="font-bold text-zinc-200">{d.label} Segment</div>
                                                <div>Clients: {d.count}</div>
                                                <div>Revenue: ${d.totalValue.toLocaleString()}</div>
                                                <div className="text-zinc-500">{d.percentage.toFixed(1)}% of base</div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Scatter name="Segments" data={scatterData}>
                                {scatterData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={
                                        entry.id === 'champions' ? '#10b981' :
                                            entry.id === 'loyal' ? '#3b82f6' :
                                                entry.id === 'at_risk' ? '#f59e0b' :
                                                    entry.id === 'lost' ? '#ef4444' : '#64748b'
                                    } />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {data.map(s => (
                        <div key={s.id} className="flex items-center gap-1 text-[10px] uppercase font-mono text-zinc-500">
                            <div className={cn("w-2 h-2 rounded-full",
                                s.id === 'champions' ? 'bg-emerald-500' :
                                    s.id === 'loyal' ? 'bg-blue-500' :
                                        s.id === 'at_risk' ? 'bg-amber-500' :
                                            s.id === 'lost' ? 'bg-red-500' : 'bg-slate-500'
                            )} />
                            {s.label}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
