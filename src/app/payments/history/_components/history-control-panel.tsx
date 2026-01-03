"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Download, Filter, ChevronsUpDown, Check, RefreshCcw, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";

interface HistoryControlPanelProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    companyFilter: string;
    onCompanyFilterChange: (companyId: string) => void;
    companies: Company[];
    dateFrom: Date | undefined;
    onDateFromChange: (date: Date | undefined) => void;
    dateTo: Date | undefined;
    onDateToChange: (date: Date | undefined) => void;
    onExport: () => void;
    totalRecords: number;
}

export function HistoryControlPanel({
    searchTerm,
    onSearchChange,
    companyFilter,
    onCompanyFilterChange,
    companies,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    onExport,
    totalRecords
}: HistoryControlPanelProps) {
    const [companyOpen, setCompanyOpen] = useState(false);

    const selectedCompanyName = useMemo(() => {
        if (companyFilter === "all") return "All Companies";
        const found = companies.find(c => c.id === companyFilter);
        return found?.name || "Select company...";
    }, [companyFilter, companies]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-0 z-30 mb-6"
        >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/40 -mx-6 px-6 py-4 shadow-sm" />

            <div className="relative flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between py-2">
                {/* Left Group: Search & Filters */}
                <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 flex-1">
                    {/* Search */}
                    <div className="relative group w-full sm:max-w-[320px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <Input
                            placeholder="Search records, ref codes..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9 bg-muted/40 border-muted-foreground/20 focus:bg-background transition-all"
                        />
                    </div>

                    {/* Company Filter */}
                    <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={companyOpen}
                                className="w-full sm:w-[200px] justify-between bg-muted/40 border-muted-foreground/20"
                            >
                                <span className="truncate">{selectedCompanyName}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search companies..." />
                                <CommandList>
                                    <CommandEmpty>No company found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="all"
                                            onSelect={() => {
                                                onCompanyFilterChange("all");
                                                setCompanyOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    companyFilter === "all" ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            All Companies
                                        </CommandItem>
                                        {companies.map((company) => (
                                            <CommandItem
                                                key={company.id}
                                                value={company.name}
                                                onSelect={() => {
                                                    onCompanyFilterChange(company.id);
                                                    setCompanyOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        companyFilter === company.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {company.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {/* Date Filters */}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full sm:w-[150px] justify-start text-left font-normal bg-muted/40 border-muted-foreground/20",
                                        !dateFrom && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateFrom ? format(dateFrom, "MMM d, yyyy") : <span>From Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateFrom}
                                    onSelect={onDateFromChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full sm:w-[150px] justify-start text-left font-normal bg-muted/40 border-muted-foreground/20",
                                        !dateTo && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateTo ? format(dateTo, "MMM d, yyyy") : <span>To Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateTo}
                                    onSelect={onDateToChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Right Group: Actions */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                    <div className="text-xs text-muted-foreground mr-2 hidden sm:block font-mono">
                        {totalRecords} RECORDS FOUND
                    </div>
                    <Button variant="outline" onClick={onExport} className="gap-2 border-muted-foreground/20">
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
