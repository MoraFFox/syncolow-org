"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

export interface KpiTileProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: LucideIcon;
    trend?: {
        direction: "up" | "down" | "neutral";
        value: string;
        positive?: boolean; // Whether the trend direction is good (e.g., up is good for sales, down is good for delays)
    };
    variant?: "default" | "success" | "warning" | "critical";
    onClick?: () => void;
    className?: string;
}

const VARIANT_STYLES = {
    default: {
        card: "border-border/50",
        icon: "text-muted-foreground",
        value: "text-foreground",
    },
    success: {
        card: "border-emerald-500/30 bg-emerald-500/5",
        icon: "text-emerald-500",
        value: "text-emerald-600 dark:text-emerald-400",
    },
    warning: {
        card: "border-amber-500/30 bg-amber-500/5",
        icon: "text-amber-500",
        value: "text-amber-600 dark:text-amber-400",
    },
    critical: {
        card: "border-red-500/30 bg-red-500/5",
        icon: "text-red-500",
        value: "text-red-600 dark:text-red-400",
    },
};

/**
 * KPI Tile component for the Operations Hub.
 * Displays a single metric with optional trend indicator.
 * 
 * Features:
 * - Semantic color variants (success, warning, critical)
 * - Trend indicators with directional arrows
 * - Clickable for drill-down
 * - Compact, information-dense design
 */
export function KpiTile({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = "default",
    onClick,
    className,
}: KpiTileProps) {
    const styles = VARIANT_STYLES[variant];

    return (
        <Card
            className={cn(
                "transition-all duration-200",
                styles.card,
                onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                className
            )}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {/* Title with Icon */}
                        <div className="flex items-center gap-2 mb-1">
                            {Icon && (
                                <Icon className={cn("h-4 w-4 shrink-0", styles.icon)} />
                            )}
                            <p className="text-xs font-medium text-muted-foreground truncate">
                                {title}
                            </p>
                        </div>

                        {/* Value */}
                        <p className={cn("text-2xl font-bold tracking-tight", styles.value)}>
                            {value}
                        </p>

                        {/* Subtitle */}
                        {subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Trend Indicator */}
                    {trend && (
                        <TrendIndicator
                            direction={trend.direction}
                            value={trend.value}
                            positive={trend.positive}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

interface TrendIndicatorProps {
    direction: "up" | "down" | "neutral";
    value: string;
    positive?: boolean;
}

function TrendIndicator({ direction, value, positive }: TrendIndicatorProps) {
    // Determine if the trend is good based on direction and whether up/down is positive
    const isPositive = positive !== undefined
        ? positive
        : direction === "up"; // Default: up is positive

    const Icon = direction === "up"
        ? TrendingUp
        : direction === "down"
            ? TrendingDown
            : Minus;

    return (
        <div
            className={cn(
                "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
                isPositive
                    ? "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30"
                    : direction === "neutral"
                        ? "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                        : "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
            )}
        >
            <Icon className="h-3 w-3" />
            <span>{value}</span>
        </div>
    );
}

/**
 * Container for KPI tiles in a responsive grid
 */
export function KpiTileGrid({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
                className
            )}
        >
            {children}
        </div>
    );
}
