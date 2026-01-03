"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    Package,
    Calendar,
} from "lucide-react";
import type { MaintenanceVisit } from "@/lib/types";

/**
 * Status configuration with colors, icons, and semantic meaning
 */
const STATUS_CONFIG = {
    Scheduled: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        icon: Calendar,
        label: "Scheduled",
    },
    "In Progress": {
        color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        icon: Loader2,
        label: "In Progress",
        animate: true,
    },
    Completed: {
        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        icon: CheckCircle2,
        label: "Completed",
    },
    Cancelled: {
        color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700",
        icon: XCircle,
        label: "Cancelled",
        strikethrough: true,
    },
    "Follow-up Required": {
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        icon: AlertTriangle,
        label: "Follow-up",
    },
    "Waiting for Parts": {
        color: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300 border-violet-200 dark:border-violet-800",
        icon: Package,
        label: "Waiting Parts",
    },
} as const;

export type MaintenanceStatus = MaintenanceVisit["status"];

const statusBadgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-md border font-medium transition-all duration-200",
    {
        variants: {
            size: {
                sm: "px-1.5 py-0.5 text-[10px]",
                md: "px-2 py-1 text-xs",
                lg: "px-3 py-1.5 text-sm",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
);

export interface MaintenanceStatusBadgeProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof statusBadgeVariants> {
    status: MaintenanceStatus;
    showIcon?: boolean;
    showLabel?: boolean;
}

/**
 * Unified status badge for maintenance visits with consistent visual hierarchy.
 * 
 * Features:
 * - Semantic colors for each status
 * - Animated pulse for "In Progress"
 * - Strikethrough styling for "Cancelled"
 * - Size variants (sm, md, lg)
 * - Optional icon display
 */
export function MaintenanceStatusBadge({
    status,
    size,
    showIcon = true,
    showLabel = true,
    className,
    ...props
}: MaintenanceStatusBadgeProps) {
    const config = STATUS_CONFIG[status];

    if (!config) {
        return (
            <div
                className={cn(
                    statusBadgeVariants({ size }),
                    "bg-gray-100 text-gray-600 border-gray-200",
                    className
                )}
                {...props}
            >
                {status}
            </div>
        );
    }

    const Icon = config.icon;

    // Type assertion to handle optional properties
    const strikethrough = 'strikethrough' in config ? config.strikethrough : false;
    const animate = 'animate' in config ? config.animate : false;

    return (
        <div
            className={cn(
                statusBadgeVariants({ size }),
                config.color,
                strikethrough && "line-through opacity-70",
                animate && "relative",
                className
            )}
            {...props}
        >
            {/* Animated pulse ring for In Progress */}
            {animate && (
                <span className="absolute inset-0 rounded-md animate-pulse bg-amber-400/20" />
            )}

            {showIcon && (
                <Icon
                    className={cn(
                        "relative z-10 shrink-0",
                        size === "sm" && "h-3 w-3",
                        size === "md" && "h-3.5 w-3.5",
                        size === "lg" && "h-4 w-4",
                        animate && "animate-spin"
                    )}
                />
            )}

            {showLabel && (
                <span className="relative z-10">{config.label}</span>
            )}
        </div>
    );
}

/**
 * Get status color for use in other components (calendar, charts, etc.)
 */
export function getStatusColor(status: MaintenanceStatus): string {
    const config = STATUS_CONFIG[status];
    if (!config) return "bg-gray-400";

    // Return just the background color for simple usage
    const colorMatch = config.color.match(/bg-(\w+)-(\d+)/);
    if (colorMatch) {
        return `bg-${colorMatch[1]}-500`;
    }
    return "bg-gray-400";
}

/**
 * Get all available statuses for filters/selectors
 */
export function getAllStatuses(): MaintenanceStatus[] {
    return Object.keys(STATUS_CONFIG) as MaintenanceStatus[];
}
