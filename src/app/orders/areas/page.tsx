"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, ArrowLeft, LayoutGrid, List as ListIcon, BarChart3, RefreshCw } from 'lucide-react';
import { useCompanyStore } from '@/store/use-company-store';
import { useRouter } from 'next/navigation';
import { AreaFormDialog } from './_components/area-form-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import type { DeliveryArea } from '@/lib/types';
import { AreaGridView } from './_components/area-grid-view';
import { AreaListView } from './_components/area-list-view';
import { AreaAnalyticsView } from './_components/area-analytics-view';
import { getAreaStats, AreaStats } from '@/app/actions/orders/get-area-stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AreasPage() {
    const { areas: storeAreas, addArea, updateArea, deleteArea, fetchRevenueStats } = useCompanyStore();
    const router = useRouter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'analytics'>('grid');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DeliveryArea | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<DeliveryArea | null>(null);

    // Stats State
    const [areaStats, setAreaStats] = useState<AreaStats[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    // Fetch stats on mount
    const loadStats = async () => {
        setIsLoadingStats(true);
        const { data, error } = await getAreaStats();
        if (data) {
            setAreaStats(data);
        } else {
            console.error(error);
            toast({ title: "Failed to load area statistics", variant: "destructive" });
        }
        setIsLoadingStats(false);
    };

    useEffect(() => {
        loadStats();
    }, []);

    // Initial load from store fallback if needed
    // But storeAreas is synced with DB rows. 
    // areaStats is the server-side aggregation.
    // We should merge them because storeAreas might be more up to date if user just added one (optimistic update).
    // Or we simply rely on areaStats and refresh it on mutations.

    // Merge strategy: Use storeAreas as source of truth for "Existence" and "Schedule",
    // Use areaStats for "Metrics".
    const mergedAreas: AreaStats[] = useMemo(() => {
        return storeAreas.map(storeArea => {
            const stat = areaStats.find(s => s.id === storeArea.id) || areaStats.find(s => s.name === storeArea.name);
            return {
                ...storeArea,
                totalRevenue: stat?.totalRevenue || 0,
                totalOrders: stat?.totalOrders || 0,
                activeClients: stat?.activeClients || 0,
                averageOrderValue: stat?.averageOrderValue || 0,
            };
        });
    }, [storeAreas, areaStats]);


    const filteredAreas = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        if (!searchLower) return mergedAreas;
        return mergedAreas.filter(area => area.name.toLowerCase().includes(searchLower));
    }, [mergedAreas, searchTerm]);

    const handleOpenForm = (item: DeliveryArea | null) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<DeliveryArea, 'id'>) => {
        try {
            if (editingItem) {
                await updateArea(editingItem.id, data);
                toast({ title: 'Area Updated' });
            } else {
                await addArea(data);
                toast({ title: 'Area Added' });
            }
            // Refresh stats to reflect name changes or new empty area
            loadStats();
        } catch (error) {
            console.error(error);
        }
    };

    const openDeleteDialog = (item: DeliveryArea) => {
        setItemToDelete(item);
        setIsAlertOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        await deleteArea(itemToDelete.id);
        setItemToDelete(null);
        setIsAlertOpen(false);
        // Refresh stats
        loadStats();
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2 rounded-full hover:bg-muted/50" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                            Delivery Command
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Operational control for delivery zones and logistics.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoadingStats}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
                        Refresh Stats
                    </Button>
                    <Button onClick={() => handleOpenForm(null)} className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Area
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 my-4 border-b p-4 border-white/5 transition-all">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <Input
                        placeholder="Search areas..."
                        className="pl-10 bg-muted/20 border-muted/40 focus:bg-background transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/20">
                        <TabsTrigger value="grid" className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                            <LayoutGrid className="mr-2 h-4 w-4" /> Grid
                        </TabsTrigger>
                        <TabsTrigger value="list" className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                            <ListIcon className="mr-2 h-4 w-4" /> List
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            <div className="min-h-[400px] mt-8">
                {viewMode === 'grid' && (
                    <AreaGridView
                        areas={filteredAreas}
                        onEdit={handleOpenForm}
                        onDelete={openDeleteDialog}
                    />
                )}

                {viewMode === 'list' && (
                    <AreaListView
                        areas={filteredAreas}
                        onEdit={handleOpenForm}
                        onDelete={openDeleteDialog}
                    />
                )}

                {viewMode === 'analytics' && (
                    <AreaAnalyticsView areas={filteredAreas} />
                )}
            </div>

            {/* Dialogs */}
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
        </div>
    );
}
