"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid, differenceInDays } from "date-fns";
import type { MaintenanceVisit } from "@/lib/types";
import { Calendar, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export interface CaseTimelineProps {
    visit: MaintenanceVisit;
    className?: string;
    compact?: boolean;
}

interface TimelineNode {
    date: Date | null;
    label: string;
    status: "completed" | "current" | "pending" | "delayed" | "future";
    icon: React.ReactNode;
    detail?: string;
}

function parseDateSafe(dateValue: string | Date | undefined | null): Date | null {
    if (!dateValue) return null;
    const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    return isValid(date) ? date : null;
}

/**
 * Horizontal timeline component showing the lifecycle of a maintenance case.
 * 
 * Displays:
 * - Scheduled date
 * - Actual arrival (with delay indicator if late)
 * - Completion date
 * - Follow-up date (if scheduled)
 */
export function CaseTimeline({ visit, className, compact = false }: CaseTimelineProps) {
    const nodes = React.useMemo(() => {
        const result: TimelineNode[] = [];

        // Scheduled Date
        const scheduledDate = parseDateSafe(visit.scheduledDate || visit.date);
        result.push({
            date: scheduledDate,
            label: "Scheduled",
            status: "completed",
            icon: <Calendar className="h-3.5 w-3.5" />,
            detail: scheduledDate ? format(scheduledDate, "MMM d") : undefined,
        });

        // Actual Arrival (if exists)
        const actualArrival = parseDateSafe(visit.actualArrivalDate);
        if (actualArrival && scheduledDate) {
            const delayDays = differenceInDays(actualArrival, scheduledDate);
            result.push({
                date: actualArrival,
                label: delayDays > 0 ? `Arrived (+${delayDays}d)` : "Arrived",
                status: delayDays > 0 ? "delayed" : "completed",
                icon: delayDays > 0
                    ? <AlertTriangle className="h-3.5 w-3.5" />
                    : <Clock className="h-3.5 w-3.5" />,
                detail: format(actualArrival, "MMM d"),
            });
        } else if (visit.status === "In Progress" || visit.status === "Completed") {
            // Show current step for in-progress without actual arrival logged
            result.push({
                date: null,
                label: visit.status === "In Progress" ? "In Progress" : "Arrived",
                status: visit.status === "In Progress" ? "current" : "completed",
                icon: <Clock className="h-3.5 w-3.5" />,
            });
        }

        // Completion Date
        const resolutionDate = parseDateSafe(visit.resolutionDate);
        if (visit.status === "Completed" && resolutionDate) {
            result.push({
                date: resolutionDate,
                label: "Completed",
                status: "completed",
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                detail: format(resolutionDate, "MMM d"),
            });
        } else if (visit.status !== "Cancelled") {
            result.push({
                date: null,
                label: "Completion",
                status: visit.status === "Completed" ? "completed" : "pending",
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            });
        }

        return result;
    }, [visit]);

    if (compact) {
        return (
            <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
                {nodes.map((node, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                        <span
                            className={cn(
                                "px-1.5 py-0.5 rounded",
                                node.status === "completed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                node.status === "current" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                node.status === "delayed" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                node.status === "pending" && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            )}
                        >
                            {node.detail || node.label}
                        </span>
                    </React.Fragment>
                ))}
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {nodes.map((node, index) => (
                <React.Fragment key={index}>
                    {/* Node */}
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                                node.status === "completed" && "bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                node.status === "current" && "bg-amber-100 border-amber-500 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse",
                                node.status === "delayed" && "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                node.status === "pending" && "bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600",
                                node.status === "future" && "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            )}
                        >
                            {node.icon}
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-medium text-muted-foreground leading-tight">
                                {node.label}
                            </p>
                            {node.detail && (
                                <p className="text-[10px] text-muted-foreground/70">{node.detail}</p>
                            )}
                        </div>
                    </div>

                    {/* Connector Line */}
                    {index < nodes.length - 1 && (
                        <div
                            className={cn(
                                "flex-1 h-0.5 min-w-[20px] max-w-[60px]",
                                nodes[index + 1].status === "pending" || nodes[index + 1].status === "future"
                                    ? "bg-gray-200 dark:bg-gray-700"
                                    : "bg-emerald-300 dark:bg-emerald-700"
                            )}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
