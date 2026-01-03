'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AreaPerformance } from '@/app/actions/analytics/types';
import { TrendingUp, TrendingDown, Minus, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AreaPerformanceTableProps {
    areas?: AreaPerformance[];
    loading?: boolean;
    className?: string;
}

const statusConfig: Record<AreaPerformance['status'], { label: string; color: string; icon: React.ReactNode }> = {
    growing: {
        label: 'Growing',
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: <TrendingUp className="h-3 w-3" />,
    },
    stable: {
        label: 'Stable',
        color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
        icon: <Minus className="h-3 w-3" />,
    },
    declining: {
        label: 'Declining',
        color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        icon: <TrendingDown className="h-3 w-3" />,
    },
};

function formatCurrency(value: number): string {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
}

export function AreaPerformanceTable({
    areas = [],
    loading = false,
    className,
}: AreaPerformanceTableProps) {
    if (loading) {
        return (
            <Card className={cn("bg-black/30 border-zinc-800/50", className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-mono uppercase text-zinc-400 tracking-wider">
                        Geographic Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-12 bg-zinc-900/50 animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (areas.length === 0) {
        return (
            <Card className={cn("bg-black/30 border-zinc-800/50", className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-mono uppercase text-zinc-400 tracking-wider">
                        Geographic Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <MapPin className="h-8 w-8 text-zinc-600 mb-3" />
                        <p className="text-sm text-zinc-400">No area data available</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("bg-black/30 border-zinc-800/50", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono uppercase text-zinc-400 tracking-wider">
                        Geographic Performance
                    </CardTitle>
                    <span className="text-xs font-mono text-zinc-500">
                        {areas.length} areas
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-mono uppercase text-zinc-500 tracking-wider border-b border-zinc-800/50">
                    <div className="col-span-3">Area</div>
                    <div className="col-span-2 text-right">Revenue</div>
                    <div className="col-span-2 text-right">Growth</div>
                    <div className="col-span-2 text-center">Clients</div>
                    <div className="col-span-3 text-center">Status</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-zinc-800/30">
                    {areas.map((area, index) => {
                        const status = statusConfig[area.status];
                        const isTopPerformer = index === 0;

                        return (
                            <div
                                key={area.name}
                                className={cn(
                                    "grid grid-cols-12 gap-2 px-3 py-3 items-center transition-colors",
                                    "hover:bg-zinc-900/30 cursor-pointer",
                                    isTopPerformer && "bg-emerald-500/5"
                                )}
                            >
                                {/* Area Name */}
                                <div className="col-span-3 flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                                    <span className="text-sm font-medium text-zinc-200 truncate">
                                        {area.name}
                                    </span>
                                    {isTopPerformer && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/50 text-emerald-400">
                                            #1
                                        </Badge>
                                    )}
                                </div>

                                {/* Revenue */}
                                <div className="col-span-2 text-right">
                                    <span className="text-sm font-mono font-medium text-white">
                                        {formatCurrency(area.revenue)}
                                    </span>
                                </div>

                                {/* Growth */}
                                <div className="col-span-2 text-right">
                                    <span className={cn(
                                        "text-sm font-mono font-medium",
                                        area.growthPercent > 0 ? "text-emerald-400" :
                                            area.growthPercent < 0 ? "text-rose-400" : "text-zinc-400"
                                    )}>
                                        {area.growthPercent > 0 ? '+' : ''}{area.growthPercent.toFixed(1)}%
                                    </span>
                                </div>

                                {/* Clients */}
                                <div className="col-span-2 flex items-center justify-center gap-1.5">
                                    <Users className="h-3 w-3 text-zinc-500" />
                                    <span className="text-sm font-mono text-zinc-300">
                                        {area.clientCount}
                                    </span>
                                </div>

                                {/* Status */}
                                <div className="col-span-3 flex justify-center">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] font-mono gap-1",
                                            status.color
                                        )}
                                    >
                                        {status.icon}
                                        {status.label}
                                    </Badge>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
