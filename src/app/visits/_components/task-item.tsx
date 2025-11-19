
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, Phone, Car } from "lucide-react";
import { format } from "date-fns";
import type { VisitCall } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskItemProps {
    task: VisitCall & { isOverdue?: boolean };
    onEdit: (visit: VisitCall) => void;
    onComplete: (visitId: string, completed: boolean) => void;
    onPostpone: (visitId: string) => void;
    className?: string;
}

export function TaskItem({ task, onEdit, onComplete, onPostpone, className }: TaskItemProps) {
    return (
        <div className={cn("p-3 rounded-lg border bg-card text-card-foreground shadow-sm flex items-start gap-4 transition-colors", task.isOverdue && "border-destructive/50 bg-destructive/10", className)}>
            <Checkbox
                id={`task-${task.id}`}
                checked={task.status === 'Completed'}
                onCheckedChange={(checked) => onComplete(task.id, !!checked)}
                className="mt-1"
            />
            <div className="flex-1">
                <label htmlFor={`task-${task.id}`} className="font-medium cursor-pointer">{task.clientName}</label>
                <p className="text-sm text-muted-foreground">{task.outcome}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                        {task.type === 'Visit' ? <Car className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                        <span>{task.type}</span>
                    </div>
                     <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(task.date), 'p')}</span>
                    </div>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -my-1 -mr-1">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(task)}>Edit Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPostpone(task.id)}>Postpone to Tomorrow</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
