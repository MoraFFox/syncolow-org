
"use client";

import { useMemo, useState } from "react";
import { isPast } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { VisitCall } from "@/lib/types";
import { TaskItem } from "./task-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useOrderStore } from "@/store/use-order-store";

interface HistoryLogViewProps {
    onEdit: (visit: VisitCall) => void;
}

export function HistoryLogView({ onEdit }: HistoryLogViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const { visits } = useOrderStore();

    const completedTasks = useMemo(() => {
        return visits.filter(v => {
            if (v.status !== 'Completed') return false;

            const searchLower = searchTerm.toLowerCase();
            if (searchLower) {
                return v.clientName?.toLowerCase().includes(searchLower) || v.outcome.toLowerCase().includes(searchLower);
            }
            return true;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [searchTerm, visits]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Interaction History</CardTitle>
                <CardDescription>A complete record of all completed visits and calls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search history by client or notes..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <ScrollArea className="h-[600px] border rounded-md">
                     <div className="p-4 space-y-3">
                        {completedTasks.length > 0 ? (
                           completedTasks.map(task => (
                                <div key={task.id} className="p-3 rounded-lg border bg-muted/30" onClick={() => onEdit(task)}>
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{task.clientName}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(task.date), 'PPP')}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{task.outcome}</p>
                                </div>
                            ))
                        ) : <p className="text-muted-foreground text-sm text-center py-8">No completed tasks found.</p>}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
