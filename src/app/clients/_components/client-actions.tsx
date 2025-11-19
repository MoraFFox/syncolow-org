
"use client";

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Search, Upload } from 'lucide-react';

interface ClientActionsProps {
    searchTerm: string;
    typeFilter: string;
    onSearchChange: (value: string) => void;
    onTypeFilterChange: (value: string) => void;
    onAddCompany: () => void;
    onImport: () => void;
}

export function ClientActions({
    searchTerm,
    typeFilter,
    onSearchChange,
    onTypeFilterChange,
    onAddCompany,
    onImport,
}: ClientActionsProps) {
    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Companies & Branches</h1>
                    <p className="text-muted-foreground">Manage your parent companies and their individual branches.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button onClick={onAddCompany} className="w-full sm:w-auto">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Company
                    </Button>
                    <Button variant="outline" onClick={onImport} className="w-full sm:w-auto">
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
                    />
                </div>
                <Select value={typeFilter} onValueChange={onTypeFilterChange}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Types</SelectItem>
                        <SelectItem value="Company">Companies Only</SelectItem>
                        <SelectItem value="Branch">Branches Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    )
}
