

"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, ArrowLeft, Wrench, Box, AlertTriangle } from 'lucide-react';
import { useMaintenanceStore } from '@/store/use-maintenance-store';
import { useRouter } from 'next/navigation';

import { ServicePartFormDialog, CatalogItem } from './_components/service-part-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useCatalogUsageStats } from './_hooks/use-catalog-usage-stats';
import { ResourceCard } from './_components/resource-card';
import type { ServiceCatalogItem, PartsCatalogItem, ProblemsCatalogItem } from '@/app/actions/maintenance';

type ResourceItem = ServiceCatalogItem | PartsCatalogItem | ProblemsCatalogItem;

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
    const [activeTab, setActiveTab] = useState("services");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [itemType, setItemType] = useState<'service' | 'part'>('service');
    const [isProblemMode, setIsProblemMode] = useState(false);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'service' | 'part' | 'problem', item: ResourceItem } | null>(null);

    // Usage Stats
    const stats = useCatalogUsageStats();

    const filteredServices = useMemo(() => {
        if (!Array.isArray(servicesCatalog)) return [];
        const searchLower = searchTerm.toLowerCase();
        if (!searchLower) return [...servicesCatalog];
        return servicesCatalog.filter(s =>
            (s.category || '').toLowerCase().includes(searchLower) || (s.name || '').toLowerCase().includes(searchLower)
        );
    }, [servicesCatalog, searchTerm]);

    const filteredParts = useMemo(() => {
        if (!Array.isArray(partsCatalog)) return [];
        const searchLower = searchTerm.toLowerCase();
        if (!searchLower) return [...partsCatalog];
        return partsCatalog.filter(p =>
            (p.category || '').toLowerCase().includes(searchLower) || (p.name || '').toLowerCase().includes(searchLower)
        );
    }, [partsCatalog, searchTerm]);

    const filteredProblems = useMemo(() => {
        if (!Array.isArray(problemsCatalog)) return [];
        const searchLower = searchTerm.toLowerCase();
        // Problems are filtered directly (ResourceItem type)
        if (!searchLower) return [...problemsCatalog];
        return problemsCatalog.filter(p => (p.category || '').toLowerCase().includes(searchLower) || (p.problem || '').toLowerCase().includes(searchLower));
    }, [problemsCatalog, searchTerm]);

    const handleOpenForm = (type: 'service' | 'part' | 'problem', item: ResourceItem | null) => {
        let formItem: CatalogItem | null = null;

        if (item) {
            if (type === 'problem') {
                const p = item as ProblemsCatalogItem;
                formItem = { id: p.id, category: p.category || '', name: p.problem || '' };
            } else if (type === 'service') {
                const s = item as ServiceCatalogItem;
                formItem = { id: s.id, category: s.category || '', name: s.name || '', cost: s.defaultCost };
            } else if (type === 'part') {
                const p = item as PartsCatalogItem;
                formItem = { id: p.id, category: p.category || '', name: p.name || '', price: p.defaultPrice };
            }
        }

        if (type === 'problem') {
            setIsProblemMode(true);
            setItemType('service');
        } else {
            setIsProblemMode(false);
            setItemType(type as 'service' | 'part');
        }
        setEditingItem(formItem);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: CatalogItem) => {
        if (isProblemMode) {
            if (editingItem && editingItem.id) {
                await updateProblem(editingItem.id, { category: data.category, problem: data.name });
            } else {
                await addProblem(data.category, data.name);
            }
        } else if (itemType === 'service') {
            if (editingItem && editingItem.id) {
                await updateService(editingItem.id, { category: data.category, name: data.name, defaultCost: data.cost });
            } else {
                await addService(data.category, data.name, data.cost!);
            }
        } else if (itemType === 'part') {
            if (editingItem && editingItem.id) {
                await updatePart(editingItem.id, { category: data.category, name: data.name, defaultPrice: data.price });
            } else {
                await addPart(data.category, data.name, data.price!);
            }
        }
        toast({ title: `${isProblemMode ? 'Problem' : itemType === 'service' ? 'Service' : 'Part'} ${editingItem ? 'Updated' : 'Added'}` });
    };


    const openDeleteDialog = (type: 'service' | 'part' | 'problem', item: ResourceItem) => {
        setItemToDelete({ type, item });
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete || !itemToDelete.item.id) return;
        const id = itemToDelete.item.id;

        if (itemToDelete.type === 'service') {
            await deleteService(id);
        } else if (itemToDelete.type === 'part') {
            await deletePart(id);
        } else if (itemToDelete.type === 'problem') {
            await deleteProblem(id);
        }
        toast({ title: `${itemToDelete.type === 'problem' ? 'Problem' : itemToDelete.type === 'service' ? 'Service' : 'Part'} Deleted`, variant: 'destructive' });
        setItemToDelete(null);
        setIsAlertOpen(false);
    };

    // Helper to get stats safely
    // The hook calculates stats keyed by Name (because historical visits don't always store the Catalog ID).
    // So we must look up by name to find the match.
    const getStats = (id: string, name: string, type: 'service' | 'part' | 'problem') => {
        const statsMap = type === 'service'
            ? stats.serviceStats
            : type === 'part'
                ? stats.partStats
                : stats.problemStats;
        // Try exact name match first (most likely), then ID as fallback
        return statsMap[name] || statsMap[id];
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Resource Catalog</h1>
                        <p className="text-muted-foreground">Master inventory of services, parts, and issue types.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search catalog..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
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
                            This will permanently delete "{itemToDelete?.type === 'problem' ? (itemToDelete?.item as any)?.problem : (itemToDelete?.item as any)?.name}" from the catalog.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="services" className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" /> Services
                            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                {filteredServices.length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="parts" className="flex items-center gap-2">
                            <Box className="h-4 w-4" /> Parts
                            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                {filteredParts.length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="problems" className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Problems
                            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                {filteredProblems.length}
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    <Button
                        onClick={() => handleOpenForm(activeTab === 'problems' ? 'problem' : activeTab === 'parts' ? 'part' : 'service', null)}
                        className="hidden sm:flex"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add {activeTab === 'problems' ? 'Problem' : activeTab === 'parts' ? 'Part' : 'Service'}
                    </Button>
                </div>

                {/* Mobile Add Button - FAB style or sticky bottom if needed, but for now just relying on top button visibility logic or adding one here if needed for mobile */}
                <div className="sm:hidden mb-4">
                    <Button
                        className="w-full"
                        onClick={() => handleOpenForm(activeTab === 'problems' ? 'problem' : activeTab === 'parts' ? 'part' : 'service', null)}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add {activeTab === 'problems' ? 'Problem' : activeTab === 'parts' ? 'Part' : 'Service'}
                    </Button>
                </div>

                <TabsContent value="services" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredServices.map(service => (
                            <ResourceCard
                                key={service.id}
                                type="service"
                                data={service}
                                stats={getStats(service.id, service.name, 'service')}
                                onEdit={handleOpenForm}
                                onDelete={openDeleteDialog}
                            />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="parts" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredParts.map(part => (
                            <ResourceCard
                                key={part.id}
                                type="part"
                                data={part}
                                stats={getStats(part.id, part.name, 'part')}
                                onEdit={handleOpenForm}
                                onDelete={openDeleteDialog}
                            />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="problems" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProblems.map(problem => (
                            <ResourceCard
                                key={problem.id}
                                type="problem"
                                data={problem}
                                stats={getStats(problem.id, problem.problem, 'problem')}
                                onEdit={handleOpenForm}
                                onDelete={openDeleteDialog}
                            />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}



