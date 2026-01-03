"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface WorkloadIndicatorProps {
    currentLoad: number;
    capacity: number;
    className?: string;
}

export function WorkloadIndicator({ currentLoad, capacity, className }: WorkloadIndicatorProps) {
    const percentage = Math.min((currentLoad / capacity) * 100, 100);

    let colorClass = "bg-green-500";
    if (percentage >= 80) {
        colorClass = "bg-red-500";
    } else if (percentage >= 50) {
        colorClass = "bg-yellow-500";
    }

    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Workload</span>
                <span>{currentLoad} / {capacity} visits</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                    className={cn("h-full transition-all duration-500 ease-in-out", colorClass)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
