
"use client"

import { useState, useMemo, useEffect } from 'react';
import { useOrderStore } from '@/store/use-order-store';
import { useCompanyStore } from '@/store/use-company-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Calendar as CalendarIcon, Download, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function PaymentHistoryPage() {
  const { companies } = useCompanyStore();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadAllOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('orderDate', { ascending: false });
            
        if (error) throw error;
        setAllOrders(data || []);
      } catch (e) {
        console.error('Error loading orders:', e);
      }
      setLoading(false);
    };
    loadAllOrders();
  }, []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const paidOrders = useMemo(() => {
    return allOrders.filter(o => o.isPaid || o.paymentStatus === 'Paid');
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    let filtered = [...paidOrders];
    
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
        const orderDateStr = o.orderDate?.split('T')[0];
        return orderDateStr && orderDateStr >= fromStr;
      });
    }
    
    if (dateTo) {
      const toStr = format(dateTo, 'yyyy-MM-dd');
      filtered = filtered.filter(o => {
        const orderDateStr = o.orderDate?.split('T')[0];
        return orderDateStr && orderDateStr <= toStr;
      });
    }
    
    if (amountMin) {
      filtered = filtered.filter(o => o.total >= parseFloat(amountMin));
    }
    
    if (amountMax) {
      filtered = filtered.filter(o => o.total <= parseFloat(amountMax));
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.paidDate ? new Date(a.paidDate).getTime() : 0;
      const dateB = b.paidDate ? new Date(b.paidDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [paidOrders, companyFilter, searchTerm, dateFrom, dateTo, amountMin, amountMax]);

  const analytics = useMemo(() => {
    return {
      totalPaid: filteredOrders.reduce((sum, o) => sum + o.total, 0),
      count: filteredOrders.length,
      avgPayment: filteredOrders.length > 0 ? filteredOrders.reduce((sum, o) => sum + o.total, 0) / filteredOrders.length : 0,
    };
  }, [filteredOrders]);

  const clearFilters = () => {
    setSearchTerm('');
    setCompanyFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setAmountMin('');
    setAmountMax('');
  };

  const handleExport = () => {
    const csv = [
      ['Order ID', 'Company', 'Branch', 'Order Date', 'Paid Date', 'Amount', 'Reference', 'Notes'].join(','),
      ...filteredOrders.map(o => [
        o.id,
        o.companyName || '',
        o.branchName || '',
        format(new Date(o.orderDate), 'yyyy-MM-dd'),
        o.paidDate ? format(new Date(o.paidDate), 'yyyy-MM-dd') : '',
        o.total,
        o.paymentReference || '',
        o.paymentNotes || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/payments">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-muted-foreground">View and filter all completed payments</p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.avgPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Order ID, company, reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.filter(c => !c.isBranch).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min Amount</label>
              <Input
                type="number"
                placeholder="0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Amount</label>
              <Input
                type="number"
                placeholder="999999"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records ({loading ? '...' : filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payment history...</div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/orders/${order.id}`} className="text-primary hover:underline">
                        #{order.id.slice(0, 7)}
                      </Link>
                    </TableCell>
                    <TableCell>{order.companyName}</TableCell>
                    <TableCell>{order.branchName}</TableCell>
                    <TableCell>{format(new Date(order.orderDate), 'PP')}</TableCell>
                    <TableCell>
                      {order.paidDate ? format(new Date(order.paidDate), 'PP') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${order.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell>
                      {order.paymentReference ? (
                        <Badge variant="outline">{order.paymentReference}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {order.paymentNotes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      No payment records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
