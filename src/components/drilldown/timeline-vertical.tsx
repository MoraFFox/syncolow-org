"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";

export interface TimelineItem {
  title: string;
  time?: string;
  status: "completed" | "current" | "pending" | "failed";
  description?: string;
}

interface TimelineVerticalProps {
  items: TimelineItem[];
  className?: string;
}

export function TimelineVertical({ items, className }: TimelineVerticalProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = item.status === "completed" ? CheckCircle2 : item.status === "current" ? Clock : item.status === "failed" ? XCircle : Circle;
        const colorClass = item.status === "completed" ? "text-green-500" : item.status === "current" ? "text-blue-500" : item.status === "failed" ? "text-destructive" : "text-muted-foreground/50";

        return (
          <div key={index} className="flex gap-3 relative pb-4 last:pb-0">
            {/* Connector Line */}
            {!isLast && (
              <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
            )}
            
            {/* Icon */}
            <div className={cn("shrink-0 z-10 bg-background", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 -mt-0.5">
              <div className="flex justify-between items-start">
                <span className={cn("text-xs font-medium", item.status === 'current' && "text-foreground", item.status === 'pending' && "text-muted-foreground")}>
                  {item.title}
                </span>
                {item.time && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                    {item.time}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
