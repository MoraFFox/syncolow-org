"use client";

import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
    Building,
    GitBranch,
    MoreHorizontal,
    ArrowUp,
    ArrowDown,
    MapPin,
    Phone,
    Mail,
    TrendingUp,
    AlertCircle,
    CornerDownRight
} from 'lucide-react';
import type { Company, ListItem } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { PaymentScoreBadge } from '@/components/payment-score-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { motion } from 'framer-motion';

interface ClientListProps {
    items: ListItem[];
    allCompanies: Company[];
    onEdit: (company: Company) => void;
    onDelete: (company: Company) => void;
    selectedIds: Set<string>;
    onSelect: (id: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    typeFilter: string;
}

// Simplified animation variants for better performance
const rowVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1
    }
};

export function ClientList({ items, allCompanies, onEdit, onDelete, selectedIds, onSelect, onSelectAll, sortConfig, onSort, typeFilter }: ClientListProps) {

    // Desktop View: Grid Layout Headers
    const renderDesktopHeader = () => (
        <div className="hidden md:grid grid-cols-[40px_2fr_1.5fr_100px] gap-8 px-8 py-4 bg-background/90 backdrop-blur-md border-b border-border/20 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/80 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center">
                <Checkbox
                    aria-label="Select all clients"
                    checked={items.length > 0 && items.every(i => selectedIds.has(i.id))}
                    onCheckedChange={(checked) => onSelectAll(checked === true)}
                />
            </div>
            <button
                className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 rounded"
                onClick={() => onSort('name')}
                aria-label="Sort by client name"
                aria-sort={sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
                Client Information
                {sortConfig.key === 'name' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                )}
            </button>
            <button
                className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 rounded"
                onClick={() => onSort('currentPaymentScore')}
                aria-label="Sort by status and financial data"
                aria-sort={sortConfig.key === 'currentPaymentScore' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
                Status & Financials
                {sortConfig.key === 'currentPaymentScore' && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                )}
            </button>
            <div className="text-right">Actions</div>
        </div>
    );

    // Desktop View: Grid Layout Row
    const renderDesktopRow = (item: ListItem, index: number) => {
        const isParent = !item.isBranch;
        const parentName = item.isBranch && item.parentCompanyId ? allCompanies.find(p => p.id === item.parentCompanyId)?.name : '';
        const hasBalance = (item.totalOutstandingAmount || 0) > 0;

        return (
            <motion.div
                key={item.id}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                variants={rowVariants}
                className={cn(
                    "hidden md:grid grid-cols-[40px_2fr_1.5fr_100px] gap-8 px-8 py-6 items-center border-b border-border/10 hover:bg-primary/[0.02] hover:border-primary/10 transition-all duration-300 group relative",
                    item.isBranch && "bg-muted/[0.02]"
                )}
            >
                {/* Active Selection Indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Checkbox */}
                <div className="flex items-center">
                    <Checkbox
                        aria-label={`Select client: ${item.name}`}
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => onSelect(item.id, checked === true)}
                    />
                </div>

                {/* Client Information - Combined Name, Hierarchy, Industry */}
                <div className="flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-3">
                        {item.isBranch && (
                            <div className="flex items-center self-stretch py-1">
                                <div className="w-3 h-3 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-sm" />
                            </div>
                        )}
                        <div className={cn(
                            "flex items-center gap-2 truncate",
                            !isParent && "text-muted-foreground text-sm"
                        )}>
                            {!item.isBranch ? (
                                <div className="p-1 rounded bg-emerald-500/10 text-emerald-500 shrink-0">
                                    <Building className="h-3.5 w-3.5" />
                                </div>
                            ) : null}
                            <DrillTarget kind="company" payload={{ id: item.id, name: item.name }} asChild>
                                <span className={cn(
                                    "truncate cursor-pointer hover:text-primary transition-colors tracking-tight",
                                    isParent ? "font-semibold text-base text-foreground" : "font-medium"
                                )}>
                                    {item.name}
                                </span>
                            </DrillTarget>
                        </div>
                    </div>
                    {item.industry && isParent && (
                        <div className="flex items-center gap-2 mt-1 ml-7">
                            <span className="text-xs uppercase text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded font-mono tracking-wider border border-white/10">
                                {item.industry}
                            </span>
                        </div>
                    )}
                </div>

                {/* Status & Financials - Combined Location, Payment Status, Financial Data */}
                <div className="flex flex-col justify-center text-sm space-y-2">
                    {/* Location */}
                    <div className="flex items-center gap-2 text-muted-foreground/70">
                        <MapPin className="h-3.5 w-3.5 opacity-60" />
                        <span className="truncate text-xs">{item.location || `Region ${item.region}`}</span>
                    </div>

                    {/* Hierarchy Info */}
                    <div className="text-xs text-muted-foreground">
                        {item.isBranch ? (
                            <div className="flex items-center gap-1">
                                <span className="opacity-50">Branch of</span>
                                {item.parentCompanyId ? (
                                    <DrillTarget kind="company" payload={{ id: item.parentCompanyId, name: parentName || 'Parent' }} asChild>
                                        <span className="font-medium hover:text-primary cursor-pointer transition-colors">{parentName || 'Unknown'}</span>
                                    </DrillTarget>
                                ) : (
                                    <span>{parentName}</span>
                                )}
                            </div>
                        ) : (
                            <span className="uppercase tracking-widest opacity-60 font-semibold">Headquarters</span>
                        )}
                    </div>

                    {/* Payment Status & Financials */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {item.currentPaymentScore !== undefined ? (
                                <PaymentScoreBadge score={item.currentPaymentScore} status={item.paymentStatus} />
                            ) : (
                                <span className="text-muted-foreground text-xs italic opacity-50">N/A</span>
                            )}
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                                <span className="font-mono text-xs tracking-tight font-medium opacity-90">{item.last12MonthsRevenue ? formatCurrency(item.last12MonthsRevenue) : '-'}</span>
                                {item.last12MonthsRevenue ? <TrendingUp className="h-3 w-3 text-emerald-500 opacity-80" /> : null}
                            </div>
                            {hasBalance && (
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-200/50 dark:border-amber-500/20 mt-2">
                                    <AlertCircle className="h-3 w-3" />
                                    <span className="font-mono">{formatCurrency(item.totalOutstandingAmount || 0)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label={`Actions for ${item.name}`}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/clients/${item.parentCompanyId ? `${item.parentCompanyId}/` : ''}${item.id}`} className="cursor-pointer flex items-center">
                                    <Building className="mr-2 h-4 w-4" /> View Details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(item)} className="cursor-pointer flex items-center">
                                <GitBranch className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {item.email && (
                                <DropdownMenuItem asChild>
                                    <a href={`mailto:${item.email}`} className="cursor-pointer flex items-center">
                                        <Mail className="mr-2 h-4 w-4" /> Email
                                    </a>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive cursor-pointer flex items-center">
                                <span className="mr-2">🗑️</span> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </motion.div>
        );
    };

    // Mobile-first card view (Optimized for reuse)
    const renderMobileView = () => (
        <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.length > 0 ? items.map((item, index) => {
                const isParent = !item.isBranch;
                const parentName = item.isBranch && item.parentCompanyId ? allCompanies.find(p => p.id === item.parentCompanyId)?.name : '';
                return (
                    <motion.div
                        key={item.id}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        variants={rowVariants}
                    >
                        <Card>
                            <CardContent className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                        <Checkbox
                                            aria-label={`Select client: ${item.name}`}
                                            checked={selectedIds.has(item.id)}
                                            onCheckedChange={(checked) => onSelect(item.id, checked === true)}
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                {isParent ? <Building className="h-4 w-4 text-emerald-500" /> : <GitBranch className="h-4 w-4 text-muted-foreground" />}
                                                <DrillTarget kind="company" payload={{ id: item.id, name: item.name }} asChild>
                                                    <p className="font-semibold cursor-pointer truncate">{item.name}</p>
                                                </DrillTarget>
                                            </div>
                                            {item.isBranch ? (
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <CornerDownRight className="h-3 w-3" />
                                                    Branch of <span className="font-medium text-foreground">{parentName}</span>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground uppercase">{item.industry}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Simple Actions Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 -mr-2"
                                                aria-label={`Actions for ${item.name}`}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/clients/${item.parentCompanyId ? `${item.parentCompanyId}/` : ''}${item.id}`}>View Details</Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-1">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground uppercase">Revenue</span>
                                        <span className="font-mono text-sm">{formatCurrency(item.last12MonthsRevenue || 0)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-muted-foreground uppercase">Score</span>
                                        {item.currentPaymentScore !== undefined ? (
                                            <PaymentScoreBadge score={item.currentPaymentScore} status={item.paymentStatus} size={28} />
                                        ) : '-'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            }) : <p className="text-center text-muted-foreground py-10">No results found.</p>}
        </div>
    );

    return (
        <div className="w-full">
            {renderMobileView()}

            {/* Desktop Container */}
            <div className="hidden md:block rounded-xl border border-border/50 bg-card/30 overflow-hidden shadow-sm">
                {renderDesktopHeader()}
                <div className="divide-y divide-border/20">
                    {items.length > 0 ? items.map((item, index) => renderDesktopRow(item, index)) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Building className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground">No clients found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}