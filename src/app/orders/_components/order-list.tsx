
"use client";

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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
    MoreHorizontal,
    XCircle,
    ArrowUp,
    ArrowDown,
    Package,
    CreditCard,
    Calendar,
    User,
    Truck,
    CheckCircle2,
    AlertCircle,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import type { Order, Company } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { cn } from '@/lib/utils';

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
};

interface OrderListProps {
    orders: Order[];
    companies: Company[];
    selectedRowKeys: Set<string>;
    onRowSelectionChange: (id: string, isSelected: boolean) => void;
    onSelectAll: (isSelected: boolean) => void;
    onUpdateStatus: (orderId: string, status: Order['status']) => void;
    onCancelOrder: (order: Order) => void;
    onDeleteOrder: (orderId: string) => void;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

// --- Aesthetic Helpers ---

const StatusIndicator = ({ status }: { status: string }) => {
    let colorClass = "bg-slate-500/20 text-slate-500 border-slate-500/30";
    let icon = <Clock className="w-3 h-3" />;

    // Status Logic - "Command Center" Style
    switch (status) {
        case 'Delivered':
        case 'Paid':
        case 'Completed':
            colorClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
            icon = <CheckCircle2 className="w-3 h-3" />;
            break;
        case 'Processing':
        case 'Shipped':
            colorClass = "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]";
            icon = <Truck className="w-3 h-3" />;
            break;
        case 'Pending':
            colorClass = "bg-amber-500/10 text-amber-500 border-amber-500/20";
            icon = <Clock className="w-3 h-3" />;
            break;
        case 'Cancelled':
            colorClass = "bg-red-500/5 text-red-500/70 border-red-500/10";
            icon = <XCircle className="w-3 h-3" />;
            break;
        case 'Overdue':
        case 'Delivery Failed':
            colorClass = "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]";
            icon = <AlertCircle className="w-3 h-3" />;
            break;
    }

    return (
        <div className={cn("flex items-center gap-2 px-2 py-1 rounded border text-[10px] font-medium uppercase tracking-wider w-fit", colorClass)}>
            {icon}
            <span>{status}</span>
        </div>
    );
};

export function OrderList({
    orders,
    companies,
    selectedRowKeys,
    onRowSelectionChange,
    onSelectAll,
    onUpdateStatus,
    onCancelOrder,
    onDeleteOrder,
    sortConfig,
    onSort,
}: OrderListProps) {
    const router = useRouter();
    const orderStatuses: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered'];

    const getCompanyName = (order: Order): string => {
        if (order.isPotentialClient) {
            return order.temporaryCompanyName || 'Unknown Client';
        }
        const company = companies.find(c => c.id === order.companyId);
        return company?.name || order.companyName || 'Unknown Client';
    };

    if (!sortConfig) {
        return <div>Error: sortConfig missing</div>;
    }

    const renderMobileView = () => (
        <div className="flex flex-col gap-3 md:hidden">
            {orders.map((order) => {
                const companyName = getCompanyName(order);
                const itemsCount = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

                return (
                    <Card key={order.id} className="overflow-hidden border-l-4 border-l-transparent data-[status=Delivered]:border-l-emerald-500 data-[status=Pending]:border-l-amber-500 data-[status=Cancelled]:border-l-red-500" data-status={order.status}>
                        <CardContent className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-0.5">
                                    <DrillTarget kind="order" payload={{ id: order.id }} asChild>
                                        <span className="text-[10px] font-mono text-muted-foreground cursor-pointer">#{order.id.slice(0, 8)}</span>
                                    </DrillTarget>
                                    <DrillTarget kind="company" payload={{ id: order.companyId, name: companyName }} asChild>
                                        <h3 className="font-bold text-base cursor-pointer truncate max-w-[200px]">{companyName}</h3>
                                    </DrillTarget>
                                    {order.isPotentialClient && (
                                        <Badge variant="outline" className="w-fit text-[9px] h-4 mt-1 border-amber-500/40 text-amber-600">Lead</Badge>
                                    )}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>View Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onCancelOrder(order)}>Cancel Order</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground/80 bg-muted/30 p-2 rounded-md border border-border/40">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 opacity-70" />
                                    <span className="font-mono">{format(new Date(order.orderDate), 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 opacity-70" />
                                    <span className="font-mono">{itemsCount} Items</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 opacity-70" />
                                    <span className={cn(
                                        "font-medium",
                                        order.paymentStatus === 'Paid' ? "text-emerald-600" : "text-foreground"
                                    )}>{order.paymentStatus || 'Pending'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/50">
                                <StatusIndicator status={order.status} />
                                <div className="text-right">
                                    <span className="block font-mono font-bold text-lg text-foreground tracking-tight">
                                        {formatCurrency(order.grandTotal || order.total || 0)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );

    const renderDesktopView = () => (
        <div className="rounded-md border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden hidden md:block">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="w-[50px] pl-4">
                            <Checkbox
                                checked={selectedRowKeys.size === orders.length && orders.length > 0}
                                onCheckedChange={(checked) => onSelectAll(!!checked)}
                                className="translate-y-[2px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                        </TableHead>
                        <TableHead className="w-[100px] cursor-pointer hover:text-primary transition-colors text-[10px] uppercase tracking-widest font-semibold" onClick={() => onSort('id')}>
                            <div className="flex items-center gap-1">
                                Order ID
                                {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary transition-colors text-[10px] uppercase tracking-widest font-semibold" onClick={() => onSort('companyName')}>
                            <div className="flex items-center gap-1">
                                Client
                                {sortConfig.key === 'companyName' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary transition-colors text-[10px] uppercase tracking-widest font-semibold" onClick={() => onSort('orderDate')}>
                            <div className="flex items-center gap-1">
                                Date
                                {sortConfig.key === 'orderDate' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="w-[120px] text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">ITEMS</TableHead>
                        <TableHead className="w-[140px] text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">PAYMENT</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary transition-colors text-[10px] uppercase tracking-widest font-semibold" onClick={() => onSort('status')}>
                            <div className="flex items-center gap-1">
                                Status
                                {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary transition-colors text-[10px] uppercase tracking-widest font-semibold" onClick={() => onSort('total')}>
                            <div className="flex items-center justify-end gap-1">
                                Total
                                {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                No orders found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        orders.map((order) => {
                            const companyName = getCompanyName(order);
                            const itemsCount = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
                            const uniqueItems = order.items?.length || 0;

                            return (
                                <TableRow
                                    key={order.id}
                                    className={cn(
                                        "group border-b border-border/40 transition-all duration-200",
                                        selectedRowKeys.has(order.id) ? "bg-primary/5" : "hover:bg-primary/[0.02]"
                                    )}
                                >
                                    <TableCell className="pl-4">
                                        <Checkbox
                                            checked={selectedRowKeys.has(order.id)}
                                            onCheckedChange={(checked) => onRowSelectionChange(order.id, !!checked)}
                                            className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <DrillTarget kind="order" payload={{ id: order.id }} asChild>
                                            <span className="font-mono text-xs text-foreground/80 group-hover:text-primary transition-colors cursor-pointer select-all">
                                                #{order.id.slice(0, 8)}
                                            </span>
                                        </DrillTarget>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <DrillTarget kind="company" payload={{ id: order.companyId, name: companyName }} asChild>
                                                <span className="font-medium text-sm text-foreground/90 group-hover:text-primary transition-colors cursor-pointer truncate max-w-[180px]">
                                                    {companyName}
                                                </span>
                                            </DrillTarget>
                                            {order.isPotentialClient && (
                                                <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold mt-0.5 flex items-center gap-1">
                                                    <User className="w-2.5 h-2.5" /> Lead
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {format(new Date(order.orderDate), 'yyyy-MM-dd')}
                                            </span>
                                            {order.deliveryDate && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                                                    <Truck className="w-3 h-3" />
                                                    <span className="font-mono">{format(new Date(order.deliveryDate), 'MMM d')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                            <Package className="w-3.5 h-3.5 opacity-70" />
                                            <span className="font-mono">{itemsCount} <span className="opacity-50 text-[10px]">({uniqueItems})</span></span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full ring-2 ring-transparent transition-all",
                                                order.paymentStatus === 'Paid' ? "bg-emerald-500 ring-emerald-500/20" :
                                                    order.paymentStatus === 'Overdue' ? "bg-red-500 ring-red-500/20" : "bg-slate-400/50"
                                            )} />
                                            <span className={cn(
                                                "capitalize font-medium",
                                                order.paymentStatus === 'Paid' ? "text-emerald-500" :
                                                    order.paymentStatus === 'Overdue' ? "text-red-500" : "text-muted-foreground"
                                            )}>
                                                {order.paymentStatus || 'Pending'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusIndicator status={order.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            "font-mono font-bold text-sm",
                                            (order.grandTotal || order.total) > 10000 ? "text-emerald-500" : "text-foreground"
                                        )}>
                                            {formatCurrency(order.grandTotal || order.total || 0)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>View Details</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'Pending')}>Mark Pending</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'Processing')}>Mark Processing</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'Shipped')}>Mark Shipped</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'Delivered')}>Mark Delivered</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'Cancelled')}>Mark Cancelled</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => onCancelOrder(order)}>Cancel Order</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => onDeleteOrder(order.id)}>Delete Order</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <>
            {renderMobileView()}
            {renderDesktopView()}
        </>
    )
}
