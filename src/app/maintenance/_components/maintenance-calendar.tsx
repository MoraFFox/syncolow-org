
"use client"
import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import type { MaintenanceVisit } from '@/lib/types';
import { format, isSameDay, startOfMonth, endOfMonth, isWithinInterval, isFuture, isToday, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface MaintenanceCalendarProps {
    visits: MaintenanceVisit[];
    onEditVisit: (visit: MaintenanceVisit) => void;
    onUpdateStatus: (visitId: string, status: MaintenanceVisit['status']) => void;
    onDeleteVisit: (visitId: string) => void;
}


export function MaintenanceCalendar({ visits, onEditVisit, onUpdateStatus, onDeleteVisit }: MaintenanceCalendarProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  
  const selectedDayVisits = React.useMemo(() => {
    if (!date) return [];
    return visits
      .filter(visit => {
        if (!visit.date) return false;
        const visitDate = typeof visit.date === 'string' ? parseISO(visit.date) : visit.date;
        return isSameDay(visitDate, date);
      })
      .sort((a,b) => {
        const dateA = typeof a.date === 'string' ? parseISO(a.date) : a.date;
        const dateB = typeof b.date === 'string' ? parseISO(b.date) : b.date;
        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
      });
  }, [date, visits]);

  const analytics = React.useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    
    const upcomingVisits = visits.filter(v => {
      if (!v.date || v.status !== 'Scheduled') return false;
      const visitDate = typeof v.date === 'string' ? parseISO(v.date) : v.date;
      return visitDate >= now;
    }).length;
    
    const completedThisMonth = visits.filter(v => {
        if (v.status !== 'Completed' || !v.date) return false;
        const visitDate = typeof v.date === 'string' ? parseISO(v.date) : v.date;
        return isWithinInterval(visitDate, {start: startOfCurrentMonth, end: endOfCurrentMonth});
    }).length;

    return { upcomingVisits, completedThisMonth };
  }, [visits]);
  

  const modifiers = React.useMemo(() => {
    const upcomingVisitDates = visits
      .filter(v => {
        if (!v.date || v.status !== 'Scheduled') return false;
        const visitDate = typeof v.date === 'string' ? parseISO(v.date) : v.date;
        return isFuture(visitDate) || isToday(visitDate);
      })
      .map(v => typeof v.date === 'string' ? parseISO(v.date) : v.date as Date);

    const pastVisitDates = visits
      .filter(v => {
        if (!v.date) return false;
        const visitDate = typeof v.date === 'string' ? parseISO(v.date) : v.date;
        return !isFuture(visitDate) && !isToday(visitDate);
      })
      .map(v => typeof v.date === 'string' ? parseISO(v.date) : v.date as Date);
    
    return {
        upcoming: upcomingVisitDates,
        past: pastVisitDates,
    }
  }, [visits]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Upcoming Visits</CardTitle>
                <CardDescription>Total number of scheduled visits.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{analytics.upcomingVisits}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Completed This Month</CardTitle>
                <CardDescription>Visits successfully completed in the current month.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{analytics.completedThisMonth}</p>
            </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1fr,400px]">
        <Card>
           <CardContent className="p-0 flex justify-center">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    modifiers={modifiers}
                    modifiersClassNames={{
                        upcoming: 'is-upcoming',
                        past: 'has-past-visit',
                    }}
                />
           </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>
                    Visits for {date ? format(date, 'PPP') : '...'}
                </CardTitle>
                <CardDescription>
                    All scheduled visits for the selected day.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {selectedDayVisits.length > 0 ? (
                    selectedDayVisits.map(visit => (
                         <div key={visit.id} className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                           <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">{visit.branchName}</p>
                                <p className="text-xs text-muted-foreground">{visit.date ? format(parseISO(visit.date as string), 'p') : ''}</p>
                              </div>
                               <Badge variant={visit.status === 'Completed' ? 'default' : visit.status === 'Cancelled' ? 'destructive' : 'secondary'}>{visit.status}</Badge>
                           </div>
                           <p className="text-sm text-muted-foreground mt-2">{visit.maintenanceNotes}</p>
                           {visit.visitType === 'customer_request' && (
                                <Badge variant="outline" className="mt-2">Client Request</Badge>
                           )}
                            <div className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 mt-2 ml-auto flex">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => onEditVisit(visit)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Log/Edit Outcome
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => onUpdateStatus(visit.id, 'Completed')}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Completed
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => onUpdateStatus(visit.id, 'Cancelled')}>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancel Visit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                     <DropdownMenuItem onClick={() => onDeleteVisit(visit.id)} className="text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Visit
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No visits scheduled for this day.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
