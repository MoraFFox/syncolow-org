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
import { Building, GitBranch, MoreHorizontal } from 'lucide-react';
import type { Company } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PaymentScoreBadge } from '@/components/payment-score-badge';

interface ListItem extends Company {
  depth: number;
}

interface ClientListProps {
    items: ListItem[];
    allCompanies: Company[];
    onEdit: (company: Company) => void;
    onDelete: (company: Company) => void;
}

export function ClientList({ items, allCompanies, onEdit, onDelete }: ClientListProps) {
    
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
                                <Link href={viewLink} className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {isParent ? <Building className="h-4 w-4 text-muted-foreground" /> : <GitBranch className="h-4 w-4 text-muted-foreground" />}
                                        <p className="font-semibold">{item.name}</p>
                                    </div>
                                </Link>
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
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length > 0 ? items.map(item => {
                         const { isParent, parentName, dropdownMenu } = renderItemContent(item);
                         return (
                            <TableRow key={item.id} className={cn(item.isBranch && "bg-muted/50")}>
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
                                    {isParent && item.industry ? item.industry : <span className="text-muted-foreground">Part of {parentName}</span>}
                                </TableCell>
                                <TableCell>
                                    {isParent && item.currentPaymentScore !== undefined ? (
                                        <PaymentScoreBadge score={item.currentPaymentScore} status={item.paymentStatus} />
                                    ) : null}
                                </TableCell>
                                <TableCell className="text-right">
                                    {dropdownMenu}
                                </TableCell>
                            </TableRow>
                         );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">No results found.</TableCell>
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