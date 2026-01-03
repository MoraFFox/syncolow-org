"use client";

import { useState, useEffect, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    PlusCircle,
    Calendar as CalendarIcon,
    List as ListIcon,
    Users,
    Wrench,
    LayoutDashboard
} from 'lucide-react';
import Loading from '../loading';
import { ScheduleVisitForm } from './_components/schedule-visit-form';
import { MaintenanceVisitOutcomeForm } from './_components/maintenance-visit-form';
import { MaintenanceCalendar } from './_components/maintenance-calendar';
import { CrewMemberForm } from './_components/crew-member-form';
import { DelayAnalytics } from './_components/delay-analytics';
import { OperationsHub } from './_components/operations-hub';
import { EnhancedMaintenanceList } from './_components/enhanced-maintenance-list';
import { CaseDetailDrawer } from './_components/case-detail-drawer';
import { KanbanBoard } from './_components/kanban-board';
import { CasesFilterBar } from './_components/cases-filter-bar';
import type { MaintenanceVisit, MaintenanceEmployee } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { ErrorBoundary } from '@/components/error-boundary';

export default function MaintenancePage() {
    const {
        maintenanceVisits,
        loading,
        fetchInitialData,
        addMaintenanceVisit,
        updateMaintenanceVisit,
        updateMaintenanceVisitStatus,
        deleteMaintenanceVisit,
        addMaintenanceEmployee,
        updateMaintenanceEmployee,
        searchMaintenanceVisits,
    } = useMaintenanceStore();

    const { fetchInitialData: _fetchOrderData } = useOrderStore();

    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTabFromUrl = searchParams.get('tab') || 'hub';
    const viewModeFromUrl = searchParams.get('view') as 'list' | 'board' | 'calendar' || 'list';

    const [activeTab, setActiveTab] = useState(activeTabFromUrl);
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>(viewModeFromUrl);

    useEffect(() => {
        setActiveTab(activeTabFromUrl);
    }, [activeTabFromUrl]);

    // Sync view mode with URL when explicit
    useEffect(() => {
        if (searchParams.get('view')) {
            setViewMode(searchParams.get('view') as any);
        }
    }, [searchParams]);

    const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
    const [isOutcomeFormOpen, setIsOutcomeFormOpen] = useState(false);
    const [isCrewFormOpen, setIsCrewFormOpen] = useState(false);

    const [selectedVisit, setSelectedVisit] = useState<MaintenanceVisit | null>(null);
    const [selectedCrewMember, setSelectedCrewMember] = useState<MaintenanceEmployee | null>(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    const [drawerVisit, setDrawerVisit] = useState<MaintenanceVisit | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [visitToDelete, setVisitToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const debouncedSearch = useDebouncedCallback(async (term: string) => {
        if (!term.trim()) {
            await fetchInitialData();
        } else {
            await searchMaintenanceVisits(term);
        }
    }, 500);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        debouncedSearch(term);
    };

    // Derived filtered visits
    const filteredVisits = useMemo(() => {
        let result = maintenanceVisits;

        // Filter by Status
        if (selectedStatuses.length > 0) {
            result = result.filter(v => selectedStatuses.includes(v.status));
        }

        return result;
    }, [maintenanceVisits, selectedStatuses]);

    const statusOptions = ['Scheduled', 'In Progress', 'Waiting for Parts', 'Completed', 'Cancelled', 'Follow-up Required'];

    const handleScheduleSubmit = async (visit: Omit<MaintenanceVisit, 'id'>) => {
        await addMaintenanceVisit(visit);
        setIsScheduleFormOpen(false);
    };

    const handleOutcomeSubmit = async (visitId: string, data: Partial<MaintenanceVisit>) => {
        await updateMaintenanceVisit(visitId, data);
        // Note: Dialog close is handled by the form component after all operations complete
        // (including follow-up creation if scheduled)
    };

    const handleCrewSubmit = async (data: Omit<MaintenanceEmployee, 'id' | 'email'>) => {
        if (selectedCrewMember) {
            await updateMaintenanceEmployee(selectedCrewMember.id, data);
        } else {
            await addMaintenanceEmployee(data);
        }
        setIsCrewFormOpen(false);
        setSelectedCrewMember(null);
    };

    const openEditOutcomeForm = (visit: MaintenanceVisit) => {
        setSelectedVisit(visit);
        setIsOutcomeFormOpen(true);
    }

    const openDeleteDialog = (visitId: string) => {
        setVisitToDelete(visitId);
        setIsAlertOpen(true);
    }

    const handleDeleteConfirm = async () => {
        if (visitToDelete) {
            await deleteMaintenanceVisit(visitToDelete);
            toast({ title: "Visit Deleted" });
            if (drawerVisit?.id === visitToDelete) {
                setDrawerVisit(null);
                setIsDrawerOpen(false);
            }
        }
        setIsAlertOpen(false);
        setVisitToDelete(null);
    }

    const handleSelectVisit = (visit: MaintenanceVisit) => {
        setDrawerVisit(visit);
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => {
            if (!isDrawerOpen) setDrawerVisit(null);
        }, 300);
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (value === 'services') {
            router.push('/maintenance/services');
        } else if (value === 'crew') {
            router.push('/maintenance/technicians');
        } else {
            router.push(`/maintenance?tab=${value}`);
        }
    };

    const handleViewModeChange = (value: 'list' | 'board' | 'calendar') => {
        if (!value) return;
        setViewMode(value);
        const params = new URLSearchParams(searchParams);
        params.set('view', value);
        router.replace(`${window.location.pathname}?${params.toString()}`);
    };

    const handleOptimisticStatusChange = async (visitId: string, status: MaintenanceVisit['status']) => {
        await updateMaintenanceVisitStatus(visitId, status);
        toast({ title: "Status Updated", description: `Visit moved to ${status}` });
    };


    if (loading) {
        return <Loading />;
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Maintenance</h1>
                    <p className="text-muted-foreground">
                        Schedule, track, and log all maintenance visits and cases.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <Button onClick={() => setIsScheduleFormOpen(true)} className="w-full sm:w-auto">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Schedule Visit
                    </Button>
                    <Button onClick={() => setIsCrewFormOpen(true)} variant="outline" className="w-full sm:w-auto">
                        <Users className="h-4 w-4 mr-2" />
                        Add Crew
                    </Button>
                </div>
            </div>

            {/* Forms */}
            <ScheduleVisitForm
                isOpen={isScheduleFormOpen}
                onOpenChange={setIsScheduleFormOpen}
                onFormSubmit={handleScheduleSubmit}
            />
            <MaintenanceVisitOutcomeForm
                isOpen={isOutcomeFormOpen}
                onOpenChange={setIsOutcomeFormOpen}
                visit={selectedVisit}
                onFormSubmit={handleOutcomeSubmit}
            />
            <CrewMemberForm
                isOpen={isCrewFormOpen}
                onOpenChange={setIsCrewFormOpen}
                onSubmit={handleCrewSubmit}
                crewMember={selectedCrewMember}
            />
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the maintenance visit record and any related follow-ups.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="w-full justify-start overflow-x-auto h-auto flex flex-nowrap pb-1 no-scrollbar sm:pb-0">
                    <TabsTrigger value="hub">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="list">
                        <ListIcon className="h-4 w-4 mr-2" />
                        Cases
                    </TabsTrigger>
                    <TabsTrigger value="calendar">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Calendar
                    </TabsTrigger>
                    <TabsTrigger value="crew">
                        <Users className="h-4 w-4 mr-2" />
                        Crew
                    </TabsTrigger>
                    <TabsTrigger value="services">
                        <Wrench className="h-4 w-4 mr-2" />
                        Catalog
                    </TabsTrigger>
                </TabsList>

                {/* Operations Hub (New Default) */}
                <TabsContent value="hub" className="mt-6">
                    <ErrorBoundary>
                        <OperationsHub
                            onScheduleVisit={() => setIsScheduleFormOpen(true)}
                            onAddCrew={() => setIsCrewFormOpen(true)}
                            onSelectVisit={handleSelectVisit}
                        />
                    </ErrorBoundary>
                </TabsContent>

                {/* Enhanced Case List / Board View */}
                <TabsContent value="list" className="mt-6">
                    <DelayAnalytics />

                    <CasesFilterBar
                        searchTerm={searchTerm}
                        onSearchChange={handleSearch}
                        selectedStatuses={selectedStatuses}
                        onStatusChange={setSelectedStatuses}
                        viewMode={viewMode}
                        onViewModeChange={handleViewModeChange}
                        statusOptions={statusOptions}
                    />

                    <div className="mt-2">
                        <ErrorBoundary>
                            {viewMode === 'list' && (
                                <div className="flex gap-6">
                                    {/* List (grows when drawer closed) */}
                                    <div className={`flex-1 transition-all ${isDrawerOpen ? 'lg:max-w-[60%]' : ''}`}>
                                        <EnhancedMaintenanceList
                                            visits={filteredVisits} // Use filteredVisits
                                            selectedVisitId={drawerVisit?.id || null}
                                            onSelectVisit={handleSelectVisit}
                                            onEditVisit={openEditOutcomeForm}
                                            onUpdateStatus={updateMaintenanceVisitStatus}
                                            onDeleteVisit={openDeleteDialog}
                                        />
                                    </div>

                                    {/* Detail Drawer */}
                                    <CaseDetailDrawer
                                        visit={drawerVisit}
                                        isOpen={isDrawerOpen}
                                        onClose={handleCloseDrawer}
                                        onEdit={openEditOutcomeForm}
                                        onDelete={openDeleteDialog}
                                        onStatusChange={updateMaintenanceVisitStatus}
                                    />
                                </div>
                            )}

                            {viewMode === 'board' && (
                                <div className="h-[calc(100vh-280px)] overflow-x-auto">
                                    <KanbanBoard
                                        visits={filteredVisits} // Use filteredVisits
                                        onStatusChange={handleOptimisticStatusChange}
                                        onEditVisit={openEditOutcomeForm}
                                        onSelectVisit={handleSelectVisit}
                                    />
                                    <CaseDetailDrawer
                                        visit={drawerVisit}
                                        isOpen={isDrawerOpen}
                                        onClose={handleCloseDrawer}
                                        onEdit={openEditOutcomeForm}
                                        onDelete={openDeleteDialog}
                                        onStatusChange={updateMaintenanceVisitStatus}
                                    />
                                </div>
                            )}

                            {viewMode === 'calendar' && (
                                <MaintenanceCalendar
                                    visits={filteredVisits} // Use filteredVisits
                                    onEditVisit={openEditOutcomeForm}
                                    onUpdateStatus={updateMaintenanceVisitStatus}
                                    onDeleteVisit={openDeleteDialog}
                                />
                            )}
                        </ErrorBoundary>
                    </div>
                </TabsContent>

                {/* Legacy Calendar Tab */}
                <TabsContent value="calendar" className="mt-6">
                    <ErrorBoundary>
                        <MaintenanceCalendar
                            visits={maintenanceVisits}
                            onEditVisit={openEditOutcomeForm}
                            onUpdateStatus={updateMaintenanceVisitStatus}
                            onDeleteVisit={openDeleteDialog}
                        />
                    </ErrorBoundary>
                </TabsContent>

                {/* Crew (Redirect) */}
                <TabsContent value="crew" className="mt-6">
                    {/* Redirects handled by handleTabChange */}
                </TabsContent>

                {/* Services Catalog (redirect) */}
                <TabsContent value="services" className="mt-6">
                </TabsContent>
            </Tabs>
        </div>
    );
}
