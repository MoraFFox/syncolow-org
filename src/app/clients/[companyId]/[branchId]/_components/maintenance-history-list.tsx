
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Star, HardHat } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MaintenanceHistoryListProps {
    companyId: string;
    branchId: string;
}

export function MaintenanceHistoryList({ companyId, branchId }: MaintenanceHistoryListProps) {
    const { maintenanceVisits } = useMaintenanceStore();

    const branchVisits = useMemo(() => {
        return maintenanceVisits
            .filter(v => v.branchId === branchId)
            .sort((a, b) => {
                const dateA = a.date ? parseISO(a.date as string) : new Date(0);
                const dateB = b.date ? parseISO(b.date as string) : new Date(0);
                return (isValid(dateB) ? dateB.getTime() : 0) - (isValid(dateA) ? dateA.getTime() : 0);
            });
    }, [maintenanceVisits, branchId]);

    const getEvaluationRating = (evaluation: string | undefined) => {
        switch (evaluation) {
            case 'Excellent': return 5;
            case 'Good': return 4;
            case 'Average': return 3;
            case 'Poor': return 2;
            default: return 0;
        }
    };
    
    const renderRating = (rating: number) => (
        <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
    
    const formatDateSafe = (dateInput: string | Date | undefined) => {
        if (!dateInput) return 'N/A';
        const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
        if (isValid(date)) {
            return format(date, 'PPP');
        }
        return 'Invalid Date';
    };


    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HardHat className="h-5 w-5" /> Maintenance History
                </CardTitle>
            </CardHeader>
            <CardContent>
                {branchVisits.length > 0 ? (
                    <ScrollArea className="h-[120px] pr-4">
                        <div className="space-y-3">
                            {branchVisits.map(visit => {
                                const rating = getEvaluationRating(visit.overallReport);
                                return (
                                <DrillTarget 
                                    key={visit.id}
                                    kind="maintenance" 
                                    payload={{ 
                                        id: visit.id, 
                                        branchId: visit.branchId, 
                                        companyId: companyId, 
                                        date: typeof visit.date === 'object' ? visit.date.toISOString() : visit.date, 
                                        notes: visit.maintenanceNotes, 
                                        status: visit.status, 
                                        rating: getEvaluationRating(visit.overallReport) 
                                    }} 
                                    asChild
                                >
                                    <Link href={`/maintenance`} className="block">
                                        <div className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors cursor-pointer">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">{visit.maintenanceNotes}</span>
                                                <span className="text-xs text-muted-foreground">{formatDateSafe(visit.date)}</span>
                                            </div>
                                            <div className="mt-1">
                                                {renderRating(rating)}
                                            </div>
                                        </div>
                                    </Link>
                                </DrillTarget>
                                )
                            })}
                        </div>
                    </ScrollArea>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No maintenance history for this branch.</p>
                )}
            </CardContent>
        </Card>
    );
}
