"use client";

import { cn } from "@/lib/utils";

interface StockVelocityProps {
  stock: number;
  velocity: number; // items sold per day
  className?: string;
}

export function StockVelocity({ stock, velocity, className }: StockVelocityProps) {
  // Calculate days of coverage
  const daysCoverage = velocity > 0 ? Math.round(stock / velocity) : 999;
  
  // Determine health
  // < 7 days = critical (red)
  // < 21 days = warning (yellow)
  // > 21 days = healthy (green)
  let health: "critical" | "warning" | "healthy" = "healthy";
  let colorClass = "bg-green-500";
  let textColor = "text-green-600";
  
  if (daysCoverage < 7) {
    health = "critical";
    colorClass = "bg-red-500";
    textColor = "text-red-600";
  } else if (daysCoverage < 21) {
    health = "warning";
    colorClass = "bg-yellow-500";
    textColor = "text-yellow-600";
  }

  // Cap width at 100% (assumed max 60 days for visualization)
  const percent = Math.min(100, (daysCoverage / 60) * 100);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between items-end text-xs">
        <span className="text-muted-foreground font-medium">Stock Coverage</span>
        <span className={cn("font-bold", textColor)}>
          {daysCoverage > 365 ? "> 1 Year" : `${daysCoverage} Days`}
        </span>
      </div>
      
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative">
        {/* Markers for 7 and 21 days */}
        <div className="absolute top-0 bottom-0 w-px bg-white/50 left-[11.6%]" title="7 Days" />
        <div className="absolute top-0 bottom-0 w-px bg-white/50 left-[35%]" title="21 Days" />
        
        <div 
          className={cn("h-full transition-all duration-500", colorClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
      
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{stock} units</span>
        <span>~{velocity}/day</span>
      </div>
    </div>
  );
}
