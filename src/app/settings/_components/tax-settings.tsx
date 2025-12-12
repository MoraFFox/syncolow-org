
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { useTaxesStore } from '@/store/use-taxes-store';
import { TaxFormDialog } from './tax-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import type { Tax } from '@/lib/types';

export function TaxSettings() {
    const { taxes, addTax, updateTax, deleteTax } = useTaxesStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Tax | null>(null);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Tax | null>(null);

    const filteredTaxes = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        if (!taxes) return []; // Ensure taxes is not undefined
        if (!searchLower) return taxes;
        return taxes.filter(tax => tax.name.toLowerCase().includes(searchLower));
    }, [taxes, searchTerm]);

    const handleOpenForm = (item: Tax | null) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<Tax, 'id'>) => {
        if (editingItem) {
            await updateTax(editingItem.id, data);
            toast({ title: 'Tax Rate Updated' });
        } else {
            await addTax(data);
            toast({ title: 'Tax Rate Added' });
        }
    };

    const openDeleteDialog = (item: Tax) => {
        setItemToDelete(item);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        await deleteTax(itemToDelete.id);
        toast({ title: 'Tax Rate Deleted', variant: 'destructive' });
        setItemToDelete(null);
        setIsAlertOpen(false);
    };

    return (
        <>
            <TaxFormDialog
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
                            This will permanently delete the "{itemToDelete?.name}" tax rate. This action cannot be undone.
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
                        <CardTitle>Manage Taxes</CardTitle>
                        <Button size="sm" onClick={() => handleOpenForm(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Tax
                        </Button>
                    </div>
                    <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search taxes..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tax Name</TableHead>
                                <TableHead>Rate (%)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTaxes.map(tax => (
                                <TableRow key={tax.id}>
                                    <TableCell className="font-medium">{tax.name}</TableCell>
                                    <TableCell>{tax.rate}%</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(tax)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(tax)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredTaxes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">No tax rates found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
