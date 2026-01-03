"use client";

import { useEffect, useState } from "react";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    MapPin,
    Clock,
    ChevronRight,
    ArrowRight,
    CheckCircle2,
    RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function TechDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const { maintenanceVisits, fetchInitialData } = useMaintenanceStore();
    const [isLoading, setIsLoading] = useState(false);

    // Refresh on mount
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await fetchInitialData();
            setIsLoading(false);
        };
        load();
    }, [fetchInitialData]);

    // Filter tasks assigned to current user (fuzzy match for now as IDs might differ)
    // Ideally we match by ID, but for now we might match by name partial or just show all if manager
    const myTasks = maintenanceVisits.filter(v =>
        v.status !== 'Completed' &&
        v.status !== 'Cancelled' &&
        (v.technicianId === user?.uid || v.technicianName?.toLowerCase().includes(user?.displayName?.toLowerCase() || ""))
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const todaysTasks = myTasks.filter(v => {
        const d = new Date(v.date);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    });

    const upcomingTasks = myTasks.filter(v => !todaysTasks.includes(v));

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <header className="flex justify-between items-center pt-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Hello, {user?.displayName?.split(' ')[0] || "Tech"}</h1>
                    <p className="text-muted-foreground text-sm">You have {todaysTasks.length} tasks today</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setIsLoading(true); fetchInitialData().finally(() => setIsLoading(false)); }}
                    className={cn("rounded-full", isLoading && "animate-spin")}
                >
                    <RefreshCw className="h-5 w-5" />
                </Button>
            </header>

            {/* Today's Focus */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's Focus</h2>

                {todaysTasks.length === 0 ? (
                    <div className="p-6 border border-dashed rounded-xl text-center bg-muted/20">
                        <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">All clear for today!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todaysTasks.map(task => (
                            <TaskCard key={task.id} task={task} onClick={() => router.push(`/maintenance/tech/${task.id}`)} />
                        ))}
                    </div>
                )}
            </section>

            {/* Upcoming */}
            {upcomingTasks.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
                    <div className="space-y-3 opacity-80">
                        {upcomingTasks.slice(0, 3).map(task => ( // Show next 3 only
                            <TaskCard key={task.id} task={task} onClick={() => router.push(`/maintenance/tech/${task.id}`)} />
                        ))}
                    </div>
                </section>
            )}

            {/* Quick Actions / Bottom Sheet placeholder */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none h-24" />
        </div>
    );
}

function TaskCard({ task, onClick }: { task: any, onClick: () => void }) {
    const isPriority = task.priority === 'High' || task.priority === 'Critical';

    return (
        <div
            onClick={onClick}
            className="group relative bg-card border rounded-2xl p-4 shadow-sm active:scale-95 transition-all cursor-pointer overflow-hidden"
        >
            {/* Priority Indicator */}
            {isPriority && (
                <div className="absolute top-0 right-0 p-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </div>
            )}

            <div className="flex justify-between items-start mb-3">
                <Badge variant={isPriority ? "destructive" : "secondary"} className="rounded-full px-3 font-normal">
                    {task.branchName || task.companyName}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                    #{task.id.substring(0, 4)}
                </span>
            </div>

            <h3 className="font-semibold text-lg mb-1 leading-tight">
                {task.maintenanceNotes || "Routine Maintenance"}
            </h3>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{format(new Date(task.date), "h:mm a")}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="truncate">{task.address || "No Address"}</span>
                </div>
            </div>

            {/* "Swipe" affordance */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg">
                    <ArrowRight className="h-4 w-4" />
                </div>
            </div>
        </div>
    )
}
