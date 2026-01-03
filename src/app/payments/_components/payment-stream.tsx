"use client";

import React, { memo, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format, differenceInDays } from "date-fns";
import {
    CheckCircle2,
    Clock,
    MoreHorizontal,
    History,
    FileText,
    CreditCard,
    Calendar,
    Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PaymentScoreBadge } from "@/components/payment-score-badge";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, Company } from "@/lib/types";

interface PaymentStreamProps {
    orders: Order[];
    companies: Company[];
    selectedOrders: Set<string>;
    onSelectionChange: (selected: Set<string>) => void;
    onMarkAsPaid: (orderId: string) => void;
    onViewHistory: (companyId: string, companyName: string) => void;
    onDownloadInvoice: (order: Order) => void;
    loading?: boolean;
}

const ROW_HEIGHT = 72; // Fixed row height for virtualization

export function PaymentStream({
    orders,
    companies,
    selectedOrders,
    onSelectionChange,
    onMarkAsPaid,
    onViewHistory,
    onDownloadInvoice,
    loading = false,
}: PaymentStreamProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: orders.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10, // Render 10 extra items above/below viewport for smooth scrolling
    });

    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            onSelectionChange(new Set(orders.map(o => o.id)));
        } else {
            onSelectionChange(new Set());
        }
    }, [orders, onSelectionChange]);

    const toggleSelection = useCallback((id: string) => {
        const newSet = new Set(selectedOrders);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        onSelectionChange(newSet);
    }, [selectedOrders, onSelectionChange]);

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto_auto] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <div className="w-8 flex items-center justify-center">
                    <Checkbox
                        checked={orders.length > 0 && selectedOrders.size === orders.length}
                        onCheckedChange={handleSelectAll}
                        disabled={loading}
                    />
                </div>
                <div>Invoiced Company</div>
                <div>Amount</div>
                <div>Due Date</div>
                <div>Status</div>
                <div>Method</div>
                <div>Score</div>
                <div className="w-8"></div>
            </div>

            {/* Virtualized List Container */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4 border border-border/40 rounded-lg bg-card/50">
                            <Skeleton className="h-4 w-4 rounded" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-6 w-10 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
                    <p>No invoices found matching criteria</p>
                </div>
            ) : (
                <div
                    ref={parentRef}
                    className="flex-1 overflow-auto rounded-lg border border-border/40 min-h-0"
                    style={{ contain: 'strict' }} // CSS containment for performance
                >
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                            const order = orders[virtualRow.index];
                            return (
                                <div
                                    key={order.id}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <MemoizedPaymentRow
                                        order={order}
                                        companies={companies}
                                        isSelected={selectedOrders.has(order.id)}
                                        onToggleSelect={toggleSelection}
                                        onMarkAsPaid={onMarkAsPaid}
                                        onViewHistory={onViewHistory}
                                        onDownloadInvoice={onDownloadInvoice}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Record Count Footer */}
            {!loading && orders.length > 0 && (
                <div className="text-xs text-muted-foreground text-center py-2 font-mono">
                    Showing {orders.length.toLocaleString()} records (virtualized)
                </div>
            )}
        </div>
    );
}

// Memoized Row Component
const MemoizedPaymentRow = memo(function PaymentRow({
    order,
    companies,
    isSelected,
    onToggleSelect,
    onMarkAsPaid,
    onViewHistory,
    onDownloadInvoice,
}: {
    order: Order;
    companies: Company[];
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onMarkAsPaid: (orderId: string) => void;
    onViewHistory: (id: string, name: string) => void;
    onDownloadInvoice: (order: Order) => void;
}) {
    const company = companies.find(c => c.id === order.companyId);
    const daysOverdue = order.daysOverdue || 0;
    const isOverdue = daysOverdue > 7;
    const isDueSoon = !isOverdue && order.expectedPaymentDate && differenceInDays(new Date(order.expectedPaymentDate), new Date()) <= 3;

    const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(order.total);
    const dueDate = order.expectedPaymentDate ? new Date(order.expectedPaymentDate) : null;

    return (
        <div
            className={cn(
                "group h-full flex items-center bg-card hover:bg-accent/5 border-b border-border/20 transition-colors",
                isSelected && "bg-primary/5",
                isOverdue && "border-l-2 border-l-red-500"
            )}
        >
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto_auto] gap-4 px-6 py-3 items-center w-full">
                {/* Checkbox */}
                <div className="w-8 flex items-center justify-center">
                    <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(order.id)} />
                </div>

                {/* Company Info */}
                <div className="flex flex-col min-w-0">
                    <DrillTarget kind="company" payload={{ id: order.companyId, name: order.companyName }} asChild expandHitArea>
                        <span className="font-semibold truncate cursor-pointer hover:underline decoration-primary/50 underline-offset-4 text-sm">
                            {order.companyName}
                        </span>
                    </DrillTarget>
                    <span className="text-[10px] text-muted-foreground font-mono">#{order.id.slice(0, 8)}</span>
                </div>

                {/* Amount */}
                <div className="font-mono font-bold text-sm">{formattedAmount}</div>

                {/* Due Date */}
                <div className="flex flex-col text-sm">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{dueDate ? format(dueDate, "MMM dd") : "N/A"}</span>
                    </div>
                    {isOverdue && (
                        <span className="text-[10px] font-bold text-red-500">{daysOverdue}d late</span>
                    )}
                    {isDueSoon && (
                        <span className="text-[10px] font-medium text-amber-500">Due soon</span>
                    )}
                </div>

                {/* Status Badge */}
                <div>
                    {isOverdue ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-medium border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Overdue
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[11px] font-medium border border-yellow-500/20">
                            <Clock className="h-2.5 w-2.5" />
                            Pending
                        </div>
                    )}
                </div>

                {/* Method */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {company?.paymentMethod === 'check' ? (
                        <><FileText className="h-3 w-3" /> Check</>
                    ) : (
                        <><CreditCard className="h-3 w-3" /> Transfer</>
                    )}
                </div>

                {/* Score */}
                <div>
                    <PaymentScoreBadge
                        score={order.paymentScore || 100}
                        status={company?.paymentStatus}
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end w-8">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onMarkAsPaid(order.id)}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                Mark Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownloadInvoice(order)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onViewHistory(order.companyId, order.companyName || 'Unknown')}>
                                <History className="mr-2 h-4 w-4" />
                                View History
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
});
