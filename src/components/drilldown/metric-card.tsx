"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";

export type MetricTrend = "up" | "down" | "neutral";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number; // Percentage
  trendDirection?: MetricTrend;
  icon?: React.ReactNode;
  subtext?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  valueClassName?: string;
}

export function MetricCard({
  label,
  value,
  trend,
  trendDirection,
  icon,
  subtext,
  size = "md",
  className,
  valueClassName,
}: MetricCardProps) {
  // Determine trend direction if not provided but trend value is
  const direction = trendDirection || (trend ? (trend > 0 ? "up" : trend < 0 ? "down" : "neutral") : undefined);
  
  const trendColor = 
    direction === "up" ? "text-green-600 dark:text-green-500" : 
    direction === "down" ? "text-red-600 dark:text-red-500" : 
    "text-muted-foreground";

  const TrendIcon = 
    direction === "up" ? ArrowUpIcon : 
    direction === "down" ? ArrowDownIcon : 
    MinusIcon;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate pr-2">
          {label}
        </span>
        {icon && <span className="text-muted-foreground opacity-70 scale-75">{icon}</span>}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className={cn(
          "font-bold tracking-tight",
          size === "sm" ? "text-sm" : size === "md" ? "text-lg" : "text-xl",
          valueClassName
        )}>
          {value}
        </span>
        
        {trend !== undefined && (
          <div className={cn("flex items-center text-[10px] font-medium", trendColor)}>
            <TrendIcon className="h-3 w-3 mr-0.5" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      {subtext && (
        <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {subtext}
        </span>
      )}
    </div>
  );
}
