import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PaymentScoreBadge } from './payment-score-badge';
import type { Company } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface ClientPaymentStatusBarProps {
  client: Company;
  className?: string;
}

export function ClientPaymentStatusBar({ client, className }: ClientPaymentStatusBarProps) {
  const paymentInfo = useMemo(() => {
    const score = client.currentPaymentScore ?? 100;
    const status = client.paymentStatus ?? 'excellent';
    const unpaidCount = client.totalUnpaidOrders ?? 0;
    const outstanding = client.totalOutstandingAmount ?? 0;
    
    // Payment terms
    let terms = '';
    const method = client.paymentMethod === 'check' ? 'Check' : 'Transfer';
    
    if (client.paymentDueType === 'immediate') {
      terms = `${method}, Immediate`;
    } else if (client.paymentDueType === 'days_after_order') {
      terms = `${method}, Net ${client.paymentDueDays || 30}`;
    } else if (client.paymentDueType === 'monthly_date') {
      terms = `${method}, Monthly ${client.paymentDueDate}`;
    } else {
      terms = `${method}, Net 30`;
    }
    
    return { score, status, unpaidCount, outstanding, terms };
  }, [client]);

  const bgColor = useMemo(() => {
    switch (paymentInfo.status) {
      case 'excellent': return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900';
      case 'good': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900';
      case 'fair': return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900';
      case 'poor': return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900';
      case 'critical': return 'bg-red-100 border-red-300 dark:bg-red-950/30 dark:border-red-800';
      default: return 'bg-muted border-border';
    }
  }, [paymentInfo.status]);

  return (
    <div className={cn(
      'border border-t-0 rounded-b-md px-3 py-2.5 text-sm',
      bgColor,
      className
    )}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <PaymentScoreBadge score={paymentInfo.score} status={paymentInfo.status} />
        </div>
        
        <span className="text-muted-foreground">•</span>
        
        <span className="font-medium">{paymentInfo.terms}</span>
        
        {paymentInfo.unpaidCount > 0 && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {paymentInfo.unpaidCount} unpaid order{paymentInfo.unpaidCount !== 1 ? 's' : ''}
            </span>
          </>
        )}
        
        {paymentInfo.outstanding > 0 && (
          <>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <span className="text-muted-foreground hidden sm:inline">
              ${paymentInfo.outstanding.toLocaleString()} outstanding
            </span>
          </>
        )}
      </div>
    </div>
  );
}
