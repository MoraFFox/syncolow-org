'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AnalyticsAlert } from '@/app/actions/analytics/types';
import { AlertTriangle, TrendingUp, Award, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AlertsPanelProps {
    alerts?: AnalyticsAlert[];
    loading?: boolean;
    className?: string;
    maxAlerts?: number;
}

const alertIcons: Record<AnalyticsAlert['type'], React.ReactNode> = {
    anomaly: <AlertTriangle className="h-4 w-4" />,
    trend: <TrendingUp className="h-4 w-4" />,
    milestone: <Award className="h-4 w-4" />,
    risk: <Shield className="h-4 w-4" />,
};

const severityColors: Record<AnalyticsAlert['severity'], { bg: string; border: string; text: string; icon: string }> = {
    info: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: 'text-blue-500',
    },
    warning: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        icon: 'text-amber-500',
    },
    critical: {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        icon: 'text-rose-500',
    },
};

function AlertItem({ alert }: { alert: AnalyticsAlert }) {
    const colors = severityColors[alert.severity];

    return (
        <div
            className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                colors.bg,
                colors.border,
                "hover:border-opacity-60"
            )}
        >
            <div className={cn("mt-0.5", colors.icon)}>
                {alertIcons[alert.type]}
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", colors.text)}>
                    {alert.title}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                    {alert.message}
                </p>
            </div>
            {alert.relatedEntityId && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-500 hover:text-zinc-300 -mr-1"
                >
                    View
                </Button>
            )}
        </div>
    );
}

export function AlertsPanel({
    alerts = [],
    loading = false,
    className,
    maxAlerts = 5,
}: AlertsPanelProps) {
    const [showAll, setShowAll] = React.useState(false);
    const displayedAlerts = showAll ? alerts : alerts.slice(0, maxAlerts);
    const hasMore = alerts.length > maxAlerts;

    if (loading) {
        return (
            <Card className={cn("bg-black/30 border-zinc-800/50", className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-mono uppercase text-zinc-400 tracking-wider">
                        Alerts & Signals
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-zinc-900/50 animate-pulse rounded-lg" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (alerts.length === 0) {
        return (
            <Card className={cn("bg-black/30 border-zinc-800/50", className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-mono uppercase text-zinc-400 tracking-wider">
                        Alerts & Signals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                            <Award className="h-5 w-5 text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">All Clear</p>
                        <p className="text-xs text-zinc-500 mt-1">
                            No anomalies or notable trends detected
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Sort by severity: critical > warning > info
    const sortedAlerts = [...displayedAlerts].sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return (
        <Card className={cn("bg-black/30 border-zinc-800/50", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono uppercase text-zinc-400 tracking-wider">
                        Alerts & Signals
                    </CardTitle>
                    <span className="text-xs font-mono text-zinc-500">
                        {alerts.length} detected
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {sortedAlerts.map((alert) => (
                    <AlertItem key={alert.id} alert={alert} />
                ))}

                {hasMore && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAll(!showAll)}
                        className="w-full text-xs text-zinc-500 hover:text-zinc-300 mt-2"
                    >
                        {showAll ? 'Show Less' : `Show ${alerts.length - maxAlerts} More`}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
