"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MaintenanceStatusBadge } from "@/components/maintenance";
import {
    Clock,
    Wrench,
    User,
    AlertTriangle,
    CheckCircle2,
    Link2,
    ChevronRight,
    Package
} from "lucide-react";
import type { MaintenanceVisit } from "@/lib/types";
import { PRIORITY_COLORS, PRIORITY_LABELS, type MaintenancePriority } from "@/lib/maintenance-config";

// =============================================================================
// Types
// =============================================================================

interface CaseChainTimelineProps {
    /** All visits in the case chain (root + follow-ups) */
    visits: MaintenanceVisit[];
    /** Currently selected visit ID for highlighting */
    selectedVisitId?: string;
    /** Callback when a visit in the timeline is clicked */
    onSelectVisit?: (visit: MaintenanceVisit) => void;
    /** Whether to show a compact view */
    compact?: boolean;
}

interface TimelineVisitCardProps {
    visit: MaintenanceVisit;
    index: number;
    isRoot: boolean;
    isSelected: boolean;
    isLast: boolean;
    onSelect?: () => void;
    compact?: boolean;
}

// =============================================================================
// Utility Functions
// =============================================================================

function parseDateSafe(dateValue: string | Date | undefined | null): Date | null {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    try {
        const parsed = parseISO(dateValue);
        return isValid(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function formatDateShort(date: Date | null): string {
    if (!date) return "N/A";
    return format(date, "MMM d, yyyy");
}

function getStatusColorClass(status: MaintenanceVisit["status"]): string {
    switch (status) {
        case "Completed":
            return "bg-emerald-500";
        case "In Progress":
            return "bg-blue-500";
        case "Scheduled":
            return "bg-slate-400";
        case "Follow-up Required":
            return "bg-amber-500";
        case "Waiting for Parts":
            return "bg-purple-500";
        case "Cancelled":
            return "bg-red-500";
        default:
            return "bg-slate-400";
    }
}

// =============================================================================
// Timeline Visit Card Component
// =============================================================================

function TimelineVisitCard({
    visit,
    index,
    isRoot,
    isSelected,
    isLast,
    onSelect,
    compact = false,
}: TimelineVisitCardProps) {
    const visitDate = parseDateSafe(visit.date);
    const resolutionDate = parseDateSafe(visit.resolutionDate);

    const totalPartsCount = visit.spareParts?.reduce((sum, p) => sum + p.quantity, 0) || 0;
    const totalServicesCount = visit.services?.length || 0;

    const priority = (visit.priority || "normal") as MaintenancePriority;
    const priorityStyle = PRIORITY_COLORS[priority];

    return (
        <div className="relative flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
                {/* Dot */}
                <div
                    className={cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background shadow-sm transition-all",
                        getStatusColorClass(visit.status),
                        isSelected && "ring-2 ring-primary ring-offset-2"
                    )}
                >
                    {visit.status === "Completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                        <span className="text-xs font-bold text-white">
                            {isRoot ? "R" : index}
                        </span>
                    )}
                </div>
                {/* Line */}
                {!isLast && (
                    <div className="w-0.5 flex-1 bg-border" />
                )}
            </div>

            {/* Card */}
            <Card
                onClick={onSelect}
                className={cn(
                    "mb-4 flex-1 transition-all cursor-pointer hover:shadow-md",
                    isSelected && "ring-2 ring-primary",
                    compact ? "p-3" : "p-4"
                )}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", compact && "text-xs")}>
                            {isRoot ? "Initial Visit" : `Follow-up #${index}`}
                        </span>
                        {isRoot && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Root
                            </Badge>
                        )}
                        {priority !== "normal" && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    priorityStyle.bg,
                                    priorityStyle.text,
                                    priorityStyle.border
                                )}
                            >
                                {PRIORITY_LABELS[priority]}
                            </Badge>
                        )}
                    </div>
                    <MaintenanceStatusBadge status={visit.status} size="sm" />
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateShort(visitDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="max-w-[100px] truncate" title={visit.technicianName}>
                            {visit.technicianName || "Unassigned"}
                        </span>
                    </div>
                    {visit.delayDays && visit.delayDays > 0 && (
                        <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>+{visit.delayDays}d delay</span>
                        </div>
                    )}
                </div>

                {/* Problem reasons */}
                {!compact && visit.problemReason && visit.problemReason.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {visit.problemReason.slice(0, 3).map((reason, i) => (
                            <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200"
                            >
                                {reason}
                            </Badge>
                        ))}
                        {visit.problemReason.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{visit.problemReason.length - 3} more
                            </Badge>
                        )}
                    </div>
                )}

                {/* Work summary */}
                {!compact && (totalPartsCount > 0 || totalServicesCount > 0) && (
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                        {totalPartsCount > 0 && (
                            <div className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                <span>{totalPartsCount} parts</span>
                            </div>
                        )}
                        {totalServicesCount > 0 && (
                            <div className="flex items-center gap-1">
                                <Wrench className="h-3 w-3" />
                                <span>{totalServicesCount} services</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Resolution info */}
                {visit.status === "Completed" && resolutionDate && (
                    <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Resolved on {formatDateShort(resolutionDate)}</span>
                    </div>
                )}

                {/* Non-resolution reason */}
                {visit.resolutionStatus && visit.resolutionStatus !== "solved" && visit.nonResolutionReason && (
                    <div className="mt-2 text-xs text-amber-600 italic">
                        "{visit.nonResolutionReason}"
                    </div>
                )}
            </Card>
        </div>
    );
}

// =============================================================================
// Case Chain Timeline Component
// =============================================================================

export function CaseChainTimeline({
    visits,
    selectedVisitId,
    onSelectVisit,
    compact = false,
}: CaseChainTimelineProps) {
    // Sort visits by date (root first, then follow-ups chronologically)
    const sortedVisits = React.useMemo(() => {
        return [...visits].sort((a, b) => {
            // Root visit always first
            if (!a.rootVisitId && b.rootVisitId) return -1;
            if (a.rootVisitId && !b.rootVisitId) return 1;
            // Then by date
            const dateA = parseDateSafe(a.date);
            const dateB = parseDateSafe(b.date);
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime();
        });
    }, [visits]);

    if (sortedVisits.length === 0) {
        return (
            <div className="text-center text-sm text-muted-foreground py-8">
                No visits in this case.
            </div>
        );
    }

    // Calculate case summary
    const totalCost = sortedVisits.reduce((sum, v) => {
        const labor = v.laborCost || 0;
        const parts = v.spareParts?.reduce((p, part) => p + (part.price || 0) * part.quantity, 0) || 0;
        return sum + labor + parts;
    }, 0);

    const isResolved = sortedVisits.some((v) => v.status === "Completed");

    return (
        <div className="space-y-4">
            {/* Case Summary Header */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            Case Chain
                        </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {sortedVisits.length} visit{sortedVisits.length !== 1 ? "s" : ""}
                    </Badge>
                    {isResolved && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                            Resolved
                        </Badge>
                    )}
                </div>
                {totalCost > 0 && (
                    <div className="text-sm font-medium">
                        Total: <span className="text-primary">{totalCost.toLocaleString()} EGP</span>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="pl-1">
                {sortedVisits.map((visit, index) => {
                    const isRoot = !visit.rootVisitId;
                    const displayIndex = isRoot ? 0 : index;

                    return (
                        <TimelineVisitCard
                            key={visit.id}
                            visit={visit}
                            index={displayIndex}
                            isRoot={isRoot}
                            isSelected={visit.id === selectedVisitId}
                            isLast={index === sortedVisits.length - 1}
                            onSelect={() => onSelectVisit?.(visit)}
                            compact={compact}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// =============================================================================
// Follow-up Indicator Badge (for Kanban cards)
// =============================================================================

interface FollowUpIndicatorProps {
    visit: MaintenanceVisit;
    /** Parent visit's branch name for display */
    parentBranchName?: string;
    className?: string;
}

export function FollowUpIndicator({ visit, parentBranchName, className }: FollowUpIndicatorProps) {
    if (!visit.rootVisitId) return null;

    const chainDepth = visit.chainDepth || 1;

    return (
        <div
            className={cn(
                "flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full",
                "bg-blue-50 text-blue-700 border border-blue-200",
                className
            )}
            title={parentBranchName ? `Follow-up to: ${parentBranchName}` : "Follow-up visit"}
        >
            <Link2 className="h-3 w-3" />
            <span>Follow-up #{chainDepth}</span>
            {parentBranchName && (
                <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="max-w-[60px] truncate">{parentBranchName}</span>
                </>
            )}
        </div>
    );
}
