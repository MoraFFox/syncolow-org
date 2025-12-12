
"use client"

import { useMemo, useState } from "react";
import { useOrderStore } from "@/store/use-order-store";
import { useCompanyStore } from "@/store/use-company-store";
import { parse, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { SortableTableHeader } from './sortable-table-header';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CustomerReportProps {
    dateRange: { from: string; to: string };
}

import { DrillTarget } from '@/components/drilldown/drill-target';

export function CustomerReport({ dateRange }: CustomerReportProps) {
    const { companies } = useCompanyStore();
    const { analyticsOrders } = useOrderStore();
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'totalRevenue', direction: 'desc' });
    const [visibleCount, setVisibleCount] = useState(10);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const customerAnalytics = useMemo(() => {
        if (!companies) return [];

        const fromDate = parse(dateRange.from, 'yyyy-MM-dd', new Date());
        const toDate = parse(dateRange.to, 'yyyy-MM-dd', new Date());
        const start = startOfDay(fromDate);
        const end = endOfDay(toDate);

        const result = companies.map(company => {
            const clientOrders = analyticsOrders.filter(o =>
                o.companyId === company.id &&
                o.status !== 'Cancelled' &&
                isWithinInterval(new Date(o.orderDate), { start, end })
            );
            const totalRevenue = clientOrders.reduce((sum, order) => sum + order.total, 0);

            const allClientOrders = analyticsOrders.filter(o => o.companyId === company.id && o.status !== 'Cancelled');
            const clv = allClientOrders.reduce((sum, order) => sum + order.total, 0);

            const paymentStatus = clientOrders.some(o => o.paymentStatus === 'Overdue') ? 'Overdue'
                : clientOrders.some(o => o.paymentStatus === 'Pending') ? 'Pending'
                    : 'Paid';

            return {
                id: company.id,
                name: company.name,
                totalRevenue,
                totalOrders: clientOrders.length,
                clv,
                paymentStatus
            }
        }).filter(c => c.totalOrders > 0);

        if (sortConfig) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];
                const modifier = sortConfig.direction === 'asc' ? 1 : -1;
                return aVal < bVal ? -modifier : aVal > bVal ? modifier : 0;
            });
        }

        return result.slice(0, 20);
    }, [companies, analyticsOrders, dateRange, sortConfig]);

    const visibleCustomerAnalytics = useMemo(() => {
        return customerAnalytics.slice(0, visibleCount);
    }, [customerAnalytics, visibleCount]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const handleLoadMore = () => {
        setIsLoadingMore(true);
        setTimeout(() => {
            setVisibleCount(prev => prev + 10);
            setIsLoadingMore(false);
        }, 500); // Simulate network delay
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Paid': return 'default';
            case 'Pending': return 'secondary';
            case 'Overdue': return 'destructive';
            default: return 'outline';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Customer Report</CardTitle>
                <CardDescription>
                    Your top customers by total revenue.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Mobile View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {visibleCustomerAnalytics.map(client => (
                        <DrillTarget key={client.id} kind="company" payload={{ id: client.id, name: client.name, status: client.paymentStatus }} asChild>
                            <Link href={`/clients/${client.id}`}>
                                <Card>
                                    <CardContent className="p-4 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold">{client.name}</p>
                                            <Badge variant={getStatusVariant(client.paymentStatus)}>{client.paymentStatus}</Badge>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-sm text-muted-foreground">{client.totalOrders} Orders • CLV: ${client.clv.toFixed(2)}</p>
                                                <p className="text-lg font-bold">${client.totalRevenue.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </DrillTarget>
                    ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <SortableTableHeader label="Client" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                                <SortableTableHeader label="Revenue" sortKey="totalRevenue" currentSort={sortConfig} onSort={handleSort} className="text-right" />
                                <SortableTableHeader label="Orders" sortKey="totalOrders" currentSort={sortConfig} onSort={handleSort} className="text-right" />
                                <SortableTableHeader label="CLV" sortKey="clv" currentSort={sortConfig} onSort={handleSort} className="text-right" />
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleCustomerAnalytics.map((client) => (
                                <DrillTarget
                                    key={client.id}
                                    kind="company"
                                    payload={{ id: client.id, name: client.name, status: client.paymentStatus }}
                                    asChild
                                >
                                    <TableRow
                                        className="cursor-pointer hover:bg-muted/50"
                                    >
                                        <TableCell className="font-medium">
                                            {client.name}
                                        </TableCell>
                                        <TableCell className="text-right">${client.totalRevenue.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{client.totalOrders}</TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-muted-foreground">${client.clv.toFixed(2)}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={getStatusVariant(client.paymentStatus)}>{client.paymentStatus}</Badge>
                                        </TableCell>
                                    </TableRow>
                                </DrillTarget>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {visibleCount < customerAnalytics.length && (
                    <div className="mt-4 flex justify-center">
                        <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                            {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Load More
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
