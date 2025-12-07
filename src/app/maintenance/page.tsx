
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Calendar as CalendarIcon, List, Users, Wrench } from 'lucide-react';
import Loading from '../loading';
import { ScheduleVisitForm } from './_components/schedule-visit-form';
import { MaintenanceVisitOutcomeForm } from './_components/maintenance-visit-form';
import { MaintenanceCalendar } from './_components/maintenance-calendar';
import { MaintenanceList } from './_components/maintenance-list';
import { CrewList } from './_components/crew-list';
import { CrewMemberForm } from './_components/crew-member-form';
import { DelayAnalytics } from './_components/delay-analytics';
import type { MaintenanceVisit, MaintenanceEmployee } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOrderStore } from '@/store/use-order-store';
import { ErrorBoundary } from '@/components/error-boundary';


export default function MaintenancePage() {
    const {
        maintenanceVisits,
        maintenanceEmployees,
        loading,
        addMaintenanceVisit,
        updateMaintenanceVisit,
        updateMaintenanceVisitStatus,
        deleteMaintenanceVisit,
        addMaintenanceEmployee,
        updateMaintenanceEmployee,
        searchMaintenanceVisits,
    } = useMaintenanceStore();

    const { fetchInitialData } = useOrderStore();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTabFromUrl = searchParams.get('tab') || 'list';

    const [activeTab, setActiveTab] = useState(activeTabFromUrl);

    useEffect(() => {
        setActiveTab(activeTabFromUrl);
    }, [activeTabFromUrl]);

    const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
    const [isOutcomeFormOpen, setIsOutcomeFormOpen] = useState(false);
    const [isCrewFormOpen, setIsCrewFormOpen] = useState(false);

    const [selectedVisit, setSelectedVisit] = useState<MaintenanceVisit | null>(null);
    const [selectedCrewMember, setSelectedCrewMember] = useState<MaintenanceEmployee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [visitToDelete, setVisitToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const debouncedSearch = useDebouncedCallback(async (term: string) => {
        if (!term.trim()) {
            setIsSearching(false);
            setIsLoadingSearch(false);
            await fetchInitialData();
            return;
        }
        setIsLoadingSearch(true);
        setIsSearching(true);
        await searchMaintenanceVisits(term);
        setIsLoadingSearch(false);
    }, 500);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        if (term.trim()) {
            setIsLoadingSearch(true);
        }
        debouncedSearch(term);
    };

    const handleScheduleSubmit = async (visit: Omit<MaintenanceVisit, 'id'>) => {
        await addMaintenanceVisit(visit);
        setIsScheduleFormOpen(false);
    };

    const handleOutcomeSubmit = async (visitId: string, data: Partial<MaintenanceVisit>) => {
        await updateMaintenanceVisit(visitId, data);
        setIsOutcomeFormOpen(false);
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

    const openEditCrewForm = (member: MaintenanceEmployee) => {
        setSelectedCrewMember(member);
        setIsCrewFormOpen(true);
    };

    const openDeleteDialog = (visitId: string) => {
        setVisitToDelete(visitId);
        setIsAlertOpen(true);
    }

    const handleDeleteConfirm = async () => {
        if (visitToDelete) {
            await deleteMaintenanceVisit(visitToDelete);
            toast({ title: "Visit Deleted" });
        }
        setIsAlertOpen(false);
        setVisitToDelete(null);
    }

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (value === 'services') {
            router.push('/maintenance/services');
        } else {
            router.push(`/maintenance?tab=${value}`);
        }
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Maintenance</h1>
                    <p className="text-muted-foreground">
                        Schedule, track, and log all maintenance visits and cases.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
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

            <Tabs value={activeTab} onValueChange={handleTabChange} >
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="list"><List className="h-4 w-4 mr-2" /> Case List</TabsTrigger>
                    <TabsTrigger value="calendar"><CalendarIcon className="h-4 w-4 mr-2" /> Calendar</TabsTrigger>
                    <TabsTrigger value="crew"><Users className="h-4 w-4 mr-2" /> Crew</TabsTrigger>
                    <TabsTrigger value="services"><Wrench className="h-4 w-4 mr-2" /> Services Catalog</TabsTrigger>
                </TabsList>
                <TabsContent value="list" className="mt-6">
                    <DelayAnalytics />
                    <div className="relative mt-6">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by client, technician, or notes..."
                            className="pl-8 pr-10"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {isLoadingSearch && isSearching && (
                            <div className='absolute right-2.5 top-2.5'>
                                <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                            </div>
                        )}
                    </div>
                    <div className="mt-6">
                        <ErrorBoundary>
                            <MaintenanceList
                                visits={maintenanceVisits}
                                onEditVisit={openEditOutcomeForm}
                                onUpdateStatus={updateMaintenanceVisitStatus}
                                onDeleteVisit={openDeleteDialog}
                            />
                        </ErrorBoundary>
                    </div>
                </TabsContent>
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
                <TabsContent value="crew" className="mt-6">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by name, email, or phone..."
                            className="pl-8 pr-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="mt-6">
                        <ErrorBoundary>
                            <CrewList searchTerm={searchTerm} onEdit={openEditCrewForm} />
                        </ErrorBoundary>
                    </div>
                </TabsContent>
                <TabsContent value="services" className="mt-6">
                    {/* This tab is now a link, content is in services/page.tsx */}
                </TabsContent>
            </Tabs>
        </div>
    );
}
