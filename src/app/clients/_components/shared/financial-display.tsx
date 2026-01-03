"use client";

import { TrendingUp, AlertCircle } from 'lucide-react';
import { PaymentScoreBadge } from '@/components/payment-score-badge';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface FinancialDisplayProps {
    last12MonthsRevenue?: number;
    currentPaymentScore?: number;
    paymentStatus?: "excellent" | "good" | "fair" | "poor" | "critical" | undefined;
    totalOutstandingAmount?: number;
    className?: string;
    compact?: boolean;
}

export function FinancialDisplay({
    last12MonthsRevenue,
    currentPaymentScore,
    paymentStatus,
    totalOutstandingAmount,
    className,
    compact = false
}: FinancialDisplayProps) {
    const hasBalance = (totalOutstandingAmount || 0) > 0;

    if (compact) {
        return (
            <div className={cn("flex items-center justify-between", className)}>
                <div className="flex items-center">
                    {currentPaymentScore !== undefined ? (
                        <PaymentScoreBadge score={currentPaymentScore} status={paymentStatus || "fair"} />
                    ) : (
                        <span className="text-muted-foreground text-xs italic opacity-50">N/A</span>
                    )}
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                        <span className="font-mono text-xs tracking-tight font-medium opacity-90">
                            {last12MonthsRevenue ? formatCurrency(last12MonthsRevenue) : '-'}
                        </span>
                        {last12MonthsRevenue ? <TrendingUp className="h-3 w-3 text-emerald-500 opacity-80" /> : null}
                    </div>
                    {hasBalance && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-200/50 dark:border-amber-500/20 mt-2">
                            <AlertCircle className="h-3 w-3" />
                            <span className="font-mono">{formatCurrency(totalOutstandingAmount || 0)}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col justify-center text-sm space-y-2", className)}>
            {/* Revenue */}
            <div className="flex items-center gap-2">
                <span className="font-mono tracking-tight font-medium opacity-90">
                    {last12MonthsRevenue ? formatCurrency(last12MonthsRevenue) : '-'}
                </span>
                {last12MonthsRevenue ? <TrendingUp className="h-3 w-3 text-emerald-500 opacity-80" /> : null}
            </div>

            {/* Outstanding Balance */}
            {hasBalance && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-200/50 dark:border-amber-500/20">
                    <AlertCircle className="h-3 w-3" />
                    <span className="font-mono">{formatCurrency(totalOutstandingAmount || 0)}</span>
                </div>
            )}

            {/* Payment Score */}
            {currentPaymentScore !== undefined ? (
                <PaymentScoreBadge score={currentPaymentScore} status={paymentStatus || "fair"} />
            ) : (
                <span className="text-muted-foreground text-xs italic opacity-50">N/A</span>
            )}
        </div>
    );
}