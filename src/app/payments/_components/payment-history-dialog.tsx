"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Order } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, ArrowUpRight } from 'lucide-react';

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
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-border/50 bg-muted/20">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold tracking-tight">Payment History</DialogTitle>
              <Badge variant="outline" className="font-mono">{companyName}</Badge>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Total Lifetime Volume</span>
                <span className="text-2xl font-mono font-bold text-emerald-500">
                  ${totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-border mx-4" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Transactions</span>
                <span className="text-lg font-mono font-bold text-foreground">
                  {paidOrders.length}
                </span>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="h-[500px] p-0">
          <div className="flex flex-col">
            {paidOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-3 opacity-20" />
                <p>No payment history records found.</p>
              </div>
            ) : (
              paidOrders.map((order, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={order.id}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-border/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mt-1 sm:mt-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Payment Received</span>
                        <span className="text-xs text-muted-foreground font-mono">#{order.id.substring(0, 8)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {order.paidDate ? format(new Date(order.paidDate), 'PP p') : format(new Date(order.orderDate), 'PP')}
                      </span>
                      {order.paymentNotes && (
                        <p className="text-xs text-muted-foreground mt-1 italic max-w-[300px]">
                          "{order.paymentNotes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end mt-2 sm:mt-0 pl-14 sm:pl-0">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +${order.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {order.paymentReference || 'No Ref'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                        <FileText className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
