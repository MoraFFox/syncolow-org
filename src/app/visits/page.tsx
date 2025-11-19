
"use client";
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Loading from '../loading';
import { VisitFormDialog } from './_components/visit-form-dialog';
import type { VisitCall } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TodayFocusView } from './_components/today-focus-view';
import { ScheduledTasksView } from './_components/scheduled-tasks-view';
import { HistoryLogView } from './_components/history-log-view';
import { useOrderStore } from '@/store/use-order-store';

export default function VisitsPage() {
    const { addVisit, updateVisit, deleteVisit, loading } = useOrderStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<VisitCall | null>(null);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [visitToDelete, setVisitToDelete] = useState<string | null>(null);

    const handleOpenForm = (visit: VisitCall | null) => {
        setSelectedVisit(visit);
        setIsFormOpen(true);
    }
    
    const handleCloseForm = () => {
        setSelectedVisit(null);
        setIsFormOpen(false);
    }

    const openDeleteDialog = (visitId: string) => {
      setVisitToDelete(visitId);
      setIsAlertOpen(true);
    }

    const handleDeleteConfirm = async () => {
      if (visitToDelete) {
        await deleteVisit(visitToDelete);
        handleCloseForm();
      }
      setIsAlertOpen(false);
      setVisitToDelete(null);
    }
    
    const handleComplete = (visitId: string, completed: boolean) => {
        updateVisit(visitId, { status: completed ? 'Completed' : 'Scheduled' });
    }

    const handlePostpone = (visitId: string) => {
        const visit = useOrderStore.getState().visits.find(v => v.id === visitId);
        if (visit) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            updateVisit(visitId, { date: tomorrow.toISOString() });
        }
    }

    if (loading) return <Loading />;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Visits &amp; Calls Log</h1>
                    <p className="text-muted-foreground">
                        Manage, track, and review all client interactions.
                    </p>
                </div>
                <Button onClick={() => handleOpenForm(null)} className="w-full sm:w-auto">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Log Interaction
                </Button>
            </div>
            
            <VisitFormDialog 
                isOpen={isFormOpen}
                onOpenChange={handleCloseForm}
                visit={selectedVisit}
                onDelete={openDeleteDialog}
                onSubmit={selectedVisit ? (data) => updateVisit(selectedVisit.id, data) : addVisit}
            />

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this interaction log.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Tabs defaultValue="today">
                <TabsList className="w-full justify-between flex-wrap h-auto">
                    <TabsTrigger value="today">Today's Focus</TabsTrigger>
                    <TabsTrigger value="scheduled">All Scheduled</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="today" className="mt-6">
                    <TodayFocusView onEdit={handleOpenForm} onComplete={handleComplete} onPostpone={handlePostpone} />
                </TabsContent>
                <TabsContent value="scheduled" className="mt-6">
                    <ScheduledTasksView onEdit={handleOpenForm} onComplete={handleComplete} onPostpone={handlePostpone} />
                </TabsContent>
                <TabsContent value="history" className="mt-6">
                   <HistoryLogView onEdit={handleOpenForm} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
