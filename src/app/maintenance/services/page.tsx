
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Search, ArrowLeft } from 'lucide-react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useRouter } from 'next/navigation';
import { ServicePartFormDialog, CatalogItem } from './_components/service-part-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

export default function ServicesCatalogPage() {
    const { 
        servicesCatalog, 
        partsCatalog, 
        problemsCatalog, 
        addProblem, 
        updateProblem, 
        deleteProblem,
        addService,
        updateService,
        deleteService,
        addPart,
        updatePart,
        deletePart
    } = useMaintenanceStore();
    const router = useRouter();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [partsSearchTerm, setPartsSearchTerm] = useState('');
    const [problemsSearchTerm, setProblemsSearchTerm] = useState('');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [itemType, setItemType] = useState<'service' | 'part'>('service');
    const [isProblemMode, setIsProblemMode] = useState(false);
    
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'service' | 'part' | 'problem', item: CatalogItem } | null>(null);

    const filteredServices = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        if (!searchLower) {
            return Object.entries(servicesCatalog).flatMap(([category, services]) =>
                Object.entries(services).map(([name, cost]) => ({ category, name, cost }))
            );
        }
        return Object.entries(servicesCatalog).flatMap(([category, services]) =>
            Object.entries(services)
                .filter(([name, cost]) => category.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower))
                .map(([name, cost]) => ({ category, name, cost }))
        );
    }, [servicesCatalog, searchTerm]);

    const filteredParts = useMemo(() => {
        const searchLower = partsSearchTerm.toLowerCase();
        if (!searchLower) {
             return Object.entries(partsCatalog).flatMap(([category, parts]) =>
                Object.entries(parts).map(([name, price]) => ({ category, name, price }))
            );
        }
        return Object.entries(partsCatalog).flatMap(([category, parts]) =>
            Object.entries(parts)
                .filter(([name, price]) => category.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower))
                .map(([name, price]) => ({ category, name, price }))
        );
    }, [partsCatalog, partsSearchTerm]);

    const filteredProblems = useMemo(() => {
        const searchLower = problemsSearchTerm.toLowerCase();
        if (!searchLower) {
            return Object.entries(problemsCatalog).flatMap(([category, problems]) =>
                problems.map(problem => ({ category, name: problem }))
            );
        }
        return Object.entries(problemsCatalog).flatMap(([category, problems]) =>
            problems
                .filter(problem => category.toLowerCase().includes(searchLower) || problem.toLowerCase().includes(searchLower))
                .map(problem => ({ category, name: problem }))
        );
    }, [problemsCatalog, problemsSearchTerm]);

    const handleOpenForm = (type: 'service' | 'part' | 'problem', item: CatalogItem | null) => {
        if (type === 'problem') {
            setIsProblemMode(true);
            setItemType('service'); // Use service as fallback
        } else {
            setIsProblemMode(false);
            setItemType(type);
        }
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleFormSubmit = (data: CatalogItem) => {
        if (isProblemMode) {
            if (editingItem) {
                updateProblem(editingItem.category, editingItem.name, data.category, data.name);
            } else {
                addProblem(data.category, data.name);
            }
        } else if (itemType === 'service') {
            if (editingItem) {
                updateService(editingItem.category, editingItem.name, data.category, data.name, data.cost!);
            } else {
                addService(data.category, data.name, data.cost!);
            }
        } else if (itemType === 'part') {
            if (editingItem) {
                updatePart(editingItem.category, editingItem.name, data.category, data.name, data.price!);
            } else {
                addPart(data.category, data.name, data.price!);
            }
        }
        toast({ title: `${isProblemMode ? 'Problem' : itemType === 'service' ? 'Service' : 'Part'} ${editingItem ? 'Updated' : 'Added'}` });
    };

    const openDeleteDialog = (type: 'service' | 'part' | 'problem', item: CatalogItem) => {
        setItemToDelete({ type, item });
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'service') {
            deleteService(itemToDelete.item.category, itemToDelete.item.name);
        } else if (itemToDelete.type === 'part') {
            deletePart(itemToDelete.item.category, itemToDelete.item.name);
        } else if (itemToDelete.type === 'problem') {
            deleteProblem(itemToDelete.item.category, itemToDelete.item.name);
        }
        toast({ title: `${itemToDelete.type === 'problem' ? 'Problem' : itemToDelete.type === 'service' ? 'Service' : 'Part'} Deleted`, variant: 'destructive' });
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
                    <h1 className="text-3xl font-bold">Services & Parts Catalog</h1>
                    <p className="text-muted-foreground">Manage the services and spare parts used in maintenance visits.</p>
                </div>
            </div>
            
            <ServicePartFormDialog 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleFormSubmit}
                item={editingItem}
                itemType={itemType}
                isProblemMode={isProblemMode}
            />

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{itemToDelete?.item.name}" from the catalog. This action cannot be undone.
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
                        <CardTitle>Maintenance Services</CardTitle>
                        <Button size="sm" onClick={() => handleOpenForm('service', null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Service
                        </Button>
                    </div>
                     <div className="relative mt-2">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input placeholder="Search services..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Service Name</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredServices.map(service => (
                                <TableRow key={`${service.category}-${service.name}`}>
                                    <TableCell>{service.category}</TableCell>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell>{service.cost} EGP</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm('service', service)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog('service', service)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Spare Parts</CardTitle>
                        <Button size="sm" onClick={() => handleOpenForm('part', null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Part
                        </Button>
                    </div>
                    <div className="relative mt-2">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input placeholder="Search parts..." className="pl-8" value={partsSearchTerm} onChange={(e) => setPartsSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                 <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Part Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredParts.map(part => (
                                <TableRow key={`${part.category}-${part.name}`}>
                                    <TableCell>{part.category}</TableCell>
                                    <TableCell className="font-medium">{part.name}</TableCell>
                                    <TableCell>${part.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm('part', { ...part, cost: part.price })}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog('part', { ...part, cost: part.price })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Common Problems</CardTitle>
                        <Button size="sm" onClick={() => handleOpenForm('problem', null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Problem
                        </Button>
                    </div>
                    <div className="relative mt-2">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input placeholder="Search problems..." className="pl-8" value={problemsSearchTerm} onChange={(e) => setProblemsSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                 <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Problem Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProblems.map(problem => (
                                <TableRow key={`${problem.category}-${problem.name}`}>
                                    <TableCell>{problem.category}</TableCell>
                                    <TableCell className="font-medium">{problem.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm('problem', problem)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog('problem', problem)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </CardContent>
            </Card>
        </div>
    );
}

    
