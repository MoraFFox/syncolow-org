"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ExternalLink, FileText, History } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentScoreBadge } from '@/components/payment-score-badge';
import type { Order, Company } from '@/lib/types';
import Link from 'next/link';
import { downloadInvoice } from '@/lib/pdf-invoice';

interface UnpaidInvoicesTableProps {
  orders: Order[];
  companies: Company[];
  selectedOrders: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onMarkAsPaid: (orderId: string) => void;
  onViewHistory: (companyId: string, companyName: string) => void;
}

function handleDownloadInvoice(order: Order, companies: Company[]) {
  const company = companies.find(c => c.id === order.companyId);
  downloadInvoice(order, company);
}

export function UnpaidInvoicesTable({
  orders,
  companies,
  selectedOrders,
  onSelectionChange,
  onMarkAsPaid,
  onViewHistory,
}: UnpaidInvoicesTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(orders.map(o => o.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (orderId: string, checked: boolean) => {
    const newSet = new Set(selectedOrders);
    if (checked) {
      newSet.add(orderId);
    } else {
      newSet.delete(orderId);
    }
    onSelectionChange(newSet);
  };

  const getPaymentMethod = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.paymentMethod === 'check' ? 'Check' : 'Transfer';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unpaid Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={orders.length > 0 && selectedOrders.size === orders.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Score</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No unpaid invoices found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const daysOverdue = order.daysOverdue || 0;
                  const isOverdue = daysOverdue > 7;
                  const company = companies.find(c => c.id === order.companyId);
                  
                  return (
                    <TableRow key={order.id} className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={(checked) => handleSelectOne(order.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <Link href={`/orders?filter=${order.id}`} className="hover:underline flex items-center gap-1">
                          #{order.id.substring(0, 8)}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{order.companyName}</TableCell>
                      <TableCell>{format(new Date(order.orderDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {order.expectedPaymentDate ? (
                          <div className="flex flex-col">
                            <span>{format(new Date(order.expectedPaymentDate), 'MMM dd, yyyy')}</span>
                            {isOverdue && (
                              <span className="text-xs text-red-600 font-medium">
                                {daysOverdue} days overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${order.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        {isOverdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <PaymentScoreBadge 
                          score={order.paymentScore || 100} 
                          status={company?.paymentStatus}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getPaymentMethod(order.companyId)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewHistory(order.companyId, order.companyName || 'Unknown')}
                            title="View payment history"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoice(order, companies)}
                            title="Download invoice"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMarkAsPaid(order.id)}
                            className="gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark Paid
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
