"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-10", className)}>
      <div className="relative mb-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <div className="text-muted-foreground">
            {icon}
          </div>
        </div>
      </div>
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
}
