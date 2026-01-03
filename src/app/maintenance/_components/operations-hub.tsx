"use client";

import * as React from "react";
import Link from "next/link";
import { useMemo } from "react";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { differenceInDays, format, isToday, parseISO, isValid, startOfDay, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Icons
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Users,
    TrendingUp,
    ArrowRight,
    Package,
    Bell,
    Wrench,
    type LucideIcon,
} from "lucide-react";

// Custom Components
import { KpiTile, KpiTileGrid } from "@/components/maintenance";
import { MaintenanceStatusBadge } from "@/components/maintenance";
import type { MaintenanceVisit } from "@/lib/types";

interface OperationsHubProps {
    onScheduleVisit: () => void;
    onAddCrew: () => void;
    onSelectVisit: (visit: MaintenanceVisit) => void;
}

function parseDateSafe(dateValue: string | Date | undefined | null): Date | null {
    if (!dateValue) return null;
    const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    return isValid(date) ? date : null;
}

/**
 * Operations Hub - Central command center for daily maintenance operations.
 * 
 * Features:
 * - KPI Dashboard strip (5 key metrics)
 * - Today's Schedule panel
 * - Critical Issues panel (overdue, waiting, follow-ups)
 * - Quick Actions
 */
export function OperationsHub({ onScheduleVisit, onAddCrew, onSelectVisit }: OperationsHubProps) {
    const { maintenanceVisits, maintenanceEmployees } = useMaintenanceStore();

    // Calculate KPIs
    const kpis = useMemo(() => {
        const now = new Date();
        const today = startOfDay(now);

        // Open cases (not completed or cancelled)
        const openCases = maintenanceVisits.filter(v =>
            v.status !== "Completed" && v.status !== "Cancelled"
        );

        // Today's visits
        const todayVisits = maintenanceVisits.filter(v => {
            const date = parseDateSafe(v.scheduledDate || v.date);
            return date && isSameDay(date, today);
        });

        // Completed this month
        const thisMonth = maintenanceVisits.filter(v => {
            if (v.status !== "Completed") return false;
            const date = parseDateSafe(v.resolutionDate || v.date);
            if (!date) return false;
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });

        // Technicians in field (have in-progress visits today)
        const techsInField = new Set(
            todayVisits
                .filter(v => v.status === "In Progress")
                .map(v => v.technicianName)
                .filter(Boolean)
        ).size;

        // On-time rate (last 30 completed)
        const recentCompleted = maintenanceVisits
            .filter(v => v.status === "Completed")
            .slice(0, 30);
        const onTimeCount = recentCompleted.filter(v => !v.delayDays || v.delayDays === 0).length;
        const onTimeRate = recentCompleted.length > 0
            ? Math.round((onTimeCount / recentCompleted.length) * 100)
            : 100;

        // Waiting for parts
        const waitingParts = maintenanceVisits.filter(v => v.status === "Waiting for Parts").length;

        return {
            openCases: openCases.length,
            todayScheduled: todayVisits.length,
            techsInField,
            completedThisMonth: thisMonth.length,
            onTimeRate,
            waitingParts,
            totalTechnicians: maintenanceEmployees.length,
        };
    }, [maintenanceVisits, maintenanceEmployees]);

    // Critical issues
    const criticalIssues = useMemo(() => {
        const now = new Date();
        const today = startOfDay(now);

        // Overdue visits
        const overdue = maintenanceVisits.filter(v => {
            if (v.status === "Completed" || v.status === "Cancelled") return false;
            const date = parseDateSafe(v.scheduledDate || v.date);
            if (!date) return false;
            return date < today && differenceInDays(today, date) > 0;
        });

        // Waiting for parts > 3 days
        const waitingLong = maintenanceVisits.filter(v => {
            if (v.status !== "Waiting for Parts") return false;
            const date = parseDateSafe(v.scheduledDate || v.date);
            if (!date) return false;
            return differenceInDays(today, date) > 3;
        });

        // Follow-ups required
        const followUps = maintenanceVisits.filter(v => v.status === "Follow-up Required");

        return { overdue, waitingLong, followUps };
    }, [maintenanceVisits]);

    // Today's schedule
    const todaySchedule = useMemo(() => {
        const today = startOfDay(new Date());
        return maintenanceVisits
            .filter(v => {
                const date = parseDateSafe(v.scheduledDate || v.date);
                return date && isSameDay(date, today);
            })
            .sort((a, b) => {
                // Sort by status: In Progress first, then Scheduled, then Completed
                const order = { "In Progress": 0, "Scheduled": 1, "Completed": 2, "Cancelled": 3 };
                return (order[a.status as keyof typeof order] ?? 4) - (order[b.status as keyof typeof order] ?? 4);
            });
    }, [maintenanceVisits]);

    const totalCritical = criticalIssues.overdue.length + criticalIssues.waitingLong.length + criticalIssues.followUps.length;

    return (
        <div className="space-y-6">
            {/* KPI Dashboard */}
            <KpiTileGrid>
                <KpiTile
                    title="Open Cases"
                    value={kpis.openCases}
                    subtitle="Active maintenance"
                    icon={Wrench}
                    variant={kpis.openCases > 10 ? "warning" : "default"}
                />
                <KpiTile
                    title="Today's Schedule"
                    value={kpis.todayScheduled}
                    subtitle={`${kpis.techsInField} in field`}
                    icon={Calendar}
                    variant={kpis.todayScheduled === 0 ? "default" : "success"}
                />
                <KpiTile
                    title="Technicians"
                    value={`${kpis.techsInField}/${kpis.totalTechnicians}`}
                    subtitle="Currently active"
                    icon={Users}
                />
                <KpiTile
                    title="On-Time Rate"
                    value={`${kpis.onTimeRate}%`}
                    subtitle="Last 30 visits"
                    icon={TrendingUp}
                    variant={kpis.onTimeRate >= 90 ? "success" : kpis.onTimeRate >= 70 ? "warning" : "critical"}
                    trend={{
                        direction: kpis.onTimeRate >= 90 ? "up" : kpis.onTimeRate >= 70 ? "neutral" : "down",
                        value: kpis.onTimeRate >= 90 ? "Good" : "Needs work",
                        positive: kpis.onTimeRate >= 80,
                    }}
                />
                <KpiTile
                    title="Completed"
                    value={kpis.completedThisMonth}
                    subtitle="This month"
                    icon={CheckCircle2}
                    variant="success"
                />
            </KpiTileGrid>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Today's Schedule */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Today's Schedule
                                </CardTitle>
                                <CardDescription>
                                    {format(new Date(), "EEEE, MMMM d")}
                                </CardDescription>
                            </div>
                            <Link href="/maintenance/cases?view=calendar">
                                <Button variant="ghost" size="sm" className="text-xs">
                                    Full Calendar <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {todaySchedule.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No visits scheduled for today</p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-2"
                                    onClick={onScheduleVisit}
                                >
                                    Schedule a visit
                                </Button>
                            </div>
                        ) : (
                            <ScrollArea className="h-[280px]">
                                <div className="space-y-2">
                                    {todaySchedule.map(visit => (
                                        <ScheduleItem
                                            key={visit.id}
                                            visit={visit}
                                            onClick={() => onSelectVisit(visit)}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                {/* Critical Issues */}
                <Card className={cn(
                    totalCritical > 0 && "border-red-500/30 bg-red-500/5"
                )}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className={cn(
                                    "h-4 w-4",
                                    totalCritical > 0 ? "text-red-500" : "text-muted-foreground"
                                )} />
                                Critical Issues
                                {totalCritical > 0 && (
                                    <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                                        {totalCritical}
                                    </Badge>
                                )}
                            </CardTitle>
                            <Link href="/maintenance/cases?filter=critical">
                                <Button variant="ghost" size="sm" className="text-xs">
                                    View All <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {totalCritical === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-70" />
                                <p className="text-sm">No critical issues</p>
                                <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[280px]">
                                <div className="space-y-4">
                                    {/* Overdue */}
                                    {criticalIssues.overdue.length > 0 && (
                                        <IssueGroup
                                            title="Overdue Visits"
                                            icon={Clock}
                                            items={criticalIssues.overdue}
                                            variant="danger"
                                            onClick={onSelectVisit}
                                        />
                                    )}

                                    {/* Waiting for Parts */}
                                    {criticalIssues.waitingLong.length > 0 && (
                                        <IssueGroup
                                            title="Waiting for Parts (>3d)"
                                            icon={Package}
                                            items={criticalIssues.waitingLong}
                                            variant="warning"
                                            onClick={onSelectVisit}
                                        />
                                    )}

                                    {/* Follow-ups */}
                                    {criticalIssues.followUps.length > 0 && (
                                        <IssueGroup
                                            title="Follow-up Required"
                                            icon={Bell}
                                            items={criticalIssues.followUps}
                                            variant="info"
                                            onClick={onSelectVisit}
                                        />
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={onScheduleVisit}>
                            <Calendar className="mr-2 h-4 w-4" />
                            Schedule Visit
                        </Button>
                        <Button variant="outline" onClick={onAddCrew}>
                            <Users className="mr-2 h-4 w-4" />
                            Add Technician
                        </Button>
                        <Link href="/maintenance?tab=list">
                            <Button variant="outline">
                                <Wrench className="mr-2 h-4 w-4" />
                                View All Cases
                            </Button>
                        </Link>
                        <Link href="/maintenance/technicians">
                            <Button variant="ghost">
                                Technician Roster <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Schedule Item Component
function ScheduleItem({ visit, onClick }: { visit: MaintenanceVisit; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{visit.branchName || visit.companyName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                        {visit.technicianName || "Unassigned"}
                    </p>
                </div>
                <MaintenanceStatusBadge status={visit.status} size="sm" />
            </div>
        </button>
    );
}

// Issue Group Component
function IssueGroup({
    title,
    icon: Icon,
    items,
    variant,
    onClick,
}: {
    title: string;
    icon: LucideIcon;
    items: MaintenanceVisit[];
    variant: "danger" | "warning" | "info";
    onClick: (visit: MaintenanceVisit) => void;
}) {
    const colors = {
        danger: "text-red-600 dark:text-red-400",
        warning: "text-amber-600 dark:text-amber-400",
        info: "text-blue-600 dark:text-blue-400",
    };

    return (
        <div>
            <div className={cn("flex items-center gap-2 text-xs font-medium mb-2", colors[variant])}>
                <Icon className="h-3.5 w-3.5" />
                {title} ({items.length})
            </div>
            <div className="space-y-1.5">
                {items.slice(0, 3).map(visit => (
                    <button
                        key={visit.id}
                        onClick={() => onClick(visit)}
                        className="w-full text-left p-2 rounded-md bg-background/50 hover:bg-background transition-colors text-xs"
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{visit.branchName || visit.companyName}</span>
                            {visit.delayDays && visit.delayDays > 0 && (
                                <span className="text-red-500 text-[10px] shrink-0 ml-2">
                                    +{visit.delayDays}d
                                </span>
                            )}
                        </div>
                    </button>
                ))}
                {items.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                        +{items.length - 3} more
                    </p>
                )}
            </div>
        </div>
    );
}
