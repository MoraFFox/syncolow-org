
"use client";

import { useMemo } from "react";
import { isToday, isTomorrow, isPast, endOfDay } from "date-fns";
import { useOrderStore } from "@/store/use-order-store";
import { useCompanyStore } from "@/store/use-company-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Calendar, Phone, Car } from "lucide-react";
import type { VisitCall } from "@/lib/types";
import { TaskItem } from "./task-item";
import { VisitsMap } from "./visits-map";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TodayFocusViewProps {
    onEdit: (visit: VisitCall) => void;
    onComplete: (visitId: string, completed: boolean) => void;
    onPostpone: (visitId: string) => void;
}

export function TodayFocusView({ onEdit, onComplete, onPostpone }: TodayFocusViewProps) {
    const { visits } = useOrderStore();
    const { companies } = useCompanyStore();

    const tasks = useMemo(() => {
        const now = new Date();
        const enrichedVisits = visits.map(v => ({
            ...v,
            isOverdue: isPast(endOfDay(new Date(v.date))) && v.status !== 'Completed'
        }));

        const todayVisits = enrichedVisits.filter(v => v.type === 'Visit' && v.status !== 'Completed' && isToday(new Date(v.date)));
        const todayCalls = enrichedVisits.filter(v => v.type === 'Call' && v.status !== 'Completed' && isToday(new Date(v.date)));
        const tomorrowTasks = enrichedVisits.filter(v => v.status !== 'Completed' && isTomorrow(new Date(v.date)));
        const overdueTasks = enrichedVisits.filter(v => v.isOverdue);

        return { todayVisits, todayCalls, tomorrowTasks, overdueTasks };
    }, [visits]);
    
    const getClientPhoneNumber = (clientId: string) => {
        const client = companies.find(c => c.id === clientId);
        if (!client) return 'N/A';
        // Assuming the first phone number of the first contact is the primary one.
        return client.contacts?.[0]?.phoneNumbers?.[0]?.number || 'N/A';
    }


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {tasks.overdueTasks.length > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Overdue Tasks!</AlertTitle>
                        <AlertDescription>
                            {tasks.overdueTasks.length} task(s) were not completed on their scheduled day. Please review, complete, or postpone them.
                        </AlertDescription>
                    </Alert>
                )}
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" />Today's Visits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tasks.todayVisits.length > 0 ? (
                            <div className="space-y-3">
                                {tasks.todayVisits.map(visit => (
                                    <TaskItem key={visit.id} task={visit} onEdit={onEdit} onComplete={onComplete} onPostpone={onPostpone} />
                                ))}
                            </div>
                        ) : <p className="text-muted-foreground text-sm">No visits scheduled for today.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />Today's Calls</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {tasks.todayCalls.length > 0 ? (
                            <div className="space-y-3">
                               {tasks.todayCalls.map(call => (
                                   <div key={call.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                        <TaskItem task={call} onEdit={onEdit} onComplete={onComplete} onPostpone={onPostpone} className="flex-1"/>
                                        <p className="text-sm font-mono p-2 bg-muted rounded-md mt-2 sm:mt-0 sm:ml-4">{getClientPhoneNumber(call.clientId)}</p>
                                   </div>
                               ))}
                            </div>
                        ) : <p className="text-muted-foreground text-sm">No calls scheduled for today.</p>}
                    </CardContent>
                </Card>
                 <VisitsMap visits={[...tasks.todayVisits, ...tasks.tomorrowTasks.filter(t => t.type === 'Visit')]} />
            </div>
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Tomorrow's Agenda</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tasks.tomorrowTasks.length > 0 ? (
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-3">
                                    {tasks.tomorrowTasks.map(task => (
                                        <TaskItem key={task.id} task={task} onEdit={onEdit} onComplete={onComplete} onPostpone={onPostpone} />
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : <p className="text-muted-foreground text-sm">Nothing scheduled for tomorrow yet.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
