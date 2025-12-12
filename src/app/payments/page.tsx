"use client"

import { useState, useMemo, useEffect } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertTriangle, Clock, CheckCircle2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BulkPaymentCycles } from '../orders/_components/bulk-payment-cycles';
import { UnpaidInvoicesTable } from './_components/unpaid-invoices-table';
import { PaymentFilters } from './_components/payment-filters';
import { MarkPaidDialog } from './_components/mark-paid-dialog';
import { PaymentHistoryDialog } from './_components/payment-history-dialog';
import { exportToCSV } from '@/lib/export-utils';
import type { Order } from '@/lib/types';

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

  useEffect(() => {
    const loadAllOrders = async () => {
      setLoading(true);
      try {
        let allData: PaymentOrder[] = [];
        const seenIds = new Set<string>();
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('orderDate', { ascending: false })
            .range(from, from + batchSize - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            const uniqueData = (data as PaymentOrder[]).filter((order: PaymentOrder) => {
              if (seenIds.has(order.id)) return false;
              seenIds.add(order.id);
              return true;
            });
            allData = [...allData, ...uniqueData];
            from += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        setAllOrders(allData);
      } catch (e) {
        console.error('Error loading orders:', e);
      }
      setLoading(false);
    };
    loadAllOrders();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');

  const analytics = useMemo(() => {
    const unpaidOrders = allOrders.filter(o => !o.isPaid && o.paymentStatus !== 'Paid');
    const overdueOrders = unpaidOrders.filter(o => (o.daysOverdue || 0) > 7);
    const dueThisWeek = unpaidOrders.filter(o => {
      if (!o.expectedPaymentDate) return false;
      const daysUntilDue = Math.ceil((new Date(o.expectedPaymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    });

    const paidOrders = allOrders.filter(o => o.isPaid || o.paymentStatus === 'Paid');

    return {
      totalOutstanding: unpaidOrders.reduce((sum, o) => sum + o.total, 0),
      totalOverdue: overdueOrders.reduce((sum, o) => sum + o.total, 0),
      dueThisWeek: dueThisWeek.reduce((sum, o) => sum + o.total, 0),
      totalPaid: paidOrders.reduce((sum, o) => sum + o.total, 0),
      unpaidCount: unpaidOrders.length,
      overdueCount: overdueOrders.length,
    };
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    let filtered = allOrders.filter(o => !o.isPaid && o.paymentStatus !== 'Paid');

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
    const orderIds = cycleOrders.map(o => o.id);
    await markBulkCycleAsPaid(cycleId, orderIds, new Date().toISOString(), reference, notes);
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
    if (pendingOrderId) {
      await markOrderAsPaid(pendingOrderId, paidDate, reference, notes);
    } else {
      await markBulkOrdersAsPaid(Array.from(selectedOrders), paidDate, reference, notes);
      setSelectedOrders(new Set());
    }
    setPendingOrderId(null);
  };

  const handleExport = () => {
    exportToCSV(filteredOrders, companies, 'unpaid-invoices');
  };

  const handleViewHistory = (companyId: string, companyName: string) => {
    setSelectedCompanyId(companyId);
    setSelectedCompanyName(companyName);
    setHistoryDialogOpen(true);
  };

  const companyOrders = selectedCompanyId
    ? allOrders.filter(o => o.companyId === selectedCompanyId)
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments & Invoices</h1>
          <p className="text-muted-foreground">
            Manage payments, track invoices, and monitor payment cycles
          </p>
        </div>
        <Link href="/payments/history">
          <Button variant="outline">
            <History className="h-4 w-4 mr-2" />
            Payment History
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.totalOutstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.unpaidCount} unpaid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${analytics.totalOverdue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.overdueCount} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${analytics.dueThisWeek.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${analytics.totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <PaymentFilters
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
      {!loading && (
        <BulkPaymentCycles
          orders={allOrders}
          onMarkCycleAsPaid={handleMarkCycleAsPaid}
        />
      )}

      {/* Unpaid Invoices Table */}
      <UnpaidInvoicesTable
        orders={filteredOrders}
        companies={companies}
        selectedOrders={selectedOrders}
        onSelectionChange={setSelectedOrders}
        onMarkAsPaid={handleMarkAsPaid}
        onViewHistory={handleViewHistory}
      />

      {/* Mark Paid Dialog */}
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
        orders={companyOrders}
      />
    </div>
  );
}
