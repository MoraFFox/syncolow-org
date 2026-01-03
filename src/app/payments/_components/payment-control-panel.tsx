"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Download, CheckCircle2, Filter, ChevronsUpDown, Check, RefreshCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";

interface PaymentControlPanelProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    statusFilter: "all" | "pending" | "overdue";
    onStatusFilterChange: (status: "all" | "pending" | "overdue") => void;
    companyFilter: string;
    onCompanyFilterChange: (companyId: string) => void;
    companies: Company[];
    selectedCount: number;
    onBulkMarkAsPaid: () => void;
    onExport: () => void;
}

export function PaymentControlPanel({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    companyFilter,
    onCompanyFilterChange,
    companies,
    selectedCount,
    onBulkMarkAsPaid,
    onExport,
}: PaymentControlPanelProps) {
    const [companyOpen, setCompanyOpen] = useState(false);

    // Get the display name for the selected company
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
                {/* Left Group: Search & Primary Filters */}
                <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 flex-1">
                    <div className="relative group w-full sm:max-w-[320px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <Input
                            placeholder="Search invoices, companies..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9 bg-muted/40 border-muted-foreground/20 focus:bg-background transition-all"
                        />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                            <SelectTrigger className="w-[140px] bg-muted/40 border-muted-foreground/20">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-3.5 w-3.5" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Virtualized Company Combobox using Popover + Command */}
                        <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={companyOpen}
                                    className="w-[200px] justify-between bg-muted/40 border-muted-foreground/20"
                                >
                                    <span className="truncate">{selectedCompanyName}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0" align="start">
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
                    </div>
                </div>

                {/* Right Group: Actions */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                    {selectedCount > 0 && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <Button
                                onClick={onBulkMarkAsPaid}
                                variant="default"
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Pay Selected ({selectedCount})
                            </Button>
                        </motion.div>
                    )}

                    <Button variant="outline" onClick={onExport} className="gap-2 border-muted-foreground/20">
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
