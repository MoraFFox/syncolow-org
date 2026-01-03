"use client";

import React, { memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import {
    MoreHorizontal,
    FileText,
    CreditCard,
    Download,
    Hash,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order } from "@/lib/types";

// Extended type matching the main page definition
interface PaymentHistoryOrder extends Order {
    paidDate?: string;
    paymentReference?: string;
    paymentNotes?: string;
}

interface HistoryLedgerProps {
    orders: PaymentHistoryOrder[];
    loading?: boolean;
    onDownloadInvoice?: (order: Order) => void;
}

const ROW_HEIGHT = 64;

export function HistoryLedger({
    orders,
    loading = false,
    onDownloadInvoice,
}: HistoryLedgerProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: orders.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Ledger Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <div>Transaction / Company</div>
                <div className="text-right w-24">Amount</div>
                <div className="w-28 text-center">Date Paid</div>
                <div className="w-20">Method</div>
                <div className="w-28">Reference</div>
                <div className="w-20 text-center">Status</div>
                <div className="w-8"></div>
            </div>

            {/* Virtualized List or Loading/Empty State */}
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4 border border-border/40 rounded-lg bg-card/50">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <p>No verified transactions found</p>
                </div>
            ) : (
                <div
                    ref={parentRef}
                    className="flex-1 overflow-auto rounded-lg border border-border/40 min-h-0"
                    style={{ contain: 'strict' }}
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
                                    <MemoizedLedgerRow
                                        order={order}
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
                    Showing {orders.length.toLocaleString()} verified records (virtualized)
                </div>
            )}
        </div>
    );
}

// Memoized Row Component
const MemoizedLedgerRow = memo(function LedgerRow({
    order,
    onDownloadInvoice,
}: {
    order: PaymentHistoryOrder;
    onDownloadInvoice?: (order: Order) => void;
}) {
    const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(order.total);
    const paidDate = order.paidDate ? new Date(order.paidDate) : null;

    return (
        <div className="group h-full flex items-center bg-card hover:bg-accent/5 border-b border-border/20 transition-colors border-l-2 border-l-emerald-500/50">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-6 py-3 items-center w-full">
                {/* ID & Company */}
                <div className="flex flex-col min-w-0">
                    <span className="font-semibold truncate text-sm">{order.companyName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Hash className="h-2.5 w-2.5" />
                        {order.id.slice(0, 12)}
                    </span>
                </div>

                {/* Amount */}
                <div className="text-right font-mono font-bold text-emerald-500 w-24 text-sm">
                    {formattedAmount}
                </div>

                {/* Date */}
                <div className="w-28 text-center text-sm">
                    {paidDate ? format(paidDate, "MMM dd, yyyy") : "-"}
                </div>

                {/* Method */}
                <div className="w-20 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    <span>Transfer</span>
                </div>

                {/* Ref */}
                <div className="w-28">
                    {order.paymentReference ? (
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border truncate block max-w-full">{order.paymentReference}</code>
                    ) : (
                        <span className="text-muted-foreground/30 text-xs">-</span>
                    )}
                </div>

                {/* Status */}
                <div className="w-20 flex justify-center">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 text-[10px] py-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Verified
                    </Badge>
                </div>

                {/* Actions */}
                <div className="w-8 flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ledger Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onDownloadInvoice?.(order)}>
                                <Download className="mr-2 h-4 w-4" /> Download Proof
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
});
