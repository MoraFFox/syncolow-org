
"use client";

import { useMemo, useState } from "react";
import { isFuture, isToday } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { VisitCall } from "@/lib/types";
import { TaskItem } from "./task-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrderStore } from "@/store/use-order-store";

interface ScheduledTasksViewProps {
    onEdit: (visit: VisitCall) => void;
    onComplete: (visitId: string, completed: boolean) => void;
    onPostpone: (visitId: string) => void;
}

export function ScheduledTasksView({ onEdit, onComplete, onPostpone }: ScheduledTasksViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const { visits } = useOrderStore();

    const upcomingTasks = useMemo(() => {
        return visits.filter(v => {
            if (v.status === 'Completed') return false;
            if (!isFuture(new Date(v.date)) && !isToday(new Date(v.date))) return false;

            const searchLower = searchTerm.toLowerCase();
            if (searchLower) {
                return v.clientName?.toLowerCase().includes(searchLower) || v.outcome.toLowerCase().includes(searchLower);
            }
            return true;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [searchTerm, visits]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>All Scheduled Tasks</CardTitle>
                <CardDescription>A complete list of all upcoming visits and calls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by client or notes..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <ScrollArea className="h-[600px] border rounded-md">
                     <div className="p-4 space-y-3">
                        {upcomingTasks.length > 0 ? (
                            upcomingTasks.map(task => (
                                <TaskItem key={task.id} task={task} onEdit={onEdit} onComplete={onComplete} onPostpone={onPostpone} />
                            ))
                        ) : <p className="text-muted-foreground text-sm text-center py-8">No upcoming tasks scheduled.</p>}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
