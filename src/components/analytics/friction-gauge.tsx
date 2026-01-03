'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalMetrics } from "@/app/actions/analytics/types";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { cn } from "@/lib/utils";
import { AlertCircle, Gauge } from "lucide-react";

interface FrictionGaugeProps {
    data?: OperationalMetrics;
    className?: string;
    loading?: boolean;
}

export function FrictionGauge({ data, className, loading }: FrictionGaugeProps) {
    if (loading || !data) {
        return (
            <Card className={cn("bg-zinc-950 border-zinc-800", className)}>
                <div className="h-full flex items-center justify-center animate-pulse">
                    <Gauge className="h-8 w-8 text-zinc-700" />
                </div>
            </Card>
        );
    }

    const frictionValue = Math.min(100, data.frictionRate.value);
    // Lower is better. 0-2% Safe, 2-5% Warning, >5% Critical
    const isCritical = frictionValue > 5;
    const isWarning = frictionValue > 2;

    const chartData = [
        {
            name: 'Friction',
            value: frictionValue,
            fill: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#3b82f6'
        }
    ];

    return (
        <Card className={cn("bg-zinc-950/50 border-zinc-800/50 backdrop-blur-sm relative overflow-hidden flex flex-col", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 tracking-wider uppercase font-mono flex items-center justify-between">
                    <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Friction</span>
                    <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded border",
                        isCritical ? "bg-red-500/10 border-red-500/30 text-red-500" :
                            isWarning ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                                "bg-blue-500/10 border-blue-500/30 text-blue-500"
                    )}>
                        {frictionValue.toFixed(1)}%
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 relative">
                <div className="absolute inset-0 top-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="80%"
                            barSize={10}
                            data={chartData}
                            startAngle={180}
                            endAngle={0}
                        >
                            <PolarAngleAxis type="number" domain={[0, 10]} angleAxisId={0} tick={false} />
                            <RadialBar
                                background={{ fill: '#27272a' }}
                                dataKey="value"
                                cornerRadius={30} // Use number, not string '50%'
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>

                {/* Center Label */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center mt-4">
                    <div className="text-xs text-zinc-500 font-mono uppercase">Returns Rate</div>
                </div>
            </CardContent>
        </Card>
    );
}
