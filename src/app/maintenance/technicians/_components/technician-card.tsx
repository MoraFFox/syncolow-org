"use client";

import React from 'react';
import { MaintenanceEmployee, MaintenanceVisit } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkloadIndicator } from '@/components/maintenance/workload-indicator';
import { cn } from '@/lib/utils';
import { CheckCircle2, Phone, ChevronRight, Trash2 } from 'lucide-react';

interface TechnicianCardProps {
    employee: MaintenanceEmployee;
    activeVisits: MaintenanceVisit[];
    completedVisitsLast30Days: MaintenanceVisit[];
    onClick?: () => void;
    onDelete?: (employee: MaintenanceEmployee) => void;
}

export function TechnicianCard({ employee, activeVisits, completedVisitsLast30Days, onClick, onDelete }: TechnicianCardProps) {
    // --- Metrics Calculation ---

    // 1. Current Workload (Scheduled + In Progress for Today/Active)
    // Simplified: "Active" implies currently assigned and not done.
    const currentLoad = activeVisits.length;
    const CAPACITY = 5; // Hardcoded capacity for now, could be dynamic later

    // 2. Status
    const isBusy = currentLoad >= 3;
    const isOverloaded = currentLoad >= CAPACITY;

    // 3. On-Time Performance (Last 30 Days)
    const totalCompleted = completedVisitsLast30Days.length;
    const delayedVisits = completedVisitsLast30Days.filter(v => (v.delayDays || 0) > 0).length;
    const onTimePercentage = totalCompleted > 0
        ? Math.round(((totalCompleted - delayedVisits) / totalCompleted) * 100)
        : 100; // Default to 100% if no history

    // 4. Next Available (Mock logic: if overloaded, say "Tomorrow", else "Now")
    const availability = isOverloaded ? 'Tomorrow' : 'Now';

    // Initials for Avatar
    const initials = employee.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <Card
            className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/20 cursor-pointer bg-card"
            onClick={onClick}
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-primary transition-colors" />

            <CardHeader className="flex flex-row items-start gap-4 p-5 pb-2">
                <Avatar className="h-12 w-12 border-2 border-border/50">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.name}`} />
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold truncate text-lg leading-tight">{employee.name}</h3>
                            {employee.role && (
                                <span className="text-xs text-muted-foreground">{employee.role}</span>
                            )}
                        </div>
                        <Badge variant={isBusy ? "secondary" : "default"} className={isOverloaded ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : isBusy ? "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20" : "bg-green-500/10 text-green-600 hover:bg-green-500/20"}>
                            {isOverloaded ? "Overloaded" : isBusy ? "Busy" : "Available"}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> {employee.phone}
                        </p>
                        {employee.status && (
                            <Badge variant="outline" className={cn(
                                "text-[10px] px-1.5",
                                employee.status === 'active' ? 'bg-green-500/10 text-green-600' :
                                    employee.status === 'on_leave' ? 'bg-yellow-500/10 text-yellow-600' :
                                        'bg-muted text-muted-foreground'
                            )}>
                                {employee.status === 'active' ? 'Active' : employee.status === 'on_leave' ? 'On Leave' : 'Inactive'}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-4 space-y-5">

                {/* Workload Section */}
                <WorkloadIndicator currentLoad={currentLoad} capacity={CAPACITY} />

                {/* Mini Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border/50">
                    <div className="px-1">
                        <span className="block text-xl font-bold text-foreground">{totalCompleted}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Month</span>
                    </div>
                    <div className="px-1">
                        <span className={cn("block text-xl font-bold", onTimePercentage < 90 ? "text-yellow-600" : "text-green-600")}>
                            {onTimePercentage}%
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">On-Time</span>
                    </div>
                    <div className="px-1">
                        <span className="block text-xl font-bold text-primary">{activeVisits.filter(v => v.status === 'In Progress').length}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 flex justify-between items-center text-sm border-t border-border/50 mt-2">
                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); onDelete(employee); }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Remove from roster</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <div className="flex items-center text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                            <span>Next: {availability}</span>
                        </div>
                    </div>

                    <Button variant="ghost" size="sm" className="h-8 px-2 -mr-2 text-primary group-hover:translate-x-1 transition-transform">
                        View Schedule <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
