
"use client"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus, Info } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useDrillDown } from '@/hooks/use-drilldown';
import { DrillTarget } from '@/components/drilldown/drill-target';

interface KpiCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    trendValue?: number;
    trendDirection?: 'up' | 'down' | 'neutral';
    isPositiveTrend?: boolean;
    className?: string;
    onClick?: () => void;
    loading?: boolean;
    tooltip?: string;
    sparklineData?: number[];
    drillKind?: 'revenue' | 'product' | 'company' | 'order';
    drillPayload?: any;
    expandHitArea?: boolean;
}

export function KpiCard({
    title,
    value,
    icon,
    trend,
    trendValue,
    trendDirection,
    isPositiveTrend,
    className,
    onClick,
    loading = false,
    tooltip,
    sparklineData,
    drillKind,
    drillPayload,
    expandHitArea
}: KpiCardProps) {
    const getTrendColor = () => {
        if (trendDirection === 'neutral') return 'text-zinc-500';
        if (trendDirection === 'up') return isPositiveTrend ? 'text-emerald-500' : 'text-rose-500';
        if (trendDirection === 'down') return isPositiveTrend ? 'text-rose-500' : 'text-emerald-500';
        return 'text-zinc-500';
    };

    const getTrendIcon = () => {
        if (trendDirection === 'up') return <ArrowUp className="h-3 w-3" />;
        if (trendDirection === 'down') return <ArrowDown className="h-3 w-3" />;
        return <Minus className="h-3 w-3" />;
    };

    const { openDetailDialog } = useDrillDown();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (drillKind) {
            // This is largely fail-safe, DrillTarget handles interaction if present
            openDetailDialog(drillKind, drillPayload);
        }
    };

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-6 rounded" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-3 w-28" />
                </CardContent>
            </Card>
        );
    }

    const cardContent = (
        <Card
            className={cn(className, (onClick || drillKind) && "cursor-pointer hover:bg-zinc-900/50 transition-colors")}
            onClick={onClick} // Keep original onClick if provided, DrillTarget handles its own click
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1">
                    <CardTitle className="text-xs font-medium font-mono uppercase tracking-widest text-zinc-400 min-w-0 truncate">
                        {title}
                    </CardTitle>
                    {tooltip && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-zinc-500 hover:text-zinc-300 cursor-help transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                                    <p className="text-xs font-mono">{tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between gap-2">
                    <div className="flex-1">
                        <div className="text-2xl font-bold font-mono text-zinc-100 min-w-0 truncate">{value}</div>
                        {trend && (
                            <div className={cn("text-xs font-mono min-w-0 truncate flex items-center gap-1 mt-1", getTrendColor())}>
                                {trendDirection && getTrendIcon()}
                                <span>{trend}</span>
                            </div>
                        )}
                    </div>
                    {sparklineData && sparklineData.length > 0 && (
                        <div className="h-12 w-20">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData.map((value, index) => ({ value, index }))}>
                                    <defs>
                                        <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={isPositiveTrend ? '#10b981' : '#f43f5e'} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={isPositiveTrend ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={isPositiveTrend ? '#10b981' : '#f43f5e'}
                                        fill={`url(#gradient-${title})`}
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                </div>
            </CardContent>
        </Card>
    );

    if (drillKind) {
        return (
            <DrillTarget
                kind={drillKind}
                payload={drillPayload || {}}
                asChild
                expandHitArea={expandHitArea}
            >
                {cardContent}
            </DrillTarget>
        );
    }

    return cardContent;
}
