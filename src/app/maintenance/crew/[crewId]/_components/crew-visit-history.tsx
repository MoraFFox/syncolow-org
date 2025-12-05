
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MaintenanceEmployee, MaintenanceVisit } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CrewVisitHistoryProps {
  crewMember: MaintenanceEmployee;
  visits: MaintenanceVisit[];
}

export function CrewVisitHistory({ crewMember, visits }: CrewVisitHistoryProps) {
  const sortedVisits = useMemo(() => {
    return visits.sort((a,b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
  }, [visits]);
  
  const getStatusVariant = (status: string) => {
    switch(status) {
        case 'Completed': return 'default';
        case 'Scheduled': return 'secondary';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit History</CardTitle>
        <CardDescription>A complete log of all visits attended by {crewMember.name}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedVisits.map(visit => (
                    <TableRow key={visit.id}>
                        <TableCell className="font-medium">
                            <DrillTarget kind="branch" payload={{ id: visit.branchId, name: visit.branchName, companyId: visit.companyId }} asChild>
                                <span className="cursor-pointer hover:underline">{visit.branchName}</span>
                            </DrillTarget>
                        </TableCell>
                        <TableCell>{format(parseISO(visit.date as string), 'PPP')}</TableCell>
                        <TableCell className="capitalize">{visit.visitType.replace('_', ' ')}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(visit.status)}>{visit.status}</Badge></TableCell>
                        <TableCell className="truncate max-w-xs">{visit.maintenanceNotes}</TableCell>
                    </TableRow>
                ))}
                 {sortedVisits.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No visit history found.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
