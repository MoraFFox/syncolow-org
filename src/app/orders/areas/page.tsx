
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Search, ArrowLeft } from 'lucide-react';
import { useCompanyStore } from '@/store/use-company-store';
import { useRouter } from 'next/navigation';
import { AreaFormDialog } from './_components/area-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import type { DeliveryArea } from '@/lib/types';

export default function AreasPage() {
    const { areas, addArea, updateArea, deleteArea } = useCompanyStore();
    const router = useRouter();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DeliveryArea | null>(null);
    
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<DeliveryArea | null>(null);

    const filteredAreas = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        if (!searchLower) return areas;
        return areas.filter(area => area.name.toLowerCase().includes(searchLower));
    }, [areas, searchTerm]);

    const handleOpenForm = (item: DeliveryArea | null) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleFormSubmit = (data: Omit<DeliveryArea, 'id'>) => {
        if (editingItem) {
            updateArea(editingItem.id, data);
            toast({ title: 'Area Updated' });
        } else {
            addArea(data);
            toast({ title: 'Area Added' });
        }
    };

    const openDeleteDialog = (item: DeliveryArea) => {
        setItemToDelete(item);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!itemToDelete) return;
        deleteArea(itemToDelete.id);
        setItemToDelete(null);
        setIsAlertOpen(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Delivery Areas</h1>
                    <p className="text-muted-foreground">Manage the delivery areas and their associated schedules.</p>
                </div>
            </div>
            
            <AreaFormDialog 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleFormSubmit}
                item={editingItem}
            />

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{itemToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Manage Areas</CardTitle>
                        <Button size="sm" onClick={() => handleOpenForm(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Area
                        </Button>
                    </div>
                     <div className="relative mt-2">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input placeholder="Search areas..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Area Name</TableHead>
                                <TableHead>Delivery Schedule</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAreas.map(area => (
                                <TableRow key={area.id}>
                                    <TableCell className="font-medium">{area.name}</TableCell>
                                    <TableCell>Schedule {area.deliverySchedule}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(area)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(area)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {filteredAreas.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">No areas found.</TableCell>
                                </TableRow>
                             )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
