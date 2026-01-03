"use client"

import { useState, useMemo, useEffect } from 'react';
import { useCompanyStore } from '@/store/use-company-store';
import { ArrowLeft, Wallet, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/lib/types';
import { MetricCard } from '@/components/analytics/metric-card';
import { HistoryControlPanel } from './_components/history-control-panel';
import { HistoryLedger } from './_components/history-ledger';
import { downloadInvoice } from '@/lib/pdf-invoice';
import { exportToCSV } from '@/lib/export-utils';

// Extended order type for payments with additional payment fields
interface PaymentHistoryOrder extends Order {
  paidDate?: string;
  paymentReference?: string;
  paymentNotes?: string;
}

export default function PaymentHistoryPage() {
  const { companies } = useCompanyStore();
  const [allOrders, setAllOrders] = useState<PaymentHistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Optimized Fetch
  useEffect(() => {
    const loadPaidOrders = async () => {
      setLoading(true);
      try {
        // Single fetch - Supabase will return up to its max_rows limit (default 500)
        const { data, error } = await supabase
          .from('orders')
          .select('id, companyId, companyName, branchName, total, orderDate, paidDate, paymentReference, paymentNotes, isPaid, paymentStatus, items')
          .eq('isPaid', true)
          .order('paidDate', { ascending: false });

        if (error) throw error;
        setAllOrders((data || []) as PaymentHistoryOrder[]);
      } catch (e) {
        console.error('Error loading payment history:', e);
      } finally {
        setLoading(false);
      }
    };
    loadPaidOrders();
  }, []);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Filter Logic
  const filteredOrders = useMemo(() => {
    let filtered = allOrders;

    if (companyFilter !== 'all') {
      filtered = filtered.filter(o => o.companyId === companyFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.companyName?.toLowerCase().includes(search) ||
        o.id.toLowerCase().includes(search) ||
        o.paymentReference?.toLowerCase().includes(search)
      );
    }

    if (dateFrom) {
      const fromStr = format(dateFrom, 'yyyy-MM-dd');
      filtered = filtered.filter(o => {
        const dateStr = o.paidDate?.split('T')[0];
        return dateStr && dateStr >= fromStr;
      });
    }

    if (dateTo) {
      const toStr = format(dateTo, 'yyyy-MM-dd');
      filtered = filtered.filter(o => {
        const dateStr = o.paidDate?.split('T')[0];
        return dateStr && dateStr <= toStr;
      });
    }

    return filtered;
  }, [allOrders, companyFilter, searchTerm, dateFrom, dateTo]);

  // Analytics Logic
  const analytics = useMemo(() => {
    const totalPaid = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const count = filteredOrders.length;
    const avgPayment = count > 0 ? totalPaid / count : 0;

    return {
      totalPaid,
      count,
      avgPayment,
      // Mock trends
      trendPaid: Array.from({ length: 10 }, () => ({ value: totalPaid * (0.8 + Math.random() * 0.4) })),
      trendVol: Array.from({ length: 10 }, () => ({ value: count * (0.8 + Math.random() * 0.4) })),
    };
  }, [filteredOrders]);

  const handleExport = () => {
    exportToCSV(filteredOrders, companies, 'payment-history-ledger');
  };

  const handleDownloadInvoice = (order: Order) => {
    const company = companies.find(c => c.id === order.companyId);
    if (company) downloadInvoice(order, company);
  };

  return (
    <div className="h-screen flex flex-col space-y-8 pb-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/payments">
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Financial Archives
            </h1>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 pl-9">
            <Activity className="h-4 w-4" />
            Verified Transaction Ledger & Audit Logs
          </p>
        </div>
      </div>

      {/* Metrics Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Liquidity Secured"
          value={`$${analytics.totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          description="Verified Inflows"
          icon={<Wallet className="h-4 w-4 text-primary" />}
          trend={{ value: 12.5, direction: 'up' }}
          sparklineData={analytics.trendPaid}
          variant="default"
          loading={loading}
        />
        <MetricCard
          title="Transaction Velocity"
          value={analytics.count.toString()}
          description="Processed Events"
          icon={<Activity className="h-4 w-4 text-emerald-500" />}
          trend={{ value: 8.2, direction: 'up' }}
          sparklineData={analytics.trendVol}
          variant="default"
          loading={loading}
        />
        <MetricCard
          title="Avg. Ticket Size"
          value={`$${analytics.avgPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          description="Per Transaction"
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          trend={{ value: 2.1, direction: 'neutral' }}
          variant="compact"
          loading={loading}
        />
      </div>

      {/* Control Panel & Ledger */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 px-1">
        <HistoryControlPanel
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          companyFilter={companyFilter}
          onCompanyFilterChange={setCompanyFilter}
          companies={companies.filter(c => !c.isBranch)}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          onExport={handleExport}
          totalRecords={filteredOrders.length}
        />

        <HistoryLedger
          orders={filteredOrders}
          loading={loading}
          onDownloadInvoice={handleDownloadInvoice}
        />
      </div>
    </div>
  );
}
