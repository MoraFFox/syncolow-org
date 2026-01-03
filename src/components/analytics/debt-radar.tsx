'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DebtAging } from "@/app/actions/analytics/types";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DebtRadarProps {
    data?: DebtAging;
    className?: string;
    loading?: boolean;
}

export function DebtRadar({ data, className, loading }: DebtRadarProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-[300px] flex items-center justify-center animate-pulse">
                    <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                </div>
            </Card>
        );
    }



    // Re-map for 5 axes
    const detailedChartData = [
        { subject: 'Current', value: data.current, type: 'safe' },
        { subject: '30d Overdue', value: data.overdue30, type: 'warning' },
        { subject: '60d Overdue', value: data.overdue60, type: 'danger' },
        { subject: '90d+ Overdue', value: data.overdue90, type: 'critical' },
    ];

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden", className)}>
            {/* Scanner Line Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(16,185,129,0.05),transparent)] animate-scan pointer-events-none" style={{ backgroundSize: '100% 200%', backgroundPosition: '0 0' }} />

            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono">
                        Debt Radar <span className="text-xs text-zinc-600 ml-2">DSO: {data.dso}d</span>
                    </CardTitle>
                    {data.riskScore > 50 ? (
                        <div className="flex items-center gap-1 text-red-500 text-xs font-bold animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> CRITICAL
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                            <CheckCircle className="h-3 w-3" /> STABLE
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={detailedChartData}>
                            <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                            />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar
                                name="Debt Distribution"
                                dataKey="value"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="#10b981"
                                fillOpacity={0.2}
                            />
                            <Legend
                                iconType="rect"
                                wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#71717a' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>

                    {/* Center Metric Overlay */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <div className="text-[10px] text-zinc-500 font-mono">TOTAL</div>
                        <div className="text-lg font-bold text-zinc-100 font-mono">
                            ${(data.total / 1000).toFixed(1)}k
                        </div>
                    </div>
                </div>

                {/* Breakdown Stats */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-red-950/20 border border-red-900/30 p-2 rounded">
                        <div className="text-[10px] text-red-400 uppercase font-mono">At Risk (&gt;60d)</div>
                        <div className="text-sm font-bold text-red-200">
                            ${((data.overdue60 + data.overdue90) / 1000).toFixed(1)}k
                        </div>
                    </div>
                    <div className="bg-emerald-950/20 border border-emerald-900/30 p-2 rounded">
                        <div className="text-[10px] text-emerald-400 uppercase font-mono">Recoverable</div>
                        <div className="text-sm font-bold text-emerald-200">
                            ${(data.current / 1000).toFixed(1)}k
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
