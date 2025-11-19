
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, HardHat } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CompanyMaintenanceHistoryProps {
    companyId: string;
}

export function CompanyMaintenanceHistory({ companyId }: CompanyMaintenanceHistoryProps) {
    const { maintenanceVisits } = useMaintenanceStore();

    const companyVisits = useMemo(() => {
        return maintenanceVisits
            .filter(v => v.companyId === companyId)
            .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
    }, [maintenanceVisits, companyId]);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Completed': return 'default';
            case 'Scheduled': return 'secondary';
            case 'Cancelled': return 'destructive';
            default: return 'outline';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HardHat className="h-5 w-5" /> All Maintenance History
                </CardTitle>
                <CardDescription>A consolidated log of all maintenance visits across all branches.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Branch</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companyVisits.map(visit => {
                                const visitDate = visit.date ? new Date(visit.date) : null;
                                const isValidDate = visitDate && !isNaN(visitDate.getTime());
                                
                                return (
                                    <TableRow key={visit.id}>
                                        <TableCell className="font-medium">{visit.branchName}</TableCell>
                                        <TableCell>{isValidDate ? format(visitDate, 'PPP') : 'Invalid Date'}</TableCell>
                                        <TableCell>
                                            <Badge variant={visit.visitType === 'customer_request' ? 'outline' : 'secondary'} className="capitalize">
                                                {visit.visitType.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell><Badge variant={getStatusVariant(visit.status)}>{visit.status}</Badge></TableCell>
                                        <TableCell className="truncate max-w-xs">{visit.maintenanceNotes}</TableCell>
                                    </TableRow>
                                );
                            })}
                             {companyVisits.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No maintenance history for this company.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
