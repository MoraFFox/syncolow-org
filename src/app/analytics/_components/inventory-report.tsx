"use client"

import { useMemo, useState } from "react";
import { useOrderStore } from "@/store/use-order-store";
import { useProductsStore } from "@/store/use-products-store";
import { useSalesAccountStore } from "@/store/use-sales-account-store";
import { parse, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Input } from "@/components/ui/input";
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
import Image from "next/image";
import { Loader2 } from 'lucide-react';

interface InventoryReportProps {
    dateRange: { from: string; to: string };
    selectedAccountId?: string;
}

import { DrillTarget } from '@/components/drilldown/drill-target';

export function InventoryReport({ dateRange, selectedAccountId }: InventoryReportProps) {
    const { analyticsOrders } = useOrderStore();
    const { products } = useProductsStore();
    const { accounts } = useSalesAccountStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [visibleCount, setVisibleCount] = useState(10);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const inventoryData = useMemo(() => {
        const fromDate = parse(dateRange.from, 'yyyy-MM-dd', new Date());
        const toDate = parse(dateRange.to, 'yyyy-MM-dd', new Date());
        const start = startOfDay(fromDate);
        const end = endOfDay(toDate);

        let orders = analyticsOrders.filter(o =>
            o.status !== 'Cancelled' &&
            isWithinInterval(new Date(o.orderDate), { start, end })
        );

        // Apply Account Filter
        if (selectedAccountId && selectedAccountId !== 'all') {
            const minAccount = accounts.find(a => a.id === selectedAccountId);
            if (minAccount) {
                orders = orders.filter(o => {
                    const accCode = o.customerAccount;
                    return accCode ? minAccount.codes.some(c => accCode.toString().trim().startsWith(c)) : false;
                });
            }
        }

        const productSales = new Map<string, number>();
        orders.forEach(order => {
            order.items.forEach(item => {
                const current = productSales.get(item.productId) || 0;
                productSales.set(item.productId, current + item.quantity);
            });
        });

        const productsWithMetrics = products.map(p => {
            const unitsSold = productSales.get(p.id) || 0;
            const avgStock = (p.stock + unitsSold) / 2;
            const turnoverRate = avgStock > 0 ? unitsSold / avgStock : 0;

            return {
                ...p,
                unitsSold,
                turnoverRate
            };
        });

        let filtered = productsWithMetrics.filter(p => p.stock < 10 || p.unitsSold > 0);

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof typeof a] as any;
                const bVal = b[sortConfig.key as keyof typeof b] as any;
                const modifier = sortConfig.direction === 'asc' ? 1 : -1;

                const valA = aVal ?? (typeof aVal === 'number' ? 0 : '');
                const valB = bVal ?? (typeof bVal === 'number' ? 0 : '');

                if (valA < valB) return -1 * modifier;
                if (valA > valB) return 1 * modifier;
                return 0;
            });
        } else {
            filtered.sort((a, b) => a.stock - b.stock);
        }

        return filtered;
    }, [products, analyticsOrders, dateRange, searchTerm, sortConfig, selectedAccountId, accounts]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const handleLoadMore = () => {
        setIsLoadingMore(true);
        setTimeout(() => {
            setVisibleCount(prev => prev + 10);
            setIsLoadingMore(false);
        }, 500); // Simulate network delay
    };

    const visibleInventoryData = useMemo(() => {
        return inventoryData.slice(0, visibleCount);
    }, [inventoryData, visibleCount]);

    return (
        <Card className="bg-zinc-950/50 backdrop-blur-sm border-zinc-800">
            <CardHeader>
                <div className="flex flex-col gap-4">
                    <div>
                        <CardTitle className="text-zinc-200 font-mono font-bold uppercase tracking-tight">Inventory Report</CardTitle>
                        <CardDescription className="text-zinc-500 font-mono text-xs">
                            Low stock alerts & movement velocity
                        </CardDescription>
                    </div>
                    <Input
                        placeholder="SEARCH ASSETS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 font-mono text-sm"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {/* Mobile View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {visibleInventoryData.map((product) => (
                        <Card key={product.id} className="bg-zinc-900/50 border-zinc-800">
                            <CardContent className="p-4 flex gap-4">
                                <DrillTarget kind="product" payload={{ id: product.id, name: product.name, stock: product.stock }} asChild>
                                    <Image
                                        src={product.imageUrl || "https://placehold.co/100x100.png"}
                                        alt={product.name}
                                        width={80}
                                        height={80}
                                        className="rounded-md object-cover border border-zinc-700"
                                        data-ai-hint={product.hint}
                                    />
                                </DrillTarget>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <DrillTarget kind="product" payload={{ id: product.id, name: product.name, stock: product.stock }} asChild>
                                            <p className="font-semibold cursor-pointer text-zinc-200">{product.name}</p>
                                        </DrillTarget>
                                        <Badge variant="destructive" className="mt-1">{product.stock} in stock</Badge>
                                    </div>
                                    <div className="mt-2 flex">
                                        <Button variant="outline" size="sm" asChild className="w-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
                                            <Link href={`/products/${product.id}`}>Reorder</Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-zinc-800">
                                <SortableTableHeader label="PRODUCT" sortKey="name" currentSort={sortConfig} onSort={handleSort} className="text-zinc-500 font-mono text-xs font-normal" />
                                <SortableTableHeader label="STOCK" sortKey="stock" currentSort={sortConfig} onSort={handleSort} className="text-right text-zinc-500 font-mono text-xs font-normal" />
                                <SortableTableHeader label="SOLD" sortKey="unitsSold" currentSort={sortConfig} onSort={handleSort} className="text-right text-zinc-500 font-mono text-xs font-normal" />
                                <SortableTableHeader label="TURNOVER" sortKey="turnoverRate" currentSort={sortConfig} onSort={handleSort} className="text-right text-zinc-500 font-mono text-xs font-normal" />
                                <TableHead className="text-right text-zinc-500 font-mono text-xs font-normal">ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleInventoryData.map((product) => (
                                <DrillTarget
                                    key={product.id}
                                    kind="product"
                                    payload={{ id: product.id, name: product.name, stock: product.stock }}
                                    asChild
                                >
                                    <TableRow
                                        className="cursor-pointer hover:bg-zinc-900/50 border-zinc-800/50 transition-colors"
                                    >
                                        <TableCell className="font-medium text-zinc-300 font-mono text-sm">{product.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={product.stock < 10 ? "destructive" : "secondary"} className="font-mono">{product.stock}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-zinc-400 font-mono">{product.unitsSold}</TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-zinc-500 font-mono">{product.turnoverRate.toFixed(2)}x</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()} className="h-7 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs">
                                                <Link href={`/products/${product.id}`}>VIEW</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </DrillTarget>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {visibleCount < inventoryData.length && (
                    <div className="mt-4 flex justify-center">
                        <Button onClick={handleLoadMore} disabled={isLoadingMore} variant="ghost" className="text-emerald-500 hover:text-emerald-400 font-mono hover:bg-emerald-500/10">
                            {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            [LOAD MORE ASSETS]
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
