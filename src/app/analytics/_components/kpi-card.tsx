
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
        if (trendDirection === 'neutral') return 'text-muted-foreground';
        if (trendDirection === 'up') return isPositiveTrend ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500';
        if (trendDirection === 'down') return isPositiveTrend ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500';
        return 'text-muted-foreground';
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
            className={cn(className, (onClick || drillKind) && "cursor-pointer hover:bg-accent/50 transition-colors")}
            onClick={onClick} // Keep original onClick if provided, DrillTarget handles its own click
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-1">
                    <CardTitle className="text-sm font-medium min-w-0 truncate">
                        {title}
                    </CardTitle>
                    {tooltip && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="text-sm">{tooltip}</p>
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
                        <div className="text-2xl font-bold min-w-0 truncate">{value}</div>
                        {trend && (
                            <div className={cn("text-xs min-w-0 truncate flex items-center gap-1 mt-1", getTrendColor())}>
                                {trendDirection && getTrendIcon()}
                                <span>{trend}</span>
                            </div>
                        )}
                    </div>
                    {sparklineData && sparklineData.length > 0 && (
                        <div className="h-12 w-20">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData.map((value, index) => ({ value, index }))}>
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={trendDirection === 'up' && isPositiveTrend ? 'hsl(var(--chart-1))' : trendDirection === 'down' && !isPositiveTrend ? 'hsl(var(--chart-1))' : 'hsl(var(--muted-foreground))'}
                                        fill={trendDirection === 'up' && isPositiveTrend ? 'hsl(var(--chart-1))' : trendDirection === 'down' && !isPositiveTrend ? 'hsl(var(--chart-1))' : 'hsl(var(--muted-foreground))'}
                                        fillOpacity={0.2}
                                        strokeWidth={1.5}
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
