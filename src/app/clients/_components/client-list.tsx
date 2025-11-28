"use client";

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Building, GitBranch, MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import type { Company } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PaymentScoreBadge } from '@/components/payment-score-badge';
import { Checkbox } from '@/components/ui/checkbox';

interface ListItem extends Company {
  depth: number;
}

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

export function ClientList({ items, allCompanies, onEdit, onDelete, selectedIds, onSelect, onSelectAll, sortConfig, onSort, typeFilter }: ClientListProps) {
    
    // Logic to render a single item, used by both card and table views
    const renderItemContent = (item: ListItem) => {
        const isParent = !item.isBranch;
        const parentName = item.isBranch && item.parentCompanyId ? allCompanies.find(p => p.id === item.parentCompanyId)?.name : '';
        const viewLink = `/clients/${item.parentCompanyId ? `${item.parentCompanyId}/` : ''}${item.id}`;

        const dropdownMenu = (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                        <Link href={viewLink}>View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

        return { isParent, parentName, viewLink, dropdownMenu };
    };

    // Mobile-first card view
    const renderMobileView = () => (
        <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.length > 0 ? items.map(item => {
                const { isParent, parentName, viewLink, dropdownMenu } = renderItemContent(item);
                return (
                    <Card key={item.id}>
                        <CardContent className="p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3 flex-1">
                                    <Checkbox 
                                        checked={selectedIds.has(item.id)}
                                        onCheckedChange={(checked) => onSelect(item.id, checked as boolean)}
                                    />
                                    <Link href={viewLink} className="flex-1">
                                        <div className="flex items-center gap-2">
                                            {isParent ? <Building className="h-4 w-4 text-muted-foreground" /> : <GitBranch className="h-4 w-4 text-muted-foreground" />}
                                            <p className="font-semibold">{item.name}</p>
                                        </div>
                                    </Link>
                                </div>
                                <div className="-mr-2 -mt-2">
                                    {dropdownMenu}
                                </div>
                            </div>
                            {isParent && item.industry ? (
                                <p className="text-sm text-muted-foreground">{item.industry}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground">Branch of {parentName}</p>
                            )}
                        </CardContent>
                    </Card>
                );
            }) : <p className="text-center text-muted-foreground py-10 md:hidden">No results found.</p>}
        </div>
    );

    // Desktop table view
    const renderDesktopView = () => (
        <Card className="hidden md:block">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <Checkbox 
                                checked={items.length > 0 && items.every(i => selectedIds.has(i.id))}
                                onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                            />
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => onSort('name')}>
                            <div className="flex items-center gap-2">
                                Name
                                {sortConfig.key === 'name' && (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => onSort('isBranch')}>
                             <div className="flex items-center gap-2">
                                Type
                                {sortConfig.key === 'isBranch' && (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => onSort('currentPaymentScore')}>
                            <div className="flex items-center gap-2">
                                {typeFilter === 'Branch' ? 'Parent Company' : 'Payment'}
                                {sortConfig.key === 'currentPaymentScore' && (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 text-right" onClick={() => onSort('last12MonthsRevenue')}>
                            <div className="flex items-center justify-end gap-2">
                                Revenue (12m)
                                {sortConfig.key === 'last12MonthsRevenue' && (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length > 0 ? items.map(item => {
                         const { isParent, parentName, dropdownMenu } = renderItemContent(item);
                         return (
                            <TableRow key={item.id} className={cn(item.isBranch && "bg-muted/50")}>
                                <TableCell>
                                    <Checkbox 
                                        checked={selectedIds.has(item.id)}
                                        onCheckedChange={(checked) => onSelect(item.id, checked as boolean)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div style={{ paddingLeft: `${item.depth * 1.5}rem` }} className="flex items-center gap-2">
                                        {!isParent && <GitBranch className="h-4 w-4 text-muted-foreground ml-2" />}
                                        <span className={cn(isParent && "font-bold")}>{item.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {isParent ? <Building className="h-4 w-4 text-muted-foreground" /> : <GitBranch className="h-4 w-4 text-muted-foreground" />}
                                        <span className="capitalize">{isParent ? 'Company' : 'Branch'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {isParent ? (
                                        item.currentPaymentScore !== undefined ? (
                                            <PaymentScoreBadge score={item.currentPaymentScore} status={item.paymentStatus} />
                                        ) : null
                                    ) : (
                                        <span className="text-muted-foreground">{parentName}</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {item.last12MonthsRevenue ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.last12MonthsRevenue) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    {dropdownMenu}
                                </TableCell>
                            </TableRow>
                         );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">No results found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    );

    return (
        <>
            {renderMobileView()}
            {renderDesktopView()}
        </>
    );
}