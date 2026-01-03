"use client";

import React, { useMemo, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    PointerSensor,
    defaultDropAnimationSideEffects,
    type DragStartEvent,
    type DragEndEvent,
    type DropAnimation,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Calendar,
    AlertTriangle,
    MoreHorizontal,
    User,
    Link2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MaintenanceStatusBadge } from '@/components/maintenance';
import type { MaintenanceVisit } from '@/lib/types';

// Board Columns Configuration
const COLUMNS = [
    { id: 'Scheduled', title: 'Scheduled' },
    { id: 'In Progress', title: 'In Progress' },
    { id: 'Follow-up Required', title: 'Needs Follow-up' },
    { id: 'Waiting for Parts', title: 'Waiting Parts' },
    { id: 'Completed', title: 'Completed' },
] as const;

interface KanbanBoardProps {
    visits: MaintenanceVisit[];
    onStatusChange: (visitId: string, status: MaintenanceVisit['status']) => void;
    onEditVisit: (visit: MaintenanceVisit) => void;
    onSelectVisit: (visit: MaintenanceVisit) => void;
}

export function KanbanBoard({
    visits,
    onStatusChange,
    onEditVisit,
    onSelectVisit
}: KanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    // Group visits by status
    const columns = useMemo(() => {
        const groups: Record<string, MaintenanceVisit[]> = {
            'Scheduled': [],
            'In Progress': [],
            'Follow-up Required': [],
            'Waiting for Parts': [],
            'Completed': [],
        };

        // Also catch any other statuses in a "Other" bucket if needed, 
        // or map them to nearest column. For now, we filter to known columns 
        // or everything else goes to Scheduled? Let's be strict.

        visits.forEach(visit => {
            if (visit.status in groups) {
                groups[visit.status].push(visit);
            } else if (visit.status === 'Cancelled') {
                // Don't show cancelled on board
            } else {
                // Default fallback
                groups['Scheduled'].push(visit);
            }
        });

        return groups;
    }, [visits]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement required before drag starts
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeVisitId = active.id as string;
        const overId = over.id as string;

        // Check if dropped on a column
        const isOverColumn = COLUMNS.some(col => col.id === overId);

        let newStatus = '';

        if (isOverColumn) {
            newStatus = overId;
        } else {
            // Dropped on another card, find its column
            const overVisit = visits.find(v => v.id === overId);
            if (overVisit) {
                newStatus = overVisit.status;
            }
        }

        if (newStatus) {
            // Optimistic update should happen in parent, but here we trigger it
            // We only trigger if status actually changed
            const activeVisit = visits.find(v => v.id === activeVisitId);
            if (activeVisit && activeVisit.status !== newStatus) {
                onStatusChange(activeVisitId, newStatus as MaintenanceVisit['status']);
            }
        }
    };

    const activeVisit = useMemo(() =>
        visits.find(v => v.id === activeId),
        [visits, activeId]);

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.4',
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        visits={columns[col.id]}
                        onEditVisit={onEditVisit}
                        onSelectVisit={onSelectVisit}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeVisit ? (
                    <div className="rotate-2 cursor-grabbing">
                        <KanbanCard
                            visit={activeVisit}
                            onEdit={() => { }}
                            onSelect={() => { }}
                            isOverlay
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

interface KanbanColumnProps {
    id: string;
    title: string;
    visits: MaintenanceVisit[];
    onEditVisit: (visit: MaintenanceVisit) => void;
    onSelectVisit: (visit: MaintenanceVisit) => void;
}

function KanbanColumn({ id, title, visits, onEditVisit, onSelectVisit }: KanbanColumnProps) {
    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: 'Column',
        },
        disabled: true, // Column itself isn't draggable
    });

    // Calculate total cost for column
    const columnTotal = visits.reduce((sum, v) => {
        const services = v.services?.reduce((s, svc) => s + (svc.cost * svc.quantity), 0) || 0;
        const parts = v.spareParts?.reduce((p, part) => p + ((part.price || 0) * part.quantity), 0) || 0;
        return sum + (v.laborCost || 0) + services + parts;
    }, 0);

    return (
        <div
            ref={setNodeRef}
            className="flex h-full min-w-[300px] w-[300px] flex-col rounded-lg bg-muted/40 border-2 border-transparent data-[over=true]:border-primary/20 transition-colors"
        >
            {/* Column Header */}
            <div className="p-3 flex items-center justify-between border-b bg-muted/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <MaintenanceStatusBadge status={id as MaintenanceVisit['status']} size="sm" showLabel={false} />
                    <span className="font-semibold text-sm">{title}</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 min-w-[20px] justify-center">
                        {visits.length}
                    </Badge>
                </div>
                {columnTotal > 0 && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                        {columnTotal.toLocaleString()} EGP
                    </span>
                )}
            </div>

            {/* Cards Container */}
            <div className="flex-1 p-2 overflow-y-auto min-h-[150px]">
                <SortableContext
                    items={visits.map(v => v.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col gap-2">
                        {visits.map((visit) => (
                            <SortableVisitCard
                                key={visit.id}
                                visit={visit}
                                onEdit={() => onEditVisit(visit)}
                                onSelect={() => onSelectVisit(visit)}
                            />
                        ))}
                        {visits.length === 0 && (
                            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md bg-background/50">
                                No items
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

interface SortableVisitCardProps {
    visit: MaintenanceVisit;
    onEdit: () => void;
    onSelect: () => void;
}

function SortableVisitCard({ visit, onEdit, onSelect }: SortableVisitCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: visit.id, data: { type: 'Visit', visit } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30"
            >
                <KanbanCard visit={visit} onEdit={onEdit} onSelect={onSelect} />
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <KanbanCard visit={visit} onEdit={onEdit} onSelect={onSelect} />
        </div>
    );
}

interface KanbanCardProps {
    visit: MaintenanceVisit;
    onEdit: () => void;
    onSelect: () => void;
    isOverlay?: boolean;
}

function KanbanCard({ visit, onEdit, onSelect, isOverlay }: KanbanCardProps) {
    const rawDate = visit.scheduledDate || visit.date;
    const scheduledDate = typeof rawDate === 'string' ? new Date(rawDate) : rawDate;

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group relative flex flex-col gap-2 rounded-md border bg-card p-3 shadow-sm transition-all hover:shadow-md cursor-grab active:cursor-grabbing",
                isOverlay && "cursor-grabbing shadow-xl ring-2 ring-primary rotate-2",
                visit.isSignificantDelay && "border-l-4 border-l-red-500",
                !visit.isSignificantDelay && visit.delayDays && visit.delayDays > 0 && "border-l-4 border-l-amber-500"
            )}
        >
            {/* Header: Client & Menu */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium leading-none truncate pr-1">
                        {visit.branchName || visit.companyName}
                    </span>
                    {visit.branchName !== visit.companyName && (
                        <span className="text-[10px] text-muted-foreground truncate mt-1">
                            {visit.companyName}
                        </span>
                    )}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                            Edit Details
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 font-normal">
                    {visit.visitType === 'periodic' ? 'Periodic' : 'Request'}
                </Badge>
                {visit.delayDays && visit.delayDays > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5 font-normal text-amber-600 bg-amber-50 border-amber-200">
                        +{visit.delayDays}d Delay
                    </Badge>
                )}
                {/* Follow-up indicator with parent reference */}
                {visit.rootVisitId && (
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 font-normal bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"
                        title={visit.parentVisitBranchName ? `Follow-up to: ${visit.parentVisitBranchName}` : 'Follow-up visit'}
                    >
                        <Link2 className="h-2.5 w-2.5" />
                        <span>
                            #{visit.chainDepth || 1}
                            {visit.parentVisitBranchName && (
                                <span className="ml-0.5 max-w-[40px] truncate inline-block align-bottom">
                                    → {visit.parentVisitBranchName.split(' ')[0]}
                                </span>
                            )}
                        </span>
                    </Badge>
                )}
            </div>

            {/* Footer Area */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{scheduledDate ? format(scheduledDate, 'MMM d') : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="max-w-[80px] truncate" title={visit.technicianName || 'Unassigned'}>
                            {(visit.technicianName && visit.technicianName !== 'Unassigned')
                                ? visit.technicianName.split(' ')[0]
                                : 'Unassigned'}
                        </span>
                    </div>
                </div>

                {/* Issues Indicator */}
                {(visit.problemOccurred || visit.delayReason) && (
                    <div className="flex items-center text-amber-500" title="Has issues reported">
                        <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                )}
            </div>
        </div>
    );
}

