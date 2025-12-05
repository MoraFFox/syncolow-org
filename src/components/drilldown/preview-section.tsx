"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

interface PreviewSectionProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  compact?: boolean;
}

export function PreviewSection({
  title,
  icon,
  children,
  className,
  collapsible = false,
  defaultExpanded = true,
  compact = false,
}: PreviewSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const toggleExpand = (e: React.MouseEvent) => {
    if (collapsible) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={cn(
      "border-t border-border/40 first:border-t-0",
      compact ? "py-2" : "py-3",
      className
    )}>
      {title && (
        <div 
          className={cn(
            "flex items-center justify-between mb-2 select-none",
            collapsible && "cursor-pointer hover:opacity-80"
          )}
          onClick={toggleExpand}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            {title}
          </div>
          {collapsible && (
            <div className="text-muted-foreground">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </div>
          )}
        </div>
      )}
      
      {(!collapsible || isExpanded) && (
        <div className={cn("animate-in fade-in slide-in-from-top-1 duration-200")}>
          {children}
        </div>
      )}
    </div>
  );
}
