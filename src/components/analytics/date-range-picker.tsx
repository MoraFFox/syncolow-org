'use client';

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface AnalyticsDateRangePickerProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    onGranularityChange?: (g: 'day' | 'week' | 'month') => void;
    className?: string;
}

export function AnalyticsDateRangePicker({
    date,
    setDate,
    onGranularityChange,
    className,
}: AnalyticsDateRangePickerProps) {
    const [open, setOpen] = React.useState(false);

    const presets = [
        {
            label: "Last 7 Days",
            getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }),
            granularity: 'day' as const
        },
        {
            label: "Last 30 Days",
            getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }),
            granularity: 'day' as const
        },
        {
            label: "This Month",
            getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
            granularity: 'day' as const
        },
        {
            label: "Last Month",
            getValue: () => {
                const lastMonth = subMonths(new Date(), 1);
                return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
            },
            granularity: 'day' as const
        },
        {
            label: "This Year",
            getValue: () => ({ from: startOfYear(new Date()), to: new Date() }),
            granularity: 'month' as const
        },
    ];

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-mono text-sm border-zinc-800 bg-black/40 text-zinc-300 hover:bg-zinc-900",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-emerald-500" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd")} - {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a range</span>
                        )}
                        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800" align="start">
                    <div className="flex">
                        <div className="border-r border-zinc-800 p-2 space-y-1 bg-zinc-900/50 min-w-[140px]">
                            <p className="text-xs font-semibold text-zinc-500 px-2 py-1.5 mb-1 uppercase tracking-wider">Presets</p>
                            {presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start font-normal text-zinc-300 hover:text-white hover:bg-emerald-500/10 hover:text-emerald-400"
                                    onClick={() => {
                                        setDate(preset.getValue());
                                        if (preset.granularity && onGranularityChange) {
                                            onGranularityChange(preset.granularity);
                                        }
                                        setOpen(false); // Optional: close on preset select
                                    }}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                        <div className="p-2">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                                className="bg-transparent text-zinc-200"
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
