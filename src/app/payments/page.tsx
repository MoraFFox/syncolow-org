"use client"

import { useState, useMemo, useEffect } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { supabase } from '@/lib/supabase';
import { History, LayoutDashboard, DollarSign, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BulkPaymentCycles } from '../orders/_components/bulk-payment-cycles';
import { PaymentStream } from './_components/payment-stream';
import { PaymentControlPanel } from './_components/payment-control-panel';
import { MarkPaidDialog } from './_components/mark-paid-dialog';
import { PaymentHistoryDialog } from './_components/payment-history-dialog';
import { exportToCSV } from '@/lib/export-utils';
import { MetricCard } from '@/components/analytics/metric-card';
import { downloadInvoice } from '@/lib/pdf-invoice';
import type { Order } from '@/lib/types';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

// Extended order type for payments with additional payment fields
interface PaymentOrder extends Order {
  daysOverdue?: number;
  expectedPaymentDate?: string;
}

export default function PaymentsPage() {
  const { markBulkCycleAsPaid, markOrderAsPaid, markBulkOrdersAsPaid } = useOrderStore();
  const { companies } = useCompanyStore();
  const [allOrders, setAllOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadUnpaidOrders = async () => {
      setLoading(true);
      try {
        // Single fetch - Supabase will return up to its max_rows limit (default 500)
        const { data, error } = await supabase
          .from('orders')
          .select('id, companyId, companyName, branchName, total, orderDate, expectedPaymentDate, daysOverdue, isPaid, paymentStatus, paymentScore, items, status')
          .eq('isPaid', false)
          .order('orderDate', { ascending: false });

        if (error) throw error;
        setAllOrders((data || []) as PaymentOrder[]);
      } catch (e) {
        logger.error(e, { component: 'PaymentsPage', action: 'loadUnpaidOrders' });
        toast({
          variant: "destructive",
          title: "Error loading invoices",
          description: "Could not fetch unpaid orders. Please try again."
        });
      } finally {
        setLoading(false);
      }
    };
    loadUnpaidOrders();
  }, [toast]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [_selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');

  const analytics = useMemo(() => {
    const unpaidOrders = allOrders;
    const overdueOrders = unpaidOrders.filter(o => (o.daysOverdue || 0) > 7);
    const dueThisWeek = unpaidOrders.filter(o => {
      if (!o.expectedPaymentDate) return false;
      const daysUntilDue = Math.ceil((new Date(o.expectedPaymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    });

    const totalOutstanding = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOverdue = overdueOrders.reduce((sum, o) => sum + o.total, 0);

    // Stable sparkline data - seeded based on totals, not random
    const generateSparkline = (base: number) => {
      const points = [];
      for (let i = 0; i < 10; i++) {
        points.push({ value: base * (0.85 + (i % 3) * 0.1) });
      }
      return points;
    };

    return {
      totalOutstanding,
      totalOverdue,
      dueThisWeek: dueThisWeek.reduce((sum, o) => sum + o.total, 0),
      unpaidCount: unpaidOrders.length,
      overdueCount: overdueOrders.length,
      outstandingTrend: generateSparkline(totalOutstanding),
      overdueTrend: generateSparkline(totalOverdue),
    };
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    let filtered = allOrders;

    if (statusFilter === 'overdue') {
      filtered = filtered.filter(o => (o.daysOverdue || 0) > 7);
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(o => (o.daysOverdue || 0) <= 7);
    }

    if (companyFilter !== 'all') {
      filtered = filtered.filter(o => o.companyId === companyFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.companyName?.toLowerCase().includes(search) ||
        o.id.toLowerCase().includes(search)
      );
    }

    return filtered.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
  }, [allOrders, statusFilter, companyFilter, searchTerm]);

  const handleMarkCycleAsPaid = async (cycleId: string, cycleOrders: any[], reference?: string, notes?: string) => {
    try {
      const orderIds = cycleOrders.map(o => o.id);
      await markBulkCycleAsPaid(cycleId, orderIds, new Date().toISOString(), reference, notes);

      // Optimistic Update
      setAllOrders(prev => prev.filter(o => !orderIds.includes(o.id)));
      toast({ title: "Cycle Marked as Paid", description: "Invoices have been updated." });
    } catch (e) {
      logger.error(e, { component: 'PaymentsPage', action: 'handleMarkCycleAsPaid' });
    }
  };

  const handleMarkAsPaid = (orderId: string) => {
    setPendingOrderId(orderId);
    setMarkPaidDialogOpen(true);
  };

  const handleBulkMarkAsPaid = () => {
    setPendingOrderId(null);
    setMarkPaidDialogOpen(true);
  };

  const handleConfirmPayment = async (paidDate: string, reference?: string, notes?: string) => {
    try {
      if (pendingOrderId) {
        await markOrderAsPaid(pendingOrderId, paidDate, reference, notes);
        // Optimistic Update
        setAllOrders(prev => prev.filter(o => o.id !== pendingOrderId));
      } else {
        const idsToPay = Array.from(selectedOrders);
        await markBulkOrdersAsPaid(idsToPay, paidDate, reference, notes);
        // Optimistic Update
        setAllOrders(prev => prev.filter(o => !selectedOrders.has(o.id)));
        setSelectedOrders(new Set());
      }
      setPendingOrderId(null);
    } catch (e) {
      logger.error(e, { component: 'PaymentsPage', action: 'handleConfirmPayment' });
      toast({ variant: "destructive", title: "Action Failed", description: "Could not mark as paid." });
    }
  };

  const handleExport = () => {
    exportToCSV(filteredOrders, companies, 'unpaid-invoices');
  };

  const handleDownloadInvoice = (order: Order) => {
    const company = companies.find(c => c.id === order.companyId);
    if (company) downloadInvoice(order, company);
  }

  // State for history dialog data, used by fetchHistoryAndOpen
  const [historyOrders, setHistoryOrders] = useState<PaymentOrder[]>([]);
  const [_historyLoading, setHistoryLoading] = useState(false);

  // Dedicated history fetcher
  const fetchHistoryAndOpen = async (companyId: string, companyName: string) => {
    setSelectedCompanyId(companyId);
    setSelectedCompanyName(companyName);
    setHistoryLoading(true);
    setHistoryDialogOpen(true); // Open immediately with loading state potentially

    try {
      const { data, error: _error } = await supabase.from('orders')
        .select('*')
        .eq('companyId', companyId)
        .or('isPaid.eq.true,paymentStatus.eq.Paid')
        .order('paidDate', { ascending: false })
        .limit(50);

      if (data) setHistoryOrders(data as PaymentOrder[]);
    } catch (e) {
      logger.error(e);
      toast({ variant: "destructive", title: "Could not load history" });
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col space-y-8 pb-4 overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Financial Command
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Payment Operations & Liquidity Management
          </p>
        </div>
        <Link href="/payments/history">
          <Button variant="outline" className="border-primary/20 hover:bg-primary/10">
            <History className="h-4 w-4 mr-2" />
            Full History
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Outstanding"
          value={`$${analytics.totalOutstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          description={`${analytics.unpaidCount} Active Invoices`}
          icon={<DollarSign className="h-4 w-4" />}
          trend={{ value: 12.5, direction: 'up' }}
          sparklineData={analytics.outstandingTrend}
          variant="default"
          loading={loading}
        />
        <MetricCard
          title="Critical Overdue"
          value={`$${analytics.totalOverdue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          description={`${analytics.overdueCount} Invoices requiring action`}
          icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
          trend={{ value: 5.2, direction: 'down' }}
          sparklineData={analytics.overdueTrend}
          variant="default"
          loading={loading}
        />
        <MetricCard
          title="Due This Week"
          value={`$${analytics.dueThisWeek.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          description="Upcoming Liquidity"
          icon={<Clock className="h-4 w-4 text-yellow-500" />}
          trend={{ value: 0, direction: 'neutral' }}
          variant="compact"
          loading={loading}
        />
        {/* Replaced 'Total Paid' since we don't fetch it anymore, with a placeholder or static info */}
        <MetricCard
          title="System Status"
          value="ONLINE"
          description="Payments Active"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          trend={{ value: 100, direction: 'neutral' }}
          variant="compact"
          loading={loading}
        />
      </div>

      {/* Main Filter & Datagrid Section */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 px-1">
        <PaymentControlPanel
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          companyFilter={companyFilter}
          onCompanyFilterChange={setCompanyFilter}
          companies={companies.filter(c => !c.isBranch)}
          selectedCount={selectedOrders.size}
          onBulkMarkAsPaid={handleBulkMarkAsPaid}
          onExport={handleExport}
        />

        {/* Bulk Payment Cycles */}
        {!loading && allOrders.length > 0 && (
          <BulkPaymentCycles
            orders={allOrders}
            onMarkCycleAsPaid={handleMarkCycleAsPaid}
          />
        )}

        <PaymentStream
          orders={filteredOrders}
          companies={companies}
          selectedOrders={selectedOrders}
          onSelectionChange={setSelectedOrders}
          onMarkAsPaid={handleMarkAsPaid}
          onViewHistory={fetchHistoryAndOpen}
          onDownloadInvoice={handleDownloadInvoice}
          loading={loading}
        />
      </div>

      {/* Dialogs */}
      <MarkPaidDialog
        isOpen={markPaidDialogOpen}
        onOpenChange={setMarkPaidDialogOpen}
        onConfirm={handleConfirmPayment}
        orderCount={pendingOrderId ? 1 : selectedOrders.size}
      />

      <PaymentHistoryDialog
        isOpen={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        companyName={selectedCompanyName}
        orders={historyOrders}
      />
    </div>
  );
}
