'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LinkIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";

interface AffinityItem {
    id: string;
    name: string;
    correlationScore: number;
}

interface ProductAffinityChartProps {
    data: AffinityItem[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl backdrop-blur-sm z-50">
                <p className="text-zinc-400 text-xs font-mono mb-2">{label}</p>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-300">Co-occurrences:</span>
                    <span className="font-mono font-bold text-amber-500">
                        {payload[0].value}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export function ProductAffinityChart({ data }: ProductAffinityChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-full bg-zinc-950/50 border-zinc-900 shadow-xl flex flex-col items-center justify-center text-zinc-600 relative overflow-hidden group">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <LinkIcon className="w-8 h-8 opacity-20 mb-2" />
                <span className="text-xs font-mono">No bundle affinity data</span>
            </Card>
        );
    }

    // Truncate names for chart
    const chartData = data.map(item => ({
        ...item,
        shortName: item.name.length > 15 ? item.name.substring(0, 15) + '..' : item.name
    }));

    return (
        <Card className="h-full bg-zinc-950/50 border-zinc-900 shadow-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-50" />

            <CardHeader className="pb-2 border-b border-zinc-900/50">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300 uppercase tracking-widest">
                    <LinkIcon className="w-4 h-4 text-amber-500" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Bundle Affinity</span>
                </CardTitle>
                <div className="text-[10px] text-zinc-500 font-mono">Freq. Bought Together</div>
            </CardHeader>
            <CardContent className="h-[200px] w-full pt-4 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                        <XAxis
                            type="number"
                            hide
                        />
                        <YAxis
                            type="category"
                            dataKey="shortName"
                            width={100}
                            tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                        <Bar dataKey="correlationScore" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#f59e0b', '#d97706', '#b45309'][index % 3]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
