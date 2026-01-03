"use client";

import { useMemo } from "react";
import { format, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { MaintenanceVisit } from "@/lib/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MaintenanceCalendarProps {
    visits: MaintenanceVisit[];
    onEditVisit: (visit: MaintenanceVisit) => void;
    onUpdateStatus: (visitId: string, status: MaintenanceVisit["status"]) => Promise<void>;
    onDeleteVisit: (visitId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
    Scheduled: "bg-blue-500",
    "In Progress": "bg-yellow-500",
    Completed: "bg-green-500",
    Cancelled: "bg-gray-500",
    "Follow-up Required": "bg-orange-500",
    "Waiting for Parts": "bg-purple-500",
};

export function MaintenanceCalendar({
    visits,
    onEditVisit,
    onUpdateStatus,
    onDeleteVisit,
}: MaintenanceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get visits grouped by day
    const visitsByDay = useMemo(() => {
        const grouped = new Map<string, MaintenanceVisit[]>();

        visits.forEach((visit) => {
            const dateStr = visit.scheduledDate || visit.date;
            if (!dateStr) return;

            const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
            if (!isValid(date)) return;

            const dayKey = format(date, "yyyy-MM-dd");
            const existing = grouped.get(dayKey) || [];
            existing.push(visit);
            grouped.set(dayKey, existing);
        });

        return grouped;
    }, [visits]);

    const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Calculate the starting day offset
    const startDayOffset = monthStart.getDay();

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Maintenance Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Today
                    </Button>
                    <span className="text-lg font-semibold min-w-[150px] text-center">
                        {format(currentDate, "MMMM yyyy")}
                    </span>
                    <Button variant="outline" size="sm" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Week day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                        <div
                            key={day}
                            className="text-center text-sm font-medium text-muted-foreground py-2"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startDayOffset }).map((_, index) => (
                        <div key={`empty-${index}`} className="min-h-[100px] bg-muted/30 rounded-md" />
                    ))}

                    {/* Days of the month */}
                    {daysInMonth.map((day) => {
                        const dayKey = format(day, "yyyy-MM-dd");
                        const dayVisits = visitsByDay.get(dayKey) || [];
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div
                                key={dayKey}
                                className={cn(
                                    "min-h-[100px] border rounded-md p-1 overflow-hidden",
                                    isToday && "ring-2 ring-primary",
                                    !isSameMonth(day, currentDate) && "bg-muted/50"
                                )}
                            >
                                <div className="text-sm font-medium mb-1">
                                    {format(day, "d")}
                                </div>
                                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                                    {dayVisits.slice(0, 3).map((visit) => (
                                        <button
                                            key={visit.id}
                                            onClick={() => onEditVisit(visit)}
                                            className="w-full text-left"
                                        >
                                            <div
                                                className={cn(
                                                    "text-xs p-1 rounded truncate text-white",
                                                    STATUS_COLORS[visit.status] || "bg-gray-400"
                                                )}
                                                title={`${visit.branchName} - ${visit.technicianName}`}
                                            >
                                                {visit.branchName}
                                            </div>
                                        </button>
                                    ))}
                                    {dayVisits.length > 3 && (
                                        <div className="text-xs text-muted-foreground text-center">
                                            +{dayVisits.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                    {Object.entries(STATUS_COLORS).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded", color)} />
                            <span className="text-sm text-muted-foreground">{status}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
