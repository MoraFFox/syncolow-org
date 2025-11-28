"use client";

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendBadgeProps {
  value: number;
  className?: string;
}

export function TrendBadge({ value, className }: TrendBadgeProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
      isPositive && "bg-green-500/10 text-green-500",
      isNeutral && "bg-muted text-muted-foreground",
      !isPositive && !isNeutral && "bg-red-500/10 text-red-500",
      className
    )}>
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNeutral && <Minus className="h-3 w-3" />}
      {!isPositive && !isNeutral && <TrendingDown className="h-3 w-3" />}
      <span>{isPositive ? '+' : ''}{value.toFixed(1)}%</span>
    </div>
  );
}
