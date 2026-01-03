"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { format, isToday, isYesterday } from "date-fns";
import type { Order, Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
    MapPin,
    Calendar,
    Truck,
    CreditCard,
    AlertTriangle,
    XCircle,
    UserPlus,
    Clock,
    MoreHorizontal,
    Box,
    ChevronDown,
    ChevronRight,
    CalendarDays,
    Package
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface OrderGridProps {
    orders: Order[];
    companies: Company[];
    onUpdateStatus: (orderId: string, status: Order["status"]) => void;
    onCancelOrder: (order: Order) => void;
    onDeleteOrder: (orderId: string) => void;
}

interface CriticalFlag {
    label: string;
    variant: "destructive" | "outline" | "secondary";
    icon: React.ReactNode;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

const getCompanyName = (order: Order, companies: Company[]): string => {
    if (order.isPotentialClient) {
        return order.temporaryCompanyName || "Unknown Client";
    }
    const company = companies.find((c) => c.id === order.companyId);
    return company?.name || order.companyName || "Unknown Client";
};

const getCriticalFlags = (order: Order): CriticalFlag[] => {
    const flags: CriticalFlag[] = [];
    if (order.daysOverdue && order.daysOverdue > 0) {
        flags.push({ label: `${order.daysOverdue}d Overdue`, variant: "destructive", icon: <Clock className="h-3 w-3" /> });
    }
    if (order.paymentStatus === "Overdue") {
        flags.push({ label: "Overdue", variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> });
    }
    if (order.status === "Cancelled") {
        flags.push({ label: "Cancelled", variant: "destructive", icon: <XCircle className="h-3 w-3" /> });
    }
    if (order.isPotentialClient) {
        flags.push({ label: "Lead", variant: "outline", icon: <UserPlus className="h-3 w-3" /> });
    }
    return flags;
};

// Map internal abstract variants to ShadCN Badge variants + className overrides
const getBadgeStyles = (status: string) => {
    switch (status) {
        case "Delivered":
        case "Paid":
        case "Completed":
            return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]";
        case "Processing":
        case "Shipped":
            return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]";
        case "Pending":
            return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
        case "Cancelled":
            return "bg-red-500/5 text-red-500/70 border-red-500/10";
        case "Overdue":
            return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]";
        default:
            return "bg-muted text-muted-foreground border-border";
    }
};


interface OrderCardProps {
    order: Order;
    companies: Company[];
    onUpdateStatus: (orderId: string, status: Order["status"]) => void;
    onCancelOrder: (order: Order) => void;
    onDeleteOrder: (orderId: string) => void;
}

const ORDER_STATUSES: Order["status"][] = ["Pending", "Processing", "Shipped", "Delivered"];

function OrderCard({
    order,
    companies,
    onUpdateStatus,
    onCancelOrder,
    onDeleteOrder,
}: OrderCardProps) {
    const router = useRouter();
    const companyName = getCompanyName(order, companies);
    const initials = getInitials(companyName);
    const criticalFlags = getCriticalFlags(order);
    const orderTotal = order.grandTotal || order.total || 0;
    const itemsCount = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

    return (
        <DrillTarget kind="order" payload={{ id: order.id }} asChild ariaLabel={`View order ${order.id}`}>
            <Card className="group flex flex-col h-full overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 border-border/40 bg-card/40 backdrop-blur-sm relative">
                {/* Top Indicator Line */}
                <div className={cn("absolute top-0 left-0 right-0 h-1 z-10",
                    order.status === 'Delivered' ? "bg-emerald-500" :
                        order.status === 'Processing' || order.status === 'Shipped' ? "bg-blue-500" :
                            order.status === 'Cancelled' ? "bg-red-500" : "bg-amber-500"
                )} />

                <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3 min-w-0 pr-8">
                        <Avatar className="h-9 w-9 border border-border/50 rounded-md">
                            <AvatarFallback className="text-[10px] font-mono font-bold text-muted-foreground">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <DrillTarget kind="company" payload={{ id: order.companyId, name: companyName }} asChild>
                                <p className="font-bold text-sm truncate hover:text-primary transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                    {companyName}
                                </p>
                            </DrillTarget>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 py-0.5 rounded">#{order.id.slice(0, 7)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-4 right-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>View Details</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {ORDER_STATUSES.map((status) => (
                                    <DropdownMenuItem key={status} onClick={() => onUpdateStatus(order.id, status)} disabled={order.status === status}>
                                        Mark as {status}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onCancelOrder(order)}>Cancel Order</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => onDeleteOrder(order.id)}>Delete Order</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 flex-1 flex flex-col gap-4">
                    {/* Status & Flags Row */}
                    <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 h-auto", getBadgeStyles(order.status))}>
                            {order.status}
                        </Badge>
                        {criticalFlags.length > 0 && (
                            <div className="flex gap-1">
                                {criticalFlags.map((flag, i) => (
                                    <div key={i} title={flag.label} className={cn("p-1 rounded bg-muted text-muted-foreground", flag.variant === 'destructive' && "text-red-500 bg-red-500/10")}>
                                        {flag.icon}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Metrics */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-md border border-border/30">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Total</span>
                            <span className="text-lg font-mono font-bold">{formatCurrency(orderTotal)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider text-right">Items</span>
                            <span className="text-sm font-mono font-medium flex items-center gap-1.5 mt-1">
                                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                {itemsCount}
                            </span>
                        </div>
                    </div>

                </CardContent>

                <CardFooter className="p-3 bg-muted/10 border-t border-border/40 text-[10px] text-muted-foreground justify-between font-mono">
                    <div className="flex items-center gap-1.5" title="Delivery Date">
                        <Truck className="h-3 w-3" />
                        <span>{order.deliveryDate ? format(new Date(order.deliveryDate), 'MMM d') : "No Date"}</span>
                    </div>

                    <div className="flex items-center gap-1.5" title="Payment Status">
                        <div className={cn("w-1.5 h-1.5 rounded-full",
                            order.paymentStatus === 'Paid' ? "bg-emerald-500" :
                                order.paymentStatus === 'Overdue' ? "bg-red-500" : "bg-slate-300"
                        )} />
                        <span className="capitalize font-sans">{order.paymentStatus || 'Pending'}</span>
                    </div>
                </CardFooter>
            </Card>
        </DrillTarget>
    );
}


// --- Grouping Logic & Components ---

interface DayGroup {
    date: Date;
    isoDate: string; // YYYY-MM-DD
    orders: Order[];
    isToday: boolean;
}

const groupOrdersByDate = (orders: Order[]): DayGroup[] => {
    const groups: Record<string, DayGroup> = {};
    const now = new Date();

    // Initialize with last 7 days (including Today) to ensure empty days show up if desired
    // (Optional: remove this loop if you only want to show days WITH orders)
    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const iso = format(d, "yyyy-MM-dd");
        groups[iso] = {
            date: d,
            isoDate: iso,
            orders: [],
            isToday: i === 0
        };
    }

    orders.forEach(order => {
        const orderDateStr = order.orderDate;
        if (!orderDateStr) return;
        try {
            const orderDate = new Date(orderDateStr);
            if (isNaN(orderDate.getTime())) return;
            const iso = format(orderDate, "yyyy-MM-dd");

            if (!groups[iso]) {
                groups[iso] = {
                    date: orderDate,
                    isoDate: iso,
                    orders: [],
                    isToday: isToday(orderDate)
                };
            }
            groups[iso].orders.push(order);
        } catch (e) {
            console.error("Failed to parse date", orderDateStr, e);
        }
    });

    return Object.values(groups).sort((a, b) => b.isoDate.localeCompare(a.isoDate));
};

function DayGroupSection({
    group,
    companies,
    onUpdateStatus,
    onCancelOrder,
    onDeleteOrder,
    isExpanded,
    onToggle
}: {
    group: DayGroup
    companies: Company[]
    onUpdateStatus: any
    onCancelOrder: any
    onDeleteOrder: any
    isExpanded: boolean
    onToggle: () => void
}) {

    const totalRevenue = group.orders.reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0);
    const orderCount = group.orders.length;

    let dateLabel = format(group.date, "EEEE, MMM d");
    if (group.isToday) dateLabel = "TODAY";
    else if (isYesterday(group.date)) dateLabel = "YESTERDAY";
    else dateLabel = dateLabel.toUpperCase();

    return (
        <div className="mb-6 animate-in slide-in-from-bottom-2 duration-500">
            {/* Timeline Header */}
            <div
                role="button"
                tabIndex={0}
                onClick={onToggle}
                className={cn(
                    "flex items-center gap-4 py-3 mb-2 cursor-pointer group select-none",
                )}
            >
                <div className={cn(
                    "w-2 h-2 rounded-full ring-4 ring-background z-10",
                    group.isToday ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-muted-foreground/30"
                )} />

                <h3 className={cn("text-sm font-bold tracking-widest font-mono flex items-center gap-3", group.isToday ? "text-primary" : "text-muted-foreground")}>
                    {dateLabel}
                    <span className="text-[10px] font-normal text-muted-foreground/50 bg-muted/20 px-1.5 py-0.5 rounded">
                        {format(group.date, "yyyy-MM-dd")}
                    </span>
                </h3>

                <div className="h-px flex-1 bg-border/40 group-hover:bg-border/60 transition-colors" />

                <div className="flex items-center gap-4">
                    {orderCount > 0 && (
                        <span className="text-xs font-mono text-muted-foreground">
                            {orderCount} ORDERS <span className="mx-1 opacity-30">|</span> <span className="text-foreground">{formatCurrency(totalRevenue)}</span>
                        </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-50 group-hover:opacity-100">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="pl-3 border-l-2 border-border/30 ml-1"
                    >
                        <div className="pl-4 pt-2 pb-4">
                            {orderCount > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {group.orders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            companies={companies}
                                            onUpdateStatus={onUpdateStatus}
                                            onCancelOrder={onCancelOrder}
                                            onDeleteOrder={onDeleteOrder}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3 border border-dashed border-border/30 rounded-lg bg-muted/5">
                                    <div className="p-3 rounded-full bg-muted/20">
                                        <Box className="w-6 h-6 opacity-30" />
                                    </div>
                                    <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em]">No Activity Recorded</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function OrderGrid({ orders, companies, onUpdateStatus, onCancelOrder, onDeleteOrder }: OrderGridProps) {
    const groupedOrders = useMemo(() => groupOrdersByDate(orders), [orders]);

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        const todayIso = format(new Date(), "yyyy-MM-dd");
        return new Set([todayIso]);
    });

    const toggleGroup = (isoDate: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(isoDate)) {
                next.delete(isoDate);
            } else {
                next.add(isoDate);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allKeys = groupedOrders.filter(g => g.orders.length > 0).map(g => g.isoDate);
        setExpandedGroups(new Set(allKeys));
    };

    const collapseAll = () => {
        setExpandedGroups(new Set());
    };

    return (
        <div className="flex flex-col gap-2 pb-10">
            <div className="flex items-center justify-end px-1 gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={expandAll} className="h-6 text-[10px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-wider">
                    [ Expand All ]
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll} className="h-6 text-[10px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-wider">
                    [ Collapse All ]
                </Button>
            </div>

            {groupedOrders.map(group => (
                <DayGroupSection
                    key={group.isoDate}
                    group={group}
                    companies={companies}
                    onUpdateStatus={onUpdateStatus}
                    onCancelOrder={onCancelOrder}
                    onDeleteOrder={onDeleteOrder}
                    isExpanded={expandedGroups.has(group.isoDate)}
                    onToggle={() => toggleGroup(group.isoDate)}
                />
            ))}
        </div>
    );
}
