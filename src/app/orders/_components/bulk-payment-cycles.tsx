"use client"

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, DollarSign, CheckCircle } from 'lucide-react';
import type { Order } from '@/lib/types';

interface BulkPaymentCyclesProps {
  orders: Order[];
  onMarkCycleAsPaid: (cycleId: string, orders: Order[]) => void;
}

export function BulkPaymentCycles({ orders, onMarkCycleAsPaid }: BulkPaymentCyclesProps) {
  const cycles = useMemo(() => {
    const cycleMap = new Map<string, Order[]>();
    
    orders
      .filter(o => o.bulkPaymentCycleId && !o.isPaid)
      .forEach(order => {
        const cycleId = order.bulkPaymentCycleId!;
        if (!cycleMap.has(cycleId)) {
          cycleMap.set(cycleId, []);
        }
        cycleMap.get(cycleId)!.push(order);
      });
    
    return Array.from(cycleMap.entries())
      .map(([cycleId, orders]) => {
        const paymentDate = orders[0].expectedPaymentDate!;
        const totalAmount = orders.reduce((sum, o) => sum + o.total, 0);
        const companyName = orders[0].companyName;
        const daysOverdue = orders[0].daysOverdue || 0;
        const isOverdue = daysOverdue > 7;
        
        return {
          cycleId,
          paymentDate,
          companyName,
          orders,
          totalAmount,
          orderCount: orders.length,
          daysOverdue,
          isOverdue,
        };
      })
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }, [orders]);

  if (cycles.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Bulk Payment Cycles</h2>
      <div className="grid gap-4">
        {cycles.map((cycle) => (
          <Card key={cycle.cycleId} className={cycle.isOverdue ? 'border-red-500' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{cycle.companyName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Payment Due: {format(new Date(cycle.paymentDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                {cycle.isOverdue && (
                  <Badge variant="destructive">
                    Overdue by {cycle.daysOverdue} days
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Orders</p>
                    <p className="text-2xl font-bold">{cycle.orderCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold flex items-center gap-1">
                      <DollarSign className="h-5 w-5" />
                      {cycle.totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => onMarkCycleAsPaid(cycle.cycleId, cycle.orders)}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark All as Paid
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Orders in this cycle:</p>
                <div className="flex flex-wrap gap-2">
                  {cycle.orders.slice(0, 10).map((order) => (
                    <Badge key={order.id} variant="outline">
                      #{order.id.substring(0, 7)}
                    </Badge>
                  ))}
                  {cycle.orders.length > 10 && (
                    <Badge variant="outline">+{cycle.orders.length - 10} more</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
