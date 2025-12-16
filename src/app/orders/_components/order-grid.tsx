"use client";

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
import { format } from "date-fns";
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
} from "lucide-react";
import { useRouter } from "next/navigation";

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
): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case "Delivered":
        case "Paid":
            return "default";
        case "Processing":
        case "Shipped":
        case "Pending":
            return "secondary";
        case "Cancelled":
        case "Overdue":
            return "destructive";
        default:
            return "outline";
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
    const router = useRouter();
    const companyName = getCompanyName(order, companies);
    const initials = getInitials(companyName);
    const paymentMethod = getPaymentMethod(order, companies);
    const criticalFlags = getCriticalFlags(order);
    const orderTotal = order.grandTotal || order.total || 0;

    return (
        <DrillTarget kind="order" payload={{ id: order.id }} asChild ariaLabel={`View order ${order.id}`}>
            <Card className="group hover:shadow-md transition-all duration-200 border-border/60 hover:border-primary/50 flex flex-col h-full overflow-hidden cursor-pointer">
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
                    <div className="flex flex-row items-center gap-2 absolute top-4 right-4">
                        <Badge variant={getStatusVariant(order.status)} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 h-6 shadow-sm">
                            {order.status}
                        </Badge>
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

export function OrderGrid({ orders, companies, onUpdateStatus, onCancelOrder, onDeleteOrder }: OrderGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {orders.map((order) => (
                <OrderCard
                    key={order.id}
                    order={order}
                    companies={companies}
                    onUpdateStatus={onUpdateStatus}
                    onCancelOrder={onCancelOrder}
                    onDeleteOrder={onDeleteOrder}
                />
            ))}
            {orders.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    <p className="text-lg font-medium">No orders found.</p>
                </div>
            )}
        </div>
    );
}
