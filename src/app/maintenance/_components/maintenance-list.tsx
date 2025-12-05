

"use client";

import React, { useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, XCircle, GitBranch, ChevronsRight, CornerDownRight, Timer, DollarSign, Trash2 } from 'lucide-react';
import type { MaintenanceVisit } from '@/lib/types';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DrillTarget } from '@/components/drilldown/drill-target';

interface MaintenanceListProps {
    visits: MaintenanceVisit[];
    onEditVisit: (visit: MaintenanceVisit) => void;
    onUpdateStatus: (visitId: string, status: MaintenanceVisit['status']) => void;
    onDeleteVisit: (visitId: string) => void;
}

export function MaintenanceList({ visits, onEditVisit, onUpdateStatus, onDeleteVisit }: MaintenanceListProps) {

    const visitCaseMap = useMemo(() => {
        const map = new Map<string, MaintenanceVisit[]>();
        const rootVisits: MaintenanceVisit[] = [];

        // First pass: group by rootVisitId
        visits.forEach(visit => {
            const rootId = visit.rootVisitId || visit.id;
            if (!map.has(rootId)) {
                map.set(rootId, []);
            }
            map.get(rootId)!.push(visit);
        });
        
        // Second pass: identify roots and sort children
        map.forEach((caseVisits, rootId) => {
            const root = caseVisits.find(v => v.id === rootId);
            if (root) {
                const children = caseVisits.filter(v => v.id !== rootId).sort((a,b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
                map.set(rootId, [root, ...children]);
                rootVisits.push(root);
            }
        });
        
        // Sort root visits by date
        rootVisits.sort((a,b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

        return { caseMap: map, rootVisits };

    }, [visits]);

    const getStatusVariant = (status: MaintenanceVisit['status']) => {
        switch (status) {
            case 'Completed': return 'default';
            case 'Scheduled': return 'secondary';
            case 'In Progress': return 'outline';
            case 'Cancelled': return 'destructive';
            case 'Follow-up Required': return 'outline';
            case 'Waiting for Parts': return 'outline';
            default: return 'outline';
        }
    }

    const formatDateSafe = (dateInput: string | Date | undefined) => {
        if (!dateInput) return 'N/A';
        try {
            const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
            if (isValid(date)) {
                return format(date, 'PPP');
            }
            return 'Invalid Date';
        } catch (error) {
            console.error("Date formatting error:", error);
            return 'Invalid Date';
        }
    }

    return (
        <div className="space-y-4">
            {/* Unified View */}
            <div className="hidden md:block border rounded-lg bg-primary-foreground shadow-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client / Case</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visitCaseMap.rootVisits.map(rootVisit => {
                           const caseVisits = (visitCaseMap.caseMap.get(rootVisit.id) || []);
                           const childVisits = caseVisits.filter(v => v.id !== rootVisit.id);
                           const hasAggregates = rootVisit.status === 'Completed' && (rootVisit.totalVisits || 0) > 1;

                           return (
                            <React.Fragment key={rootVisit.id}>
                                <TableRow>
                                    <TableCell className="font-bold">
                                        <DrillTarget kind="company" payload={{ id: rootVisit.companyId, name: rootVisit.branchName }} asChild>
                                            <span className="cursor-pointer hover:underline">{rootVisit.branchName}</span>
                                        </DrillTarget>
                                    </TableCell>
                                    <TableCell>{formatDateSafe(rootVisit.date)}</TableCell>
                                    <TableCell className="capitalize">{rootVisit.visitType?.replace('_', ' ')}</TableCell>
                                    <TableCell className="truncate max-w-xs">{rootVisit.maintenanceNotes}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(rootVisit.status)}>{rootVisit.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => onEditVisit(rootVisit)}><Edit className="h-4 w-4 mr-2" />Log Outcome</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(rootVisit.id, 'Cancelled')}><XCircle className="h-4 w-4 mr-2" />Cancel Visit</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => onDeleteVisit(rootVisit.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Visit</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                {childVisits.map((childVisit) => (
                                    <TableRow key={childVisit.id} className="bg-muted/30 hover:bg-muted/50">
                                        <TableCell><div className="flex items-center gap-2 pl-6"><CornerDownRight className="h-4 w-4 text-muted-foreground" />Follow-up</div></TableCell>
                                        <TableCell>{formatDateSafe(childVisit.date)}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="truncate max-w-xs">{childVisit.maintenanceNotes}</TableCell>
                                        <TableCell><Badge variant="outline">Logged</Badge></TableCell>
                                        <TableCell className="text-right">
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => onEditVisit(childVisit)}><Edit className="h-4 w-4 mr-2" />View/Edit Log</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => onDeleteVisit(childVisit.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Log</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                 {hasAggregates && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="p-2 bg-accent">
                                            <div className="flex items-center justify-end gap-6 px-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <ChevronsRight className="h-4 w-4 text-blue-500"/>
                                                    <span className="font-semibold">Case Resolved</span>
                                                </div>
                                                <div className="flex items-center gap-1.5" title="Total Visits"><GitBranch className="h-4 w-4 text-muted-foreground"/><span className="font-medium">{rootVisit.totalVisits} visits</span></div>
                                                <div className="flex items-center gap-1.5" title="Resolution Time"><Timer className="h-4 w-4 text-muted-foreground"/><span className="font-medium">{rootVisit.resolutionTimeDays} days</span></div>
                                                <div className="flex items-center gap-1.5" title="Total Parts Cost"><DollarSign className="h-4 w-4 text-muted-foreground"/><span className="font-medium">${rootVisit.totalCost?.toFixed(2)}</span></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                           )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden grid grid-cols-1 gap-4">
                 {visitCaseMap.rootVisits.map(rootVisit => {
                    const childVisits = (visitCaseMap.caseMap.get(rootVisit.id) || []).filter(v => v.id !== rootVisit.id);

                    return (
                        <Collapsible key={rootVisit.id} className="border rounded-lg overflow-hidden">
                            <Card className="border-0 rounded-none">
                                <CardContent className="p-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <DrillTarget kind="company" payload={{ id: rootVisit.companyId, name: rootVisit.branchName }} asChild>
                                                <p className="font-semibold cursor-pointer hover:underline">{rootVisit.branchName}</p>
                                            </DrillTarget>
                                            <p className="text-sm text-muted-foreground">{formatDateSafe(rootVisit.date)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={getStatusVariant(rootVisit.status)}>
                                                {rootVisit.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm italic">"{rootVisit.maintenanceNotes}"</p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => onEditVisit(rootVisit)} className="flex-1">
                                            <Edit className="mr-2 h-4 w-4" />
                                            Log
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => onUpdateStatus(rootVisit.id, 'Cancelled')} className="flex-1">
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Cancel
                                        </Button>
                                        <Button variant="outline" size="sm" className="w-10 p-0" onClick={() => onDeleteVisit(rootVisit.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                     {childVisits.length > 0 && (
                                        <CollapsibleTrigger asChild>
                                            <Button variant="secondary" size="sm" className="w-full">View {childVisits.length} Follow-ups</Button>
                                        </CollapsibleTrigger>
                                    )}
                                </CardContent>
                            </Card>
                            <CollapsibleContent>
                                {childVisits.map(childVisit => (
                                    <div key={childVisit.id} className="p-3 border-t bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><CornerDownRight className="h-3 w-3"/> Follow-up</p>
                                            <p className="text-xs text-muted-foreground">{formatDateSafe(childVisit.date)}</p>
                                        </div>
                                        <p className="text-sm italic pl-5 mt-1">"{childVisit.maintenanceNotes}"</p>
                                    </div>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    )
                 })}
            </div>
        </div>
    )
}
