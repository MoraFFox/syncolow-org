"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

// UI Components
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// Icons
import {
    MoreHorizontal,
    ChevronDown,
    ChevronRight,
    Pencil,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Wrench,
    Package,
    GitCommit,
    GitMerge,
    CornerDownRight
} from "lucide-react";

// Custom Components
import {
    MaintenanceStatusBadge,
    CaseTimeline,
    CostBadge,
} from "@/components/maintenance";
import type { MaintenanceVisit } from "@/lib/types";

export interface EnhancedMaintenanceListProps {
    visits: MaintenanceVisit[];
    selectedVisitId: string | null;
    onSelectVisit: (visit: MaintenanceVisit) => void;
    onEditVisit: (visit: MaintenanceVisit) => void;
    onUpdateStatus: (visitId: string, status: MaintenanceVisit["status"]) => Promise<void>;
    onDeleteVisit: (visitId: string) => void;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

function parseDateSafe(dateValue: string | Date | undefined | null): Date | null {
    if (!dateValue) return null;
    const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    return isValid(date) ? date : null;
}

function formatDate(dateValue: string | Date | undefined): string {
    const date = parseDateSafe(dateValue);
    return date ? format(date, "MMM d, yyyy") : "N/A";
}

/**
 * calculateAggregateCost
 * Sums up labor + parts + services for a visit and its children
 */
function calculateAggregateCost(visits: MaintenanceVisit[]): number {
    return visits.reduce((sum, v) => {
        const labor = v.laborCost || 0;
        const parts = v.spareParts?.reduce((pSum, p) => pSum + (p.price || 0) * p.quantity, 0) || 0;
        const services = v.services?.reduce((sSum, s) => sSum + (s.cost || 0) * s.quantity, 0) || 0;
        return sum + labor + parts + services;
    }, 0);
}

/**
 * Enhanced Maintenance List with Hierarchical "Wire" View
 */
export function EnhancedMaintenanceList({
    visits,
    selectedVisitId,
    onSelectVisit,
    onEditVisit,
    onUpdateStatus,
    onDeleteVisit,
    selectedIds = new Set(),
    onSelectionChange,
}: EnhancedMaintenanceListProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Group visits into Case Chains
    // Result: [RootVisit, ...Children][]
    const groupedVisits = useMemo(() => {
        const groups: Record<string, MaintenanceVisit[]> = {};
        const orphans: MaintenanceVisit[] = [];

        // 1. Identify Roots and group children
        visits.forEach(v => {
            const rootId = v.rootVisitId || v.id; // If no rootId, it IS the root (or standalone)
            if (!groups[rootId]) {
                groups[rootId] = [];
            }
            groups[rootId].push(v);
        });

        // 2. Sort groups by the ROOT visit's date
        //    AND sort children within groups by date/chainDepth
        return Object.values(groups).map(group => {
            // Find the actual root object
            // ideally the one with !rootVisitId, or the one with id === rootVisitId
            // fallback to earliest date if data is messy
            group.sort((a, b) => {
                const da = parseDateSafe(a.date)?.getTime() || 0;
                const db = parseDateSafe(b.date)?.getTime() || 0;
                return da - db;
            });
            return group;
        }).sort((groupA, groupB) => {
            // Sort chains by most recent activity (last visit in chain)
            const lastA = groupA[groupA.length - 1];
            const lastB = groupB[groupB.length - 1];
            const da = parseDateSafe(lastA.date)?.getTime() || 0;
            const db = parseDateSafe(lastB.date)?.getTime() || 0;
            return db - da; // Descending
        });

    }, [visits]);


    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelect = (id: string, checked: boolean) => {
        if (!onSelectionChange) return;
        const next = new Set(selectedIds);
        if (checked) next.add(id);
        else next.delete(id);
        onSelectionChange(next);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;
        if (checked) {
            onSelectionChange(new Set(visits.map(v => v.id)));
        } else {
            onSelectionChange(new Set());
        }
    };

    const allSelected = visits.length > 0 && selectedIds.size === visits.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < visits.length;

    if (visits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Maintenance Visits</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Schedule your first maintenance visit to get started tracking and managing cases.
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {onSelectionChange && (
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={allSelected || (someSelected ? "indeterminate" : false)}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                        )}
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Client / Branch</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groupedVisits.map((group) => {
                        const rootVisit = group[0]; // First is root (sorted by date)
                        const children = group.slice(1);
                        const isExpanded = expandedRows.has(rootVisit.id);

                        // Aggregates for the Parent Row display
                        const chainTotalCost = calculateAggregateCost(group);
                        const isResolved = group.some(v => v.status === "Completed"); // Simplistic logic, can be refined based on 'solved' resolution

                        return (
                            <React.Fragment key={rootVisit.id}>
                                {/* ROOT VISIT ROW */}
                                <MaintenanceRow
                                    visit={rootVisit}
                                    isSelected={rootVisit.id === selectedVisitId}
                                    isExpanded={isExpanded}
                                    hasChildren={children.length > 0}
                                    isChecked={selectedIds.has(rootVisit.id)}
                                    onToggleCheck={onSelectionChange ? (c) => toggleSelect(rootVisit.id, c) : undefined}
                                    onToggleExpand={(e) => toggleExpand(rootVisit.id, e)}
                                    onSelect={() => onSelectVisit(rootVisit)}
                                    onEdit={() => onEditVisit(rootVisit)}
                                    onUpdateStatus={onUpdateStatus}
                                    onDelete={() => onDeleteVisit(rootVisit.id)}
                                    // Overrides for Aggregation Display
                                    customCost={chainTotalCost > 0 ? chainTotalCost : undefined}
                                />

                                {/* EXPANDED DETAILS (Accordion Body) */}
                                {isExpanded && (
                                    <TableRow className="bg-muted/5 hover:bg-muted/5 !border-0">
                                        <TableCell colSpan={onSelectionChange ? 9 : 8} className="p-0">
                                            <div className="pl-12 pr-4 py-4 relative">
                                                {/* The "Wire" Background Line */}
                                                <div className="absolute left-[2.85rem] top-0 bottom-6 w-0.5 bg-border z-0" />

                                                <div className="space-y-6 relative z-10">

                                                    {/* 1. Root Details Card */}
                                                    <ExpandedRowContent visit={rootVisit} onEdit={() => onEditVisit(rootVisit)} />

                                                    {/* 2. Children Chain (Follow-ups) */}
                                                    {children.length > 0 && (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                                                                <GitMerge className="h-4 w-4" />
                                                                Follow-up Chain
                                                            </div>

                                                            {children.map((child, idx) => {
                                                                const isLast = idx === children.length - 1;
                                                                return (
                                                                    <div key={child.id} className="relative pl-6">
                                                                        {/* Connector Curve */}
                                                                        <div className="absolute left-0 top-6 w-5 h-px bg-border -ml-[1.35rem]" />
                                                                        <CornerDownRight className="absolute left-0 top-3 h-4 w-4 text-muted-foreground -ml-[1.6rem]" />

                                                                        <MaintenanceRowCard
                                                                            visit={child}
                                                                            onClick={() => onSelectVisit(child)}
                                                                            onEdit={() => onEditVisit(child)}
                                                                            isLast={isLast}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

// -----------------------------------------------------------------------------
// Sub-Components for cleaner rendering
// -----------------------------------------------------------------------------

/**
 * Renders a single row in the main table.
 * Used for Root visits.
 */
function MaintenanceRow({
    visit,
    isSelected,
    isExpanded,
    hasChildren,
    isChecked,
    onToggleCheck,
    onToggleExpand,
    onSelect,
    onEdit,
    onUpdateStatus,
    onDelete,
    customCost
}: any) {
    const hasDelay = visit.delayDays && visit.delayDays > 0;
    const services = visit.services || [];
    const parts = visit.spareParts || [];

    // Calculate distinct cost if not provided
    const displayCost = customCost !== undefined ? customCost :
        ((visit.laborCost || 0) + parts.reduce((s: any, p: any) => s + ((p.price || 0) * p.quantity), 0));

    // Determine company absorption cost for badge
    const companyAbsorbs =
        services.filter((s: any) => s.paidBy === "Company").reduce((sum: number, s: any) => sum + (s.cost * s.quantity), 0) +
        parts.filter((p: any) => p.paidBy === "Company").reduce((sum: number, p: any) => sum + ((p.price || 0) * p.quantity), 0);

    return (
        <TableRow
            className={cn(
                "group cursor-pointer transition-colors border-l-4",
                isSelected ? "bg-accent border-l-primary" : "border-l-transparent",
                hasDelay && "border-l-amber-500", // Delay warning overrides selection color if present? Or use a pill?
                isExpanded && "bg-muted/5 border-b-0"
            )}
            onClick={onSelect}
        >
            {onToggleCheck && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={isChecked}
                        onCheckedChange={onToggleCheck}
                        aria-label={`Select ${visit.branchName}`}
                    />
                </TableCell>
            )}
            <TableCell>
                {(hasChildren || visit.maintenanceNotes || services.length > 0) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={onToggleExpand}
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                )}
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{visit.branchName || visit.companyName}</span>
                        <code
                            className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground hover:text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={(e) => { e.stopPropagation(); onSelect(); }}
                            title="Click to view details"
                        >
                            #{visit.id.substring(0, 6)}
                        </code>
                    </div>
                    {visit.branchName && visit.branchName !== visit.companyName && (
                        <span className="text-xs text-muted-foreground">{visit.companyName}</span>
                    )}
                    {hasChildren && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground bg-secondary/30 px-1.5 py-0.5 rounded w-fit">
                            <GitCommit className="h-3 w-3" />
                            <span>Chain Active</span>
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-1.5">
                    <span>{formatDate(visit.scheduledDate || visit.date)}</span>
                    {hasDelay && (
                        <span className="text-amber-500 text-xs font-medium bg-amber-500/10 px-1 rounded">
                            +{visit.delayDays}d
                        </span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <span className={cn(!visit.technicianName && "text-muted-foreground italic")}>
                    {visit.technicianName || "Unassigned"}
                </span>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className="capitalize text-xs">
                    {visit.visitType === "periodic" ? "Periodic" : "Request"}
                </Badge>
            </TableCell>
            <TableCell>
                <MaintenanceStatusBadge status={visit.status} size="sm" />
            </TableCell>
            <TableCell className="text-right">
                {displayCost > 0 ? (
                    <CostBadge total={displayCost} companyAbsorbs={companyAbsorbs} />
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onEdit}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit / Log Outcome
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onUpdateStatus(visit.id, "Completed")}>
                            <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                            Mark Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateStatus(visit.id, "In Progress")}>
                            <Clock className="h-4 w-4 mr-2 text-amber-600" />
                            Start Visit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onDelete} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Visit
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}

/**
 * A Card-based view for Child Visits (Follow-ups) to distinguish them from Parents
 */
function MaintenanceRowCard({ visit, onClick, onEdit, isLast }: any) {
    const services = visit.services || [];
    const parts = visit.spareParts || [];
    const cost = (visit.laborCost || 0) + parts.reduce((s: any, p: any) => s + ((p.price || 0) * p.quantity), 0);

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative border rounded-lg p-3 bg-card hover:shadow-md transition-all cursor-pointer",
                visit.status === 'Completed' ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-500"
            )}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                            Follow-up
                        </span>
                        <code
                            className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground hover:text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                            title="Click to view details"
                        >
                            #{visit.id.substring(0, 6)}
                        </code>
                        <span className="text-xs text-muted-foreground">
                            on {formatDate(visit.date)}
                        </span>
                        <MaintenanceStatusBadge status={visit.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {visit.technicianName || "Unassigned"}
                        </div>
                        {cost > 0 && (
                            <div className="font-medium text-foreground">
                                {cost.toLocaleString()} EGP
                            </div>
                        )}
                    </div>
                </div>

                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil className="h-3 w-3" />
                </Button>
            </div>

            {/* Quick summary of work done in this follow-up */}
            {(services.length > 0 || parts.length > 0) && (
                <div className="mt-2 text-xs flex gap-2">
                    {services.length > 0 && (
                        <Badge variant="secondary" className="px-1 py-0 h-5 font-normal">
                            {services.length} Svc
                        </Badge>
                    )}
                    {parts.length > 0 && (
                        <Badge variant="secondary" className="px-1 py-0 h-5 font-normal">
                            {parts.length} Pts
                        </Badge>
                    )}
                </div>
            )}
        </div>
    )
}


// Expanded Row Content Component (Retained mostly original but styled)
function ExpandedRowContent({
    visit,
    onEdit,
}: {
    visit: MaintenanceVisit;
    onEdit: () => void;
}) {
    const services = visit.services || [];
    const parts = visit.spareParts || [];
    const problemReasons = visit.problemReason || [];

    return (
        <div className="p-4 bg-background border rounded-lg shadow-sm">
            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Root Details & Context</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Problems & Resolution */}
                <div className="space-y-4">
                    {/* Problems */}
                    {problemReasons.length > 0 && (
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Problems Identified
                            </h4>
                            <div className="flex flex-wrap gap-1">
                                {problemReasons.map((reason, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                        {reason}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resolution Status */}
                    {visit.resolutionStatus && (
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">Resolution</h4>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-xs",
                                    visit.resolutionStatus === "solved" && "border-emerald-500 text-emerald-700",
                                    visit.resolutionStatus === "partial" && "border-amber-500 text-amber-700",
                                    visit.resolutionStatus === "not_solved" && "border-red-500 text-red-700",
                                    visit.resolutionStatus === "waiting_parts" && "border-violet-500 text-violet-700"
                                )}
                            >
                                {visit.resolutionStatus === "solved" && "Fully Resolved"}
                                {visit.resolutionStatus === "partial" && "Partially Resolved"}
                                {visit.resolutionStatus === "not_solved" && "Not Resolved"}
                                {visit.resolutionStatus === "waiting_parts" && "Waiting for Parts"}
                            </Badge>
                            {visit.nonResolutionReason && (
                                <p className="text-xs text-muted-foreground mt-1">{visit.nonResolutionReason}</p>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    {visit.maintenanceNotes && (
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">Notes</h4>
                            <p className="text-sm text-muted-foreground">{visit.maintenanceNotes}</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Services & Parts */}
                <div className="space-y-4">
                    {/* Services */}
                    {services.length > 0 && (
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Wrench className="h-3 w-3" />
                                Services ({services.length})
                            </h4>
                            <div className="space-y-1">
                                {services.map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50">
                                        <span>{s.name} {s.quantity > 1 && `×${s.quantity}`}</span>
                                        <span className="font-medium">
                                            {(s.cost * s.quantity).toLocaleString()} EGP
                                            {s.paidBy === "Company" && <span className="text-amber-500 ml-1">(Co.)</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Parts */}
                    {parts.length > 0 && (
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Parts ({parts.length})
                            </h4>
                            <div className="space-y-1">
                                {parts.map((p, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50">
                                        <span>{p.name} {p.quantity > 1 && `×${p.quantity}`}</span>
                                        <span className="font-medium">
                                            {((p.price || 0) * p.quantity).toLocaleString()} EGP
                                            {p.paidBy === "Company" && <span className="text-amber-500 ml-1">(Co.)</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="pt-2">
                        <Button size="sm" variant="outline" onClick={onEdit}>
                            <Pencil className="h-3 w-3 mr-1.5" />
                            Edit Details
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
