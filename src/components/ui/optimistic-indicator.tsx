"use client";

import { useSyncExternalStore, useCallback } from 'react';
import { optimisticUIManager } from '@/lib/optimistic-ui-manager';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type UpdateStatus = 'pending' | 'synced' | 'failed' | 'rolled-back';

interface OptimisticIndicatorProps {
    /** Optional: Show only for a specific transaction */
    transactionId?: string;
    /** Optional: Show compact version */
    compact?: boolean;
    /** Optional: Custom class name */
    className?: string;
}

/**
 * OptimisticIndicator Component
 * 
 * Displays visual indicators for optimistic updates:
 * - Pending: Spinning loader
 * - Synced: Green checkmark
 * - Failed: Red X
 * - Rolled back: Rotate arrow
 */
export function OptimisticIndicator({
    transactionId,
    compact = false,
    className = ''
}: OptimisticIndicatorProps) {
    // Subscribe to optimistic UI manager changes
    const stats = useSyncExternalStore(
        useCallback((callback) => optimisticUIManager.subscribe(callback), []),
        () => optimisticUIManager.getStats(),
        () => ({ pending: 0, synced: 0, failed: 0, rolledBack: 0 })
    );

    // If specific transaction, get its status
    const transaction = transactionId
        ? optimisticUIManager.getTransaction(transactionId)
        : null;

    // If showing specific transaction and it doesn't exist or is synced, hide
    if (transactionId && (!transaction || transaction.status === 'synced')) {
        return null;
    }

    // If showing global status and nothing pending/failed, hide
    if (!transactionId && stats.pending === 0 && stats.failed === 0) {
        return null;
    }

    const status: UpdateStatus = transaction?.status ||
        (stats.failed > 0 ? 'failed' : stats.pending > 0 ? 'pending' : 'synced');

    const statusConfig = {
        pending: {
            icon: <Loader2 className="h-3 w-3 animate-spin" />,
            label: compact ? '' : 'Syncing...',
            variant: 'secondary' as const,
            tooltip: `${stats.pending} operation(s) pending`,
        },
        synced: {
            icon: <CheckCircle2 className="h-3 w-3" />,
            label: compact ? '' : 'Synced',
            variant: 'default' as const,
            tooltip: 'All changes synced',
        },
        failed: {
            icon: <XCircle className="h-3 w-3" />,
            label: compact ? '' : 'Failed',
            variant: 'destructive' as const,
            tooltip: transaction?.error || `${stats.failed} operation(s) failed`,
        },
        'rolled-back': {
            icon: <RotateCcw className="h-3 w-3" />,
            label: compact ? '' : 'Rolled back',
            variant: 'outline' as const,
            tooltip: 'Changes have been reverted',
        },
    };

    const config = statusConfig[status];

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant={config.variant} className={`gap-1.5 ${className}`}>
                        {config.icon}
                        {config.label && <span className="text-xs">{config.label}</span>}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{config.tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * PendingOperationsBadge
 * 
 * Shows a count badge for pending operations.
 * Useful for navigation/header areas.
 */
export function PendingOperationsBadge() {
    const stats = useSyncExternalStore(
        useCallback((callback) => optimisticUIManager.subscribe(callback), []),
        () => optimisticUIManager.getStats(),
        () => ({ pending: 0, synced: 0, failed: 0, rolledBack: 0 })
    );

    if (stats.pending === 0 && stats.failed === 0) return null;

    return (
        <Badge
            variant={stats.failed > 0 ? 'destructive' : 'secondary'}
            className="h-5 min-w-[1.25rem] px-1.5"
        >
            {stats.pending + stats.failed}
        </Badge>
    );
}
