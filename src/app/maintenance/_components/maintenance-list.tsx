"use client";

import { useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import type { MaintenanceVisit } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MaintenanceListProps {
    visits: MaintenanceVisit[];
    onEditVisit: (visit: MaintenanceVisit) => void;
    onUpdateStatus: (visitId: string, status: MaintenanceVisit["status"]) => Promise<void>;
    onDeleteVisit: (visitId: string) => void;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Scheduled: "secondary",
    "In Progress": "default",
    Completed: "outline",
    Cancelled: "destructive",
    "Follow-up Required": "default",
    "Waiting for Parts": "secondary",
};

const STATUS_COLORS: Record<string, string> = {
    Scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    "In Progress": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    Completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    "Follow-up Required": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    "Waiting for Parts": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

function formatDate(dateValue: string | Date | undefined): string {
    if (!dateValue) return "N/A";

    try {
        const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
        if (!isValid(date)) return "Invalid Date";
        return format(date, "MMM d, yyyy");
    } catch {
        return "Invalid Date";
    }
}

export function MaintenanceList({
    visits,
    onEditVisit,
    onUpdateStatus,
    onDeleteVisit,
}: MaintenanceListProps) {
    // Sort visits by date (most recent first)
    const sortedVisits = useMemo(() => {
        return [...visits].sort((a, b) => {
            const dateA = a.scheduledDate || a.date;
            const dateB = b.scheduledDate || b.date;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return new Date(dateB as string).getTime() - new Date(dateA as string).getTime();
        });
    }, [visits]);

    if (visits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Maintenance Visits</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Schedule your first maintenance visit to get started.
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client / Branch</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delay</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedVisits.map((visit) => (
                        <TableRow key={visit.id} className="group">
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{visit.companyName}</span>
                                    <span className="text-sm text-muted-foreground">{visit.branchName}</span>
                                </div>
                            </TableCell>
                            <TableCell>{formatDate(visit.scheduledDate || visit.date)}</TableCell>
                            <TableCell>{visit.technicianName || "Unassigned"}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">
                                    {visit.visitType?.replace("_", " ") || "N/A"}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge className={cn("border-0", STATUS_COLORS[visit.status] || "")}>
                                    {visit.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {visit.delayDays && visit.delayDays > 0 ? (
                                    <div className="flex items-center gap-1 text-orange-600">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>{visit.delayDays}d</span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Open menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onEditVisit(visit)}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit / Log Outcome
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">Change Status</DropdownMenuLabel>
                                        {visit.status !== "Completed" && (
                                            <DropdownMenuItem onClick={() => onUpdateStatus(visit.id, "Completed")}>
                                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                                Mark Completed
                                            </DropdownMenuItem>
                                        )}
                                        {visit.status !== "In Progress" && visit.status !== "Completed" && (
                                            <DropdownMenuItem onClick={() => onUpdateStatus(visit.id, "In Progress")}>
                                                <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                                                Start Visit
                                            </DropdownMenuItem>
                                        )}
                                        {visit.status !== "Cancelled" && (
                                            <DropdownMenuItem onClick={() => onUpdateStatus(visit.id, "Cancelled")}>
                                                <XCircle className="h-4 w-4 mr-2 text-gray-600" />
                                                Cancel Visit
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDeleteVisit(visit.id)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Visit
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
