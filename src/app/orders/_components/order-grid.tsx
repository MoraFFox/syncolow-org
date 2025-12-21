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
import { format, isToday, isYesterday, parseISO, startOfDay } from "date-fns";
import type { Order, Company } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
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
    CalendarDays
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

/**
 * Returns initials from a company name (e.g. "Willow's Tea" -> "WT")
 */
const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

/**
 * Returns the appropriate badge variant based on order/payment status.
 */
const getStatusVariant = (
    status: string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" => {
    switch (status) {
        case "Delivered":
        case "Paid":
        case "Completed": // Added for completeness
            return "success"; // Will need to define/map this to a valid badge variant or use custom class
        case "Processing":
        case "Shipped":
            return "info";
        case "Pending":
            return "warning";
        case "Cancelled":
        case "Overdue":
            return "destructive";
        default:
            return "outline";
    }
};

// Map internal abstract variants to ShadCN Badge variants + className overrides
const getBadgeStyles = (variant: string) => {
    switch (variant) {
        case "success": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
        case "warning": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
        case "info": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
        case "destructive": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
        default: return "bg-muted text-muted-foreground border-border";
    }
};

const getCompanyName = (order: Order, companies: Company[]): string => {
    if (order.isPotentialClient) {
        return order.temporaryCompanyName || "Unknown Client";
    }
    const company = companies.find((c) => c.id === order.companyId);
    return company?.name || order.companyName || "Unknown Client";
};

const getPaymentMethod = (order: Order, companies: Company[]): string => {
    if (order.isPotentialClient) return "N/A";
    const company = companies.find((c) => c.id === order.companyId);
    if (!company?.paymentMethod) return "N/A";
    return company.paymentMethod === "transfer" ? "Transfer" : "Check";
};

const getCriticalFlags = (order: Order): CriticalFlag[] => {
    const flags: CriticalFlag[] = [];
    if (order.daysOverdue && order.daysOverdue > 0) {
        flags.push({ label: `${order.daysOverdue}d Overdue`, variant: "destructive", icon: <Clock className="h-3 w-3" /> });
    }
    if (order.paymentStatus === "Overdue") {
        flags.push({ label: "Payment Overdue", variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> });
    }
    if (order.status === "Cancelled") {
        flags.push({ label: order.cancellationReason || "Cancelled", variant: "destructive", icon: <XCircle className="h-3 w-3" /> });
    }
    if (order.isPotentialClient) {
        flags.push({ label: "Potential Client", variant: "outline", icon: <UserPlus className="h-3 w-3" /> });
    }
    return flags;
};

const formatOrderDate = (dateValue: string | null | undefined, fallback: string = "-"): string => {
    if (!dateValue) return fallback;
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "Invalid date";
        return format(date, "MMM d, yyyy"); // Optimized format
    } catch {
        return "Invalid date";
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
    const statusVariantKey = getStatusVariant(order.status);
    const badgeStyle = getBadgeStyles(statusVariantKey);
    // Use 'outline' as base variant to allow full custom override via className without conflict
    const baseBadgeVariant = "outline";
    const router = useRouter();
    const companyName = getCompanyName(order, companies);
    const initials = getInitials(companyName);
    const paymentMethod = getPaymentMethod(order, companies);
    const criticalFlags = getCriticalFlags(order);
    const orderTotal = order.grandTotal || order.total || 0;

    return (
        <DrillTarget kind="order" payload={{ id: order.id }} asChild ariaLabel={`View order ${order.id}`}>
            <Card className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-border/60 hover:border-primary/50 flex flex-col h-full overflow-hidden cursor-pointer bg-card/50 hover:bg-card relative">
                {/* Header: Company, ID, Actions, Main Status */}
                <CardHeader className="p-4 pb-3 flex flex-row items-start justify-between space-y-0 relative">
                    <div className="flex items-center gap-3 min-w-0 pr-8">
                        <Avatar className="h-10 w-10 border border-border/50 bg-secondary/20">
                            <AvatarFallback className="text-xs font-semibold text-muted-foreground">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <DrillTarget kind="company" payload={{ id: order.companyId, name: companyName }} asChild>
                                <p className="font-semibold text-sm truncate hover:text-primary transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                    {companyName}
                                </p>
                            </DrillTarget>
                            <p className="text-xs text-muted-foreground font-mono truncate">#{order.id.slice(0, 8)}</p>
                        </div>
                    </div>

                    {/* Top Right Actions */}
                    <div className="flex flex-row items-center gap-2 absolute top-4 right-4 z-10">
                        {/* Status Badge */}
                        <Badge variant={baseBadgeVariant} className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 h-6 shadow-sm font-semibold border", badgeStyle)}>
                            {order.status}
                        </Badge>

                        {/* Quick Actions (Visible on Hover) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -mr-2 bg-card/80 backdrop-blur-sm rounded-md p-0.5 border border-border/50 shadow-sm">
                            <TooltipText text="View Details">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/orders/${order.id}`)}>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                            </TooltipText>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-muted" onClick={(e) => e.stopPropagation()}>
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

                {/* Body: Price, Payment Status, Flags */}
                <CardContent className="p-4 pt-1 flex-1 flex flex-col gap-3">
                    <div className="flex items-baseline justify-between mt-1">
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold tracking-tight text-foreground">
                                {formatCurrency(orderTotal)}
                            </p>
                            {order.discountAmount && order.discountAmount > 0 && (
                                <Badge variant="secondary" className="px-1.5 h-5 text-[10px] text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                                    {order.discountType === 'percentage' ? `-${order.discountValue}%` : `-${formatCurrency(order.discountValue || 0)}`}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <TooltipText text={`Payment: ${order.paymentStatus || 'Pending'}`}>
                                <Badge variant="outline" className={cn(
                                    "text-[10px] font-medium px-2 h-5 gap-1",
                                    order.paymentStatus === 'Paid' ? "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5" : "text-muted-foreground"
                                )}>
                                    {order.paymentStatus === 'Paid' ? <CheckCircleIcon className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                                    {order.paymentStatus || "Pending"}
                                </Badge>
                            </TooltipText>
                        </div>
                    </div>

                    {criticalFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {criticalFlags.map((flag, index) => (
                                <Badge key={index} variant={flag.variant} className="text-[10px] h-5 px-1.5 gap-1 border-dotted">
                                    {flag.icon} {flag.label}
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>

                {/* Footer: Metadata Grid */}
                <CardFooter className="p-0 bg-muted/20 border-t border-border/40 text-xs">
                    <div className="w-full grid grid-cols-2 divide-x divide-border/40">
                        <div className="p-3 space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{formatOrderDate(order.orderDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Truck className="h-3.5 w-3.5 shrink-0" />
                                <span className={cn("truncate", !order.deliveryDate && "opacity-50")}>
                                    {formatOrderDate(order.deliveryDate, "No Delivery")}
                                </span>
                            </div>
                        </div>
                        <div className="p-3 space-y-2 pl-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{order.area || "No Area"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Box className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate capitalize">{paymentMethod}</span>
                            </div>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </DrillTarget>
    );
}

// Helper for tooltip (simplified wrapper if needed, or just plain)
function TooltipText({ text, children }: { text: string, children: React.ReactNode }) {
    return <div title={text}>{children}</div>
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
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

    // 1. Initialize with last 7 days (including Today)
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

    // 2. Add/Populate with actual orders
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

    // Sort groups by date descending (newest first)
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
    if (group.isToday) dateLabel = "Today";
    else if (isYesterday(group.date)) dateLabel = "Yesterday";

    return (
        <div className={cn(
            "rounded-xl border transition-all duration-300 overflow-hidden",
            group.isToday
                ? "bg-primary/[0.03] border-primary/30 shadow-sm ring-1 ring-primary/5"
                : "bg-card/30 border-border/40 hover:border-border/60"
        )}>
            {/* Header / Trigger */}
            <div
                role="button"
                tabIndex={0}
                onClick={onToggle}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggle();
                    }
                }}
                className={cn(
                    "flex items-center justify-between p-4 cursor-pointer select-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    group.isToday ? "hover:bg-primary/[0.08]" : "hover:bg-muted/30",
                    orderCount === 0 && "opacity-60 hover:opacity-100" // Differentiate empty days
                )}
            >
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                        group.isToday
                            ? "bg-primary text-primary-foreground shadow-lg scale-110"
                            : "bg-muted text-muted-foreground"
                    )}>
                        {group.isToday ? <CalendarDays className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                        <h3 className={cn("text-lg font-bold leading-tight tracking-tight flex items-center gap-2", group.isToday && "text-primary")}>
                            {dateLabel}
                            {group.isToday && (
                                <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm">
                                    Today
                                </span>
                            )}

                            {/* Revenue Summary in Header (Visible when collapsed or empty) */}
                            {orderCount > 0 && !isExpanded && (
                                <span className="ml-2 text-sm font-normal text-muted-foreground animate-in fade-in duration-300 hidden sm:inline-block">
                                    • <span className="font-medium text-foreground">{formatCurrency(totalRevenue)}</span>
                                    <span className="mx-1 text-muted-foreground/50">in</span>
                                    {orderCount} orders
                                </span>
                            )}
                        </h3>
                        <span className="text-xs text-muted-foreground font-medium opacity-70">
                            {format(group.date, "MMMM d, yyyy")}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex flex-col items-end text-right mr-4">
                        <span className={cn("text-sm font-bold", orderCount > 0 ? "text-foreground" : "text-muted-foreground/50")}>
                            {orderCount > 0 ? formatCurrency(totalRevenue) : "-"}
                        </span>
                        <span className="text-xs text-muted-foreground/60 font-medium">
                            {orderCount} {orderCount === 1 ? 'Order' : 'Orders'}
                        </span>
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0 group-hover:bg-muted/50">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Collapsible Content */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <div className="p-4 pt-0 border-t border-border/10">
                            {orderCount > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
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
                                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                                        <Box className="w-6 h-6 opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium italic opacity-60">No orders for this day.</p>
                                    <p className="text-xs text-muted-foreground/50">New orders will appear here automatically.</p>
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

    // Initialize expandedGroups with Today's ISO date (and maybe yesterday if you want)
    // We'll trust the grouping order: groupedOrders[0] is Today if populated logic is solid
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
        // Only expand groups that have orders to avoid clutter
        const allKeys = groupedOrders.filter(g => g.orders.length > 0).map(g => g.isoDate);
        setExpandedGroups(new Set(allKeys));
    };

    const collapseAll = () => {
        setExpandedGroups(new Set());
    };

    return (
        <div className="flex flex-col gap-4 pb-10">
            {/* Toolbar for Bulk Actions */}
            <div className="flex items-center justify-between px-1">
                <div className="text-xs text-muted-foreground font-medium">
                    Showing {groupedOrders.length} days range
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                        Expand All
                    </Button>
                    <div className="h-3 w-px bg-border/50" />
                    <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                        Collapse All
                    </Button>
                </div>
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
