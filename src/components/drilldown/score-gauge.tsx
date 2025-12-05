"use client";

import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number; // 0-100
  label?: string;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function ScoreGauge({ score, label, size = "md", showValue = true }: ScoreGaugeProps) {
  const radius = size === "sm" ? 18 : size === "md" ? 28 : 40;
  const strokeWidth = size === "sm" ? 3 : size === "md" ? 4 : 5;
  const validScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 0;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (validScore / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const colorClass = getColor(validScore);
  const sizeClass = size === "sm" ? "h-12 w-12" : size === "md" ? "h-20 w-20" : "h-28 w-28";
  const fontSize = size === "sm" ? "text-xs" : size === "md" ? "text-lg" : "text-2xl";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={cn("relative flex items-center justify-center", sizeClass)}>
        <svg className="h-full w-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            className="stroke-muted fill-none"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            className={cn("fill-none transition-all duration-1000 ease-out", colorClass)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference.toString()}
            strokeDashoffset={isNaN(offset) ? "0" : offset.toString()}
            strokeLinecap="round"
          />
        </svg>
        {showValue && (
          <div className={cn("absolute font-bold", fontSize)}>
            {validScore}
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">
          {label}
        </span>
      )}
    </div>
  );
}
