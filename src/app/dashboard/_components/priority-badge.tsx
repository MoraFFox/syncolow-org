import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Priority = "critical" | "high" | "medium" | "low";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export const PriorityBadge = React.memo<PriorityBadgeProps>(function PriorityBadge({ priority, className }) {
  const styles = {
    critical: "bg-destructive/15 text-destructive border-destructive/40",
    high: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40",
    medium: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/40",
    low: "bg-muted text-muted-foreground",
  } as const;

  const icon = priority === "critical" ? (
    <AlertCircle className="h-3.5 w-3.5" />
  ) : priority === "high" ? (
    <AlertTriangle className="h-3.5 w-3.5" />
  ) : null;

  return (
    <Badge variant="outline" className={cn("gap-1", styles[priority], className)}>
      {icon}
      <span className="capitalize">{priority}</span>
    </Badge>
  );
});
