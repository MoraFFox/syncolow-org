"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { TechnicianCard } from './_components/technician-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import { CrewMemberForm } from '../_components/crew-member-form';
import { MaintenanceEmployee } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isSameDay, subDays, isAfter } from 'date-fns';
import Loading from '../../loading';
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

export default function TechniciansPage() {
    const router = useRouter();
    const {
        maintenanceEmployees,
        maintenanceVisits,
        loading,
        fetchInitialData,
        addMaintenanceEmployee,
        updateMaintenanceEmployee,
        deleteMaintenanceEmployee
    } = useMaintenanceStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [isCrewFormOpen, setIsCrewFormOpen] = useState(false);
    const [selectedCrewMember, setSelectedCrewMember] = useState<MaintenanceEmployee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<MaintenanceEmployee | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const filteredEmployees = useMemo(() => {
        if (!searchTerm) return maintenanceEmployees;
        return maintenanceEmployees.filter(emp =>
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.phone.includes(searchTerm)
        );
    }, [maintenanceEmployees, searchTerm]);

    // Helper to get visits for a specific employee
    const getEmployeeVisits = (employeeName: string) => {
        return maintenanceVisits.filter(v => v.technicianName === employeeName);
    };

    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);

    const handleCrewSubmit = async (data: Omit<MaintenanceEmployee, 'id' | 'email'>) => {
        if (selectedCrewMember) {
            await updateMaintenanceEmployee(selectedCrewMember.id, data);
        } else {
            await addMaintenanceEmployee(data);
        }
        setIsCrewFormOpen(false);
        setSelectedCrewMember(null);
    };

    const handleCardClick = (employee: MaintenanceEmployee) => {
        router.push(`/maintenance/crew/${employee.id}`);
    };

    const handleOpenDeleteDialog = (employee: MaintenanceEmployee) => {
        setEmployeeToDelete(employee);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (employeeToDelete) {
            await deleteMaintenanceEmployee(employeeToDelete.id);
            setIsDeleteDialogOpen(false);
            setEmployeeToDelete(null);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/maintenance" className="text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Technician Roster</h1>
                    </div>
                    <p className="text-muted-foreground ml-6">
                        Manage crew members, track performance, and monitor workloads.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => setIsCrewFormOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Crew
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEmployees.map((employee) => {
                    const employeeVisits = getEmployeeVisits(employee.name);

                    // Active: In Progress or Scheduled for Today+
                    const activeVisits = employeeVisits.filter(v =>
                        v.status === 'In Progress' ||
                        (v.status === 'Scheduled' && v.date && isSameDay(new Date(v.date), today))
                    );

                    const historyVisits = employeeVisits.filter(v =>
                        v.status === 'Completed' &&
                        v.resolutionDate &&
                        isAfter(new Date(v.resolutionDate), thirtyDaysAgo)
                    );

                    return (
                        <TechnicianCard
                            key={employee.id}
                            employee={employee}
                            activeVisits={activeVisits}
                            completedVisitsLast30Days={historyVisits}
                            onClick={() => handleCardClick(employee)}
                            onDelete={handleOpenDeleteDialog}
                        />
                    );
                })}

                {filteredEmployees.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        No technicians found matching your search.
                    </div>
                )}
            </div>

            <CrewMemberForm
                isOpen={isCrewFormOpen}
                onOpenChange={setIsCrewFormOpen}
                onSubmit={handleCrewSubmit}
                crewMember={selectedCrewMember}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Crew Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{employeeToDelete?.name}</strong> from the roster? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
