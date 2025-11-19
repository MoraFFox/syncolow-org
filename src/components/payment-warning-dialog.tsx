"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PaymentScoreBadge } from './payment-score-badge';
import { AlertTriangle, DollarSign, FileText, Clock } from 'lucide-react';
import type { Company } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PaymentWarningDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Company;
  onProceed: () => void;
  onCancel: () => void;
}

export function PaymentWarningDialog({ isOpen, onOpenChange, client, onProceed, onCancel }: PaymentWarningDialogProps) {
  const score = client.currentPaymentScore ?? 100;
  const status = client.paymentStatus ?? 'excellent';
  const unpaidOrders = client.totalUnpaidOrders ?? 0;
  const outstanding = client.totalOutstandingAmount ?? 0;

  const getWarningLevel = () => {
    if (status === 'critical') return { level: 'critical', canProceed: false };
    if (status === 'poor') return { level: 'high', canProceed: true };
    if (status === 'fair') return { level: 'medium', canProceed: true };
    return { level: 'low', canProceed: true };
  };

  const { level, canProceed } = getWarningLevel();

  const getWarningMessage = () => {
    switch (level) {
      case 'critical':
        return {
          title: '⛔ Critical Payment Risk',
          description: 'This client has a critical payment history. Creating new orders is not recommended until outstanding payments are resolved.',
          color: 'text-red-600 dark:text-red-400'
        };
      case 'high':
        return {
          title: '🔴 High Payment Risk',
          description: 'This client has poor payment history. Please review their payment status carefully before proceeding.',
          color: 'text-red-600 dark:text-red-400'
        };
      case 'medium':
        return {
          title: '🟠 Payment Caution',
          description: 'This client has some payment delays. Consider reviewing their payment terms.',
          color: 'text-orange-600 dark:text-orange-400'
        };
      default:
        return {
          title: '⚠️ Payment Notice',
          description: 'Please review payment information before proceeding.',
          color: 'text-yellow-600 dark:text-yellow-400'
        };
    }
  };

  const warning = getWarningMessage();

  const handleProceed = () => {
    onProceed();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className={cn('flex items-center gap-2', warning.color)}>
            <AlertTriangle className="h-5 w-5" />
            {warning.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {warning.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted">
            <span className="text-sm font-medium">Payment Score</span>
            <PaymentScoreBadge score={score} status={status} />
          </div>

          {unpaidOrders > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Unpaid Orders</p>
                <p className="text-xs text-muted-foreground">{unpaidOrders} order{unpaidOrders !== 1 ? 's' : ''} awaiting payment</p>
              </div>
            </div>
          )}

          {outstanding > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Outstanding Amount</p>
                <p className="text-xs text-muted-foreground">${outstanding.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Payment Terms</p>
              <p className="text-xs text-muted-foreground">
                {client.paymentMethod === 'check' ? 'Check' : 'Transfer'}, 
                {client.paymentDueType === 'immediate' ? ' Immediate' : 
                 client.paymentDueType === 'days_after_order' ? ` Net ${client.paymentDueDays || 30}` :
                 ` Monthly ${client.paymentDueDate}`}
              </p>
            </div>
          </div>

          {level === 'critical' && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                Manager Override Required
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                Contact your manager to approve this order or resolve outstanding payments first.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel Order</AlertDialogCancel>
          {canProceed ? (
            <AlertDialogAction onClick={handleProceed} className="bg-orange-600 hover:bg-orange-700">
              Proceed Anyway
            </AlertDialogAction>
          ) : (
            <AlertDialogAction disabled className="opacity-50 cursor-not-allowed">
              Blocked
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
