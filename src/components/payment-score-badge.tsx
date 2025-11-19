/** @format */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PaymentScoreBadgeProps {
  score: number;
  status?: "excellent" | "good" | "fair" | "poor" | "critical";
  showLabel?: boolean;
  className?: string;
}

export function PaymentScoreBadge({
  score,
  status,
  showLabel = true,
  className,
}: PaymentScoreBadgeProps) {
  const getColor = () => {
    if (status) {
      switch (status) {
        case "excellent":
          return "bg-transparent border-border hover:bg-muted";
        case "good":
          return "bg-transparent border-border hover:bg-muted";
        case "fair":
          return "bg-transparent border-border hover:bg-muted";
        case "poor":
          return "bg-transparent border-border hover:bg-muted";
        case "critical":
          return "bg-transparent border-border hover:bg-muted";
      }
    }

    if (score >= 80) return "bg-transparent border-border hover:bg-muted";
    if (score >= 60) return "bg-transparent border-border hover:bg-muted";
    if (score >= 40) return "bg-transparent border-border hover:bg-muted";
    if (score >= 20) return "bg-transparent border-border hover:bg-muted";
    return "bg-transparent border-border hover:bg-muted";
  };

  const getIcon = () => {
    if (score >= 80) return "🟢";
    if (score >= 60) return "🟡";
    if (score >= 40) return "🟠";
    if (score >= 20) return "🔴";
    return "⛔";
  };

  return (
    <Badge
      className={cn(
        getColor(),
        "text-white hover:border-transparent",
        className
      )}
    >
      {getIcon()} {showLabel && `${score}`}
    </Badge>
  );
}
