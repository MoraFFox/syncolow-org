"use client";

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Calendar as CalendarIcon,
    List as ListIcon,
    Kanban as KanbanIcon
} from 'lucide-react';

interface CasesFilterBarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedStatuses: string[];
    onStatusChange: (statuses: string[]) => void;
    viewMode: 'list' | 'board' | 'calendar';
    onViewModeChange: (mode: 'list' | 'board' | 'calendar') => void;
    statusOptions: string[];
}

export function CasesFilterBar({
    searchTerm,
    onSearchChange,
    selectedStatuses,
    onStatusChange,
    viewMode,
    onViewModeChange,
    statusOptions
}: CasesFilterBarProps) {

    const handleStatusToggle = (status: string) => {
        if (selectedStatuses.includes(status)) {
            onStatusChange(selectedStatuses.filter(s => s !== status));
        } else {
            onStatusChange([...selectedStatuses, status]);
        }
    };

    const clearFilters = () => {
        onStatusChange([]);
        onSearchChange('');
    };

    const hasActiveFilters = selectedStatuses.length > 0 || searchTerm.length > 0;

    return (
        <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">

                {/* Left Side: Search & Filters */}
                <div className="flex flex-1 w-full gap-2 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search cases..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 border-dashed">
                                <Filter className="mr-2 h-4 w-4" />
                                Status
                                {selectedStatuses.length > 0 && (
                                    <>
                                        <Separator orientation="vertical" className="mx-2 h-4" />
                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                            {selectedStatuses.length}
                                        </Badge>
                                        <div className="hidden space-x-1 lg:flex">
                                            {selectedStatuses.length > 2 ? (
                                                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                                    {selectedStatuses.length} selected
                                                </Badge>
                                            ) : (
                                                selectedStatuses.map((option) => (
                                                    <Badge
                                                        key={option}
                                                        variant="secondary"
                                                        className="rounded-sm px-1 font-normal"
                                                    >
                                                        {option}
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {statusOptions.map((status) => (
                                <DropdownMenuCheckboxItem
                                    key={status}
                                    checked={selectedStatuses.includes(status)}
                                    onCheckedChange={() => handleStatusToggle(status)}
                                >
                                    {status}
                                </DropdownMenuCheckboxItem>
                            ))}
                            {selectedStatuses.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem
                                        checked={false}
                                        onCheckedChange={() => onStatusChange([])}
                                        className="justify-center text-center"
                                    >
                                        Clear filters
                                    </DropdownMenuCheckboxItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="h-8 px-2 lg:px-3"
                        >
                            Reset
                            <X className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Right Side: View Toggle */}
                <ToggleGroup type="single" value={viewMode} onValueChange={(val) => val && onViewModeChange(val as any)}>
                    <ToggleGroupItem value="list" aria-label="List View">
                        <ListIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="board" aria-label="Board View">
                        <KanbanIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="calendar" aria-label="Calendar View">
                        <CalendarIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
        </div>
    );
}
