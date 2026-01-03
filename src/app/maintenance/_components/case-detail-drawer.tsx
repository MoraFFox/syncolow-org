"use client";

import * as React from "react";
import { useMemo, useState, useEffect } from "react";
import { format, parseISO, isValid, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { useMaintenanceStore } from "@/store/use-maintenance-store";

// Icons
import {
    X,
    Edit,
    Trash2,
    Clock,
    User,
    Package,
    Wrench,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    DollarSign,
    ArrowUpRight,
    StickyNote,
    GitCommit,
    LayoutDashboard,
    ChevronRight,
    History
} from "lucide-react";

import { MaintenanceStatusBadge, CaseTimeline } from "@/components/maintenance";
import type { MaintenanceVisit } from "@/lib/types";

export interface CaseDetailDrawerProps {
    visit: MaintenanceVisit | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (visit: MaintenanceVisit) => void;
    onDelete: (visitId: string) => void;
    onStatusChange: (visitId: string, status: MaintenanceVisit["status"]) => Promise<void>;
}

function parseDateSafe(dateValue: string | Date | undefined | null): Date | null {
    if (!dateValue) return null;
    const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    return isValid(date) ? date : null;
}

/**
 * Case Detail Drawer (Master-Detail Layout)
 * 
 * Implements a wide "Sheet" with a split view:
 * - Left Sidebar: Case Context Navigation (Overview + Timeline)
 * - Main Area: Detailed view of the selected context (Visit Details or Case Stats)
 */
export function CaseDetailDrawer({
    visit,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    onStatusChange,
}: CaseDetailDrawerProps) {
    const { maintenanceVisits: allVisits } = useMaintenanceStore();
    const [selectedId, setSelectedId] = useState<string | "overview">("overview");

    // Reset selection when drawer opens with a new visit
    useEffect(() => {
        if (visit && isOpen) {
            // Default to the visit passed in prop (The one clicked)
            setSelectedId(visit.id);
        }
    }, [visit?.id, isOpen]);

    // 1. Calculate Case Context (Root + Children + Stats)
    const context = useMemo(() => {
        if (!visit) return null;

        const isRoot = !visit.rootVisitId;
        const rootId = visit.rootVisitId || visit.id;
        const chain = allVisits.filter(v => v.id === rootId || v.rootVisitId === rootId);

        // Sort: Root first, then by date logic
        chain.sort((a, b) => {
            const da = parseDateSafe(a.date)?.getTime() || 0;
            const db = parseDateSafe(b.date)?.getTime() || 0;
            return da - db;
        });

        // Stats
        const totalVisits = chain.length;
        const totalLabor = chain.reduce((sum, v) => sum + (v.laborCost || 0), 0);
        const totalParts = chain.reduce((sum, v) => sum + (v.spareParts?.reduce((pSum, p) => pSum + ((p.price || 0) * p.quantity), 0) || 0), 0);
        const totalServices = chain.reduce((sum, v) => sum + (v.services?.reduce((sSum, s) => sSum + (s.cost * s.quantity), 0) || 0), 0);
        const totalCost = totalLabor + totalParts + totalServices;

        const uniqueProblems = Array.from(new Set(chain.flatMap(v => v.problemReason || [])));

        // Time span
        const firstDate = parseDateSafe(chain[0]?.date);
        const lastDate = parseDateSafe(chain[chain.length - 1]?.resolutionDate || chain[chain.length - 1]?.actualArrivalDate || chain[chain.length - 1]?.date);
        const durationDays = firstDate && lastDate ? differenceInDays(lastDate, firstDate) : 0;

        return {
            rootId,
            chain,
            isRoot,
            totalVisits,
            totalCost,
            uniqueProblems,
            durationDays,
            currentStatus: visit.status,
            clientName: visit.branchName || visit.companyName || "Unknown Client"
        };
    }, [visit, allVisits]);

    if (!visit || !context) return null;

    const selectedVisit = context.chain.find(v => v.id === selectedId);

    // Helper Selection Data
    const isOverview = selectedId === "overview";

    return (
        <>
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    "fixed right-0 top-0 z-50 h-full w-full max-w-[95vw] md:max-w-4xl border-l bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:z-50",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Main Container Grid */}
                <div className="flex h-full divide-x">

                    {/* LEFT SIDEBAR: Navigation & Timeline (300px min) */}
                    <div className="w-[300px] flex-shrink-0 flex flex-col bg-muted/20">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b h-16 flex items-center">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <History className="w-4 h-4" /> Case History
                            </h2>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-4">

                                {/* 1. Overview Button */}
                                <button
                                    onClick={() => setSelectedId("overview")}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border",
                                        isOverview
                                            ? "bg-background border-primary/50 shadow-sm ring-1 ring-primary/20"
                                            : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                                        isOverview ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                    )}>
                                        <LayoutDashboard className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">Case Dashboard</div>
                                        <div className="text-[10px] opacity-70">Stats & Summary</div>
                                    </div>
                                    {isOverview && <ChevronRight className="w-4 h-4 text-primary opacity-50" />}
                                </button>

                                <Separator />

                                {/* 2. Timeline List */}
                                <div className="space-y-2">
                                    <div className="px-1 text-[10px] font-bold uppercase text-muted-foreground/70">
                                        Timeline ({context.totalVisits} Visits)
                                    </div>

                                    <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                                        {context.chain.map((item, index) => {
                                            const isActive = item.id === selectedId;
                                            const itemDate = parseDateSafe(item.actualArrivalDate || item.date);
                                            const isRoot = index === 0;

                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setSelectedId(item.id)}
                                                    className={cn(
                                                        "relative w-full flex text-left group pl-6 transition-all",
                                                        isActive ? "opacity-100 scale-[1.02]" : "opacity-70 hover:opacity-100"
                                                    )}
                                                >
                                                    {/* Timeline Dot */}
                                                    <div className={cn(
                                                        "absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-background z-10 transition-colors",
                                                        isActive ? "border-primary bg-primary" : "border-muted-foreground/30 group-hover:border-primary/60",
                                                        isRoot && "w-3 h-3 left-[-6px] rounded-sm"
                                                    )} />

                                                    <div className={cn(
                                                        "w-full p-2.5 rounded-md border transition-all",
                                                        isActive
                                                            ? "bg-background border-primary/40 shadow-sm"
                                                            : "bg-card border-transparent hover:bg-card hover:border-border hover:shadow-sm"
                                                    )}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <Badge variant="outline" className={cn(
                                                                "h-5 text-[9px] px-1 font-normal",
                                                                isRoot ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700"
                                                            )}>
                                                                {isRoot ? "ROOT" : `FOLLOW-UP #${index}`}
                                                            </Badge>
                                                            {itemDate && <span className="text-[10px] text-muted-foreground">{format(itemDate, "MMM d")}</span>}
                                                        </div>
                                                        <div className="text-xs font-semibold truncate">{item.technicianName || "Unassigned"}</div>
                                                        <div className="mt-1 flex items-center justify-between">
                                                            <MaintenanceStatusBadge status={item.status} size="sm" />
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT MAIN PANEL: Content */}
                    <div className="flex-1 flex flex-col min-w-0 bg-background/50">

                        {/* Header */}
                        <div className="h-16 border-b flex items-center justify-between px-6 bg-background">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-0.5">
                                    CASE #{context.rootId.substring(0, 8)}
                                </div>
                                <div className="text-lg font-bold truncate">{context.clientName}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={onClose}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6 md:p-8 max-w-3xl mx-auto">

                                {isOverview && (
                                    <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                        <div>
                                            <h3 className="text-xl font-bold tracking-tight mb-2">Case Layout</h3>
                                            <p className="text-muted-foreground">High-level summary of all {context.totalVisits} visits in this case chain.</p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <KpiCardLarge
                                                label="Total Cost"
                                                value={`${context.totalCost.toLocaleString()}`}
                                                unit="EGP"
                                                icon={DollarSign}
                                            />
                                            <KpiCardLarge
                                                label="Duration"
                                                value={context.durationDays === 0 ? "1" : `${context.durationDays + 1}`}
                                                unit="Days"
                                                icon={Clock}
                                            />
                                            <KpiCardLarge
                                                label="Problem Solved?"
                                                value={visit.status === 'Completed' ? "Yes" : "In Progress"}
                                                unit="Status"
                                                icon={CheckCircle2}
                                                highlight={visit.status === 'Completed'}
                                            />
                                        </div>

                                        {/* Consolidated Issues */}
                                        <div className="bg-card border rounded-xl p-5 shadow-sm">
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" /> Consolidated Issues
                                            </h4>
                                            {context.uniqueProblems.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {context.uniqueProblems.map((p, i) => (
                                                        <Badge key={i} className="px-3 py-1.5 text-sm bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
                                                            {p}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground italic">No specific problems cited across visits.</div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Timeline Visualization</h4>
                                            <div className="p-4 border rounded-xl bg-card">
                                                <CaseTimeline visit={visit} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isOverview && selectedVisit && (
                                    <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">

                                        {/* Visit Header */}
                                        <div className="flex items-start justify-between pb-6 border-b">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={cn(
                                                        "rounded-sm px-2 py-0.5 text-xs font-semibold",
                                                        !selectedVisit.rootVisitId ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-600 hover:bg-slate-700"
                                                    )}>
                                                        {!selectedVisit.rootVisitId ? "ROOT VISIT" : "FOLLOW-UP"}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        {format(parseDateSafe(selectedVisit.date)!, "MMMM d, yyyy")}
                                                    </span>
                                                </div>
                                                <h3 className="text-2xl font-bold">{selectedVisit.technicianName || "Unassigned Technician"}</h3>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <MaintenanceStatusBadge status={selectedVisit.status} />
                                                <div className="text-lg font-bold text-emerald-600">
                                                    {((selectedVisit.laborCost || 0) +
                                                        (selectedVisit.spareParts?.reduce((s, p) => s + (p.price || 0) * p.quantity, 0) || 0) +
                                                        (selectedVisit.services?.reduce((s, sv) => s + sv.cost * sv.quantity, 0) || 0)).toLocaleString()} EGP
                                                </div>
                                            </div>
                                        </div>

                                        {/* Date Details */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                                                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-xs uppercase text-muted-foreground font-bold">Scheduled</div>
                                                    <div className="font-medium">{format(parseDateSafe(selectedVisit.date)!, "PP")}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                                                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-xs uppercase text-muted-foreground font-bold">Actual Arrival</div>
                                                    <div className="font-medium">
                                                        {selectedVisit.actualArrivalDate
                                                            ? format(parseDateSafe(selectedVisit.actualArrivalDate)!, "PP p")
                                                            : "Not Arrived"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Problem & Notes */}
                                        <div className="grid gap-6">
                                            {(selectedVisit.problemReason?.length || 0) > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Problems Reported</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedVisit.problemReason!.map((p, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-900 border border-red-100 rounded-lg text-sm font-medium">
                                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                                                {p}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Technician Notes</h4>
                                                <div className="p-4 bg-muted/30 rounded-xl border italic text-muted-foreground leading-relaxed">
                                                    "{selectedVisit.overallReport || selectedVisit.maintenanceNotes || "No notes recorded."}"
                                                </div>
                                            </div>
                                        </div>

                                        {/* Resources Table */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">Billing & Resources</h4>

                                            <div className="border rounded-xl overflow-hidden">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                                        <tr>
                                                            <th className="px-4 py-3">Item</th>
                                                            <th className="px-4 py-3 text-center">Qty</th>
                                                            <th className="px-4 py-3 text-right">Cost</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {(selectedVisit.services || []).map((s, i) => (
                                                            <tr key={`svc-${i}`} className="bg-card">
                                                                <td className="px-4 py-3 font-medium flex items-center gap-2">
                                                                    <Wrench className="w-3 h-3 text-blue-500" /> {s.name}
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-muted-foreground">{s.quantity}</td>
                                                                <td className="px-4 py-3 text-right">{s.cost * s.quantity}</td>
                                                            </tr>
                                                        ))}
                                                        {(selectedVisit.spareParts || []).map((p, i) => (
                                                            <tr key={`part-${i}`} className="bg-card">
                                                                <td className="px-4 py-3 font-medium flex items-center gap-2">
                                                                    <Package className="w-3 h-3 text-orange-500" /> {p.name}
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-muted-foreground">{p.quantity}</td>
                                                                <td className="px-4 py-3 text-right">{(p.price || 0) * p.quantity}</td>
                                                            </tr>
                                                        ))}
                                                        {(!selectedVisit.services?.length && !selectedVisit.spareParts?.length) && (
                                                            <tr>
                                                                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground opacity-50">
                                                                    No billable items.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    <tfoot className="bg-muted/20 font-bold border-t">
                                                        <tr>
                                                            <td colSpan={2} className="px-4 py-3 text-right">Total</td>
                                                            <td className="px-4 py-3 text-right">
                                                                {((selectedVisit.laborCost || 0) +
                                                                    (selectedVisit.spareParts?.reduce((s, p) => s + (p.price || 0) * p.quantity, 0) || 0) +
                                                                    (selectedVisit.services?.reduce((s, sv) => s + sv.cost * sv.quantity, 0) || 0)).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="pt-8 flex gap-3">
                                            <Button size="lg" className="w-full" onClick={() => onEdit(selectedVisit)}>
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit This Visit
                                            </Button>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </aside>
        </>
    );
}

function KpiCardLarge({ label, value, unit, icon: Icon, highlight }: { label: string, value: string, unit: string, icon: any, highlight?: boolean }) {
    return (
        <div className={cn(
            "p-5 rounded-xl border bg-card shadow-sm flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02]",
            highlight && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
        )}>
            <div className={cn("p-2 rounded-full mb-3", highlight ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
            <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{label}</div>
        </div>
    );
}
