"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Order } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PaymentHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  orders: Order[];
}

export function PaymentHistoryDialog({ isOpen, onOpenChange, companyName, orders }: PaymentHistoryDialogProps) {
  const paidOrders = orders
    .filter(o => o.isPaid || o.paymentStatus === 'Paid')
    .sort((a, b) => new Date(b.paidDate || b.orderDate).getTime() - new Date(a.paidDate || a.orderDate).getTime());

  const totalPaid = paidOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Payment History - {companyName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Total Paid: ${totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({paidOrders.length} payments)
          </p>
        </DialogHeader>
        
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paidOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No payment history found
                  </TableCell>
                </TableRow>
              ) : (
                paidOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>{format(new Date(order.orderDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {order.paidDate ? format(new Date(order.paidDate), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${order.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell>
                      {order.paymentReference ? (
                        <Badge variant="outline">{order.paymentReference}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {order.paymentNotes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
