
"use client";

import { useMemo, useState } from 'react';
import { useCompanyStore } from '@/store/use-company-store';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Star, Edit, HardHat, GitBranch } from 'lucide-react';
import type { Barista } from '@/lib/types';
import { BaristaForm } from './barista-form';
import { Input } from '@/components/ui/input';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import Link from 'next/link';

interface BaristaManagementProps {
    companyId: string;
    branchId: string | null;
    showAllForCompany?: boolean;
}

const getEvaluationRating = (evaluation: string | undefined) => {
    switch (evaluation) {
        case 'Excellent': return 5;
        case 'Good': return 4;
        case 'Average': return 3;
        case 'Poor': return 2;
        default: return 0;
    }
};

export function BaristaManagement({ companyId, branchId, showAllForCompany = false }: BaristaManagementProps) {
    const { baristas, addBarista, updateBarista, companies } = useCompanyStore();
    const { maintenanceVisits } = useMaintenanceStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedBarista, setSelectedBarista] = useState<Barista | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const companyBranches = useMemo(() => companies.filter(c => c.isBranch && c.parentCompanyId === companyId), [companies, companyId]);

    const baristasWithMetrics = useMemo(() => {
        return baristas
            .filter(barista => {
                 const finalBranchId = branchId || companyId;
                 const branchBelongsToCompany = companyBranches.some(b => b.id === barista.branchId) || barista.branchId === companyId;

                if (showAllForCompany) {
                    if (!branchBelongsToCompany) return false;
                } else {
                    if (barista.branchId !== finalBranchId) return false;
                }

                if (searchTerm && !barista.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                
                return true;
            })
            .map(barista => {
                const visits = maintenanceVisits.filter(v => v.baristaId === barista.id);
                const attendedVisits = visits.length;
                let averageRating = 0;
                if (attendedVisits > 0) {
                    const totalRating = visits.reduce((sum, visit) => sum + getEvaluationRating(visit.overallReport), 0);
                    averageRating = totalRating / attendedVisits;
                }
                const branchName = companies.find(c => c.id === barista.branchId)?.name || 'Unknown';
                return {
                    ...barista,
                    attendedVisits,
                    averageRating,
                    branchName,
                };
            });
    }, [baristas, searchTerm, branchId, companyId, showAllForCompany, maintenanceVisits, companies, companyBranches]);
    
    const handleOpenForm = (barista: Barista | null) => {
        setSelectedBarista(barista);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Partial<Omit<Barista, 'id'>>) => {
        if (selectedBarista) {
            await updateBarista(selectedBarista.id, data);
        } else {
            const finalBranchId = branchId || companyId;
            await addBarista(companyId, finalBranchId, data as Omit<Barista, 'id' | 'branchId'>);
        }
        setIsFormOpen(false);
        setSelectedBarista(null);
    };
    
    const renderRating = (rating: number) => (
        <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
            <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
    
    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold">Barista Team</h3>
                    <p className="text-muted-foreground">Manage baristas for {showAllForCompany ? 'the entire company' : 'this location'}.</p>
                </div>
                 <Button onClick={() => handleOpenForm(null)} className="w-full md:w-auto">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Barista
                </Button>
            </div>
            
            <BaristaForm 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleFormSubmit}
                barista={selectedBarista}
            />

            <div className="flex flex-col md:flex-row gap-4">
                <Input 
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                />
            </div>

            <Card>
                <CardContent className="p-0">
                    {/* Mobile View */}
                    <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                        {baristasWithMetrics.map(barista => (
                            <Card key={barista.id}>
                                <CardContent className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <Link href={`/baristas/${barista.id}`} className="font-semibold hover:underline">{barista.name}</Link>
                                            <p className="text-sm text-muted-foreground">{barista.phoneNumber}</p>
                                            {showAllForCompany && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <GitBranch className="h-3 w-3" />
                                                    <span>{barista.branchName}</span>
                                                </div>
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(barista)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="space-y-1">
                                            <p className="font-medium">Overall Rating</p>
                                            {renderRating(barista.rating)}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Avg. Visit Rating</p>
                                            {renderRating(barista.averageRating)}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Visits Attended</p>
                                            <div className="flex items-center gap-1">
                                                <HardHat className="h-4 w-4 text-muted-foreground" />
                                                <span>{barista.attendedVisits}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground italic">"{barista.notes}"</p>
                                </CardContent>
                            </Card>
                        ))}
                        {baristasWithMetrics.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-4">No baristas found.</p>
                        )}
                    </div>
                    {/* Desktop View */}
                    <div className="hidden md:block border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    {showAllForCompany && <TableHead>Branch</TableHead>}
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Overall Rating</TableHead>
                                    <TableHead>Visits Attended</TableHead>
                                    <TableHead>Avg. Visit Rating</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {baristasWithMetrics.map(barista => (
                                    <TableRow key={barista.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/baristas/${barista.id}`} className="hover:underline">{barista.name}</Link>
                                        </TableCell>
                                        {showAllForCompany && <TableCell>{barista.branchName}</TableCell>}
                                        <TableCell>{barista.phoneNumber}</TableCell>
                                        <TableCell>{renderRating(barista.rating)}</TableCell>
                                        <TableCell>{barista.attendedVisits}</TableCell>
                                        <TableCell>{renderRating(barista.averageRating)}</TableCell>
                                        <TableCell className="truncate max-w-[200px]">{barista.notes}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenForm(barista)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {baristasWithMetrics.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={showAllForCompany ? 8 : 7} className="text-center h-24">No baristas found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
