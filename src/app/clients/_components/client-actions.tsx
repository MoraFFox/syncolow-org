
"use client";

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutGrid, List, MoreHorizontal, PlusCircle, Search, Upload } from 'lucide-react';

interface ClientActionsProps {
    searchTerm: string;
    typeFilter: string;
    viewMode: 'list' | 'grid';
    onSearchChange: (value: string) => void;
    onTypeFilterChange: (value: string) => void;
    onViewModeChange: (mode: 'list' | 'grid') => void;
    onAddCompany: () => void;
    onImport: () => void;
}

export function ClientActions({
    searchTerm,
    typeFilter,
    viewMode,
    onSearchChange,
    onTypeFilterChange,
    onViewModeChange,
    onAddCompany,
    onImport,
}: ClientActionsProps) {
    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Companies & Branches</h1>
                    <p className="text-muted-foreground">Manage your parent companies and their individual branches.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button onClick={onAddCompany} className="w-full sm:w-auto hover:shadow-md active:scale-95 transition-all duration-150">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Company
                    </Button>
                    <Button variant="outline" onClick={onImport} className="w-full sm:w-auto hover:bg-primary/5 hover:border-primary/30 active:scale-95 transition-all duration-150">
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by company, branch, or industry..."
                        className="pl-8 pr-10"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        aria-label="Search companies"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                        <SelectTrigger className="w-full md:w-[180px]" aria-label="Filter by company type">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Types</SelectItem>
                            <SelectItem value="Company">Companies Only</SelectItem>
                            <SelectItem value="Branch">Branches Only</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center border rounded-md bg-background">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-9 w-9 px-2 rounded-r-none border-r hover:bg-primary/5 transition-all duration-150 active:scale-95"
                            onClick={() => onViewModeChange('list')}
                            title="List View"
                            aria-label="Switch to list view"
                            aria-pressed={viewMode === 'list'}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-9 w-9 px-2 rounded-l-none hover:bg-primary/5 transition-all duration-150 active:scale-95"
                            onClick={() => onViewModeChange('grid')}
                            title="Grid View"
                            aria-label="Switch to grid view"
                            aria-pressed={viewMode === 'grid'}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
