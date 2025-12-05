"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScoreGauge } from "./score-gauge";
import { Badge } from "@/components/ui/badge";

interface PaymentScoreIndicatorProps {
  score: number; // 0-100
  daysToPay?: number;
  onTimePercentage?: number;
  status?: "excellent" | "good" | "fair" | "poor";
  size?: "sm" | "md";
  className?: string;
}

export function PaymentScoreIndicator({
  score,
  daysToPay,
  onTimePercentage,
  status: propStatus,
  size = "md",
  className,
}: PaymentScoreIndicatorProps) {
  
  const getStatus = (s: number) => {
    if (s >= 80) return "excellent";
    if (s >= 60) return "good";
    if (s >= 40) return "fair";
    return "poor";
  };

  const status = propStatus || getStatus(score);
  
  const getStatusColor = (s: string) => {
    switch (s) {
      case "excellent": return "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25";
      case "good": return "bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25";
      case "fair": return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/25";
      case "poor": return "bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25";
      default: return "bg-gray-500/15 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ScoreGauge score={score} size={size} showValue={true} />
      
      <div className="flex flex-col gap-1 min-w-[100px]">
        <Badge variant="secondary" className={cn("w-fit capitalize px-2 py-0.5 text-[10px]", getStatusColor(status))}>
          {status}
        </Badge>
        
        {daysToPay !== undefined && (
          <div className="flex flex-col text-xs">
            <span className="text-muted-foreground text-[10px]">Avg Days to Pay</span>
            <span className="font-medium">{daysToPay} days</span>
          </div>
        )}
        
        {onTimePercentage !== undefined && (
          <div className="flex flex-col text-xs mt-0.5">
            <span className="text-muted-foreground text-[10px]">On-Time Rate</span>
            <span className={cn(
              "font-medium",
              onTimePercentage >= 90 ? "text-green-600" : 
              onTimePercentage >= 75 ? "text-blue-600" : 
              "text-amber-600"
            )}>
              {onTimePercentage}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
