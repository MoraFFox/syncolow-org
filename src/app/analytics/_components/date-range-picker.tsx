"use client"

import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, startOfYear, startOfQuarter, endOfQuarter, subYears, endOfYear } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
    dateRange: { from: string; to: string };
    onDateRangeChange: (range: { from: string; to: string }) => void;
}

type PresetKey = 'last7' | 'last30' | 'last90' | 'lastQuarter' | 'ytd' | 'lastYear';

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
    const presets: { key: PresetKey; label: string; getValue: () => { from: string; to: string } }[] = [
        {
            key: 'last7',
            label: 'Last 7 days',
            getValue: () => ({
                from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                to: format(new Date(), 'yyyy-MM-dd')
            })
        },
        {
            key: 'last30',
            label: 'Last 30 days',
            getValue: () => ({
                from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                to: format(new Date(), 'yyyy-MM-dd')
            })
        },
        {
            key: 'last90',
            label: 'Last 90 days',
            getValue: () => ({
                from: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
                to: format(new Date(), 'yyyy-MM-dd')
            })
        },
        {
            key: 'lastQuarter',
            label: 'Last Quarter',
            getValue: () => {
                const lastQuarterEnd = endOfQuarter(subMonths(new Date(), 3));
                const lastQuarterStart = startOfQuarter(subMonths(new Date(), 3));
                return {
                    from: format(lastQuarterStart, 'yyyy-MM-dd'),
                    to: format(lastQuarterEnd, 'yyyy-MM-dd')
                };
            }
        },
        {
            key: 'ytd',
            label: 'Year to Date',
            getValue: () => ({
                from: format(startOfYear(new Date()), 'yyyy-MM-dd'),
                to: format(new Date(), 'yyyy-MM-dd')
            })
        },
        {
            key: 'lastYear',
            label: 'Last Year',
            getValue: () => ({
                from: format(startOfYear(subYears(new Date(), 1)), 'yyyy-MM-dd'),
                to: format(endOfYear(subYears(new Date(), 1)), 'yyyy-MM-dd')
            })
        }
    ];

    const handlePresetClick = (preset: typeof presets[0]) => {
        onDateRangeChange(preset.getValue());
    };

    const isFromAfterTo = dateRange.from > dateRange.to;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                    <Button
                        key={preset.key}
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetClick(preset)}
                        className="text-xs"
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="grid gap-2 w-full sm:w-auto">
                    <label htmlFor="from-date" className="text-sm font-medium">From</label>
                    <input 
                        id="from-date"
                        type="date" 
                        value={dateRange.from} 
                        onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                        className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
                            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            isFromAfterTo && "border-red-500 focus-visible:ring-red-500"
                        )}
                    />
                </div>
                <div className="grid gap-2 w-full sm:w-auto">
                    <label htmlFor="to-date" className="text-sm font-medium">To</label>
                    <input 
                        id="to-date"
                        type="date" 
                        value={dateRange.to} 
                        onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                        className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
                            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            isFromAfterTo && "border-red-500 focus-visible:ring-red-500"
                        )}
                    />
                </div>
            </div>
            {isFromAfterTo && (
                <p className="text-sm text-red-600 dark:text-red-500">
                    Start date must be before end date
                </p>
            )}
        </div>
    );
}
