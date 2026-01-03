'use client';

import { AnalyticsDateRangePicker } from "./date-range-picker";
import { ExportButton } from "./export-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface AnalyticsControlsProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    granularity: 'day' | 'week' | 'month';
    setGranularity: (g: 'day' | 'week' | 'month') => void;
    onRefresh?: () => void;
    exportTargetId?: string; // ID for PDF generation
    className?: string;
    exportData?: Record<string, unknown>[]; // Data for CSV export
}

export function AnalyticsControls({
    dateRange,
    setDateRange,
    granularity,
    setGranularity,
    exportTargetId,
    className,
    exportData
}: AnalyticsControlsProps) {
    return (
        <div className={cn(
            "flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-1",
            className
        )}>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {/* Date Range Picker */}
                <AnalyticsDateRangePicker
                    date={dateRange}
                    setDate={setDateRange}
                    onGranularityChange={setGranularity}
                />

                {/* Granularity Selector */}
                <Select value={granularity} onValueChange={(v: string) => setGranularity(v as 'day' | 'week' | 'month')}>
                    <SelectTrigger className="w-[120px] border-zinc-800 bg-black/40 text-zinc-300 font-mono text-sm">
                        <SelectValue placeholder="Grain" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                        <SelectItem value="day">Daily</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                        <SelectItem value="month">Monthly</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Export Actions */}
                <ExportButton targetId={exportTargetId} data={exportData} />
            </div>
        </div>
    );
}
