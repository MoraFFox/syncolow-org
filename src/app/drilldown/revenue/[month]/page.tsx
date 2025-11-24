'use client';

import * as React from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { useOrderStore } from '@/store/use-order-store';
import { formatCurrency } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';

export default function RevenueDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { orders } = useOrderStore();
  
  const month = params.month as string;
  const granularity = searchParams.get('granularity') || 'monthly';

  // Filter orders for the selected month
  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => order.orderDate.startsWith(month));
  }, [orders, month]);

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Revenue Analysis</h1>
            <p className="text-muted-foreground">
              Detailed breakdown for {month} ({granularity})
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Change Period
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredOrders.length} orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12.5%</div>
            <p className="text-xs text-muted-foreground">
              vs previous month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <DrillTarget
                key={order.id}
                kind="order"
                payload={{ id: order.id, total: order.total }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">Order #{order.id}</span>
                  <span className="text-sm text-muted-foreground">{order.companyName || order.branchName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{order.orderDate}</span>
                  <span className="font-bold">{formatCurrency(order.total)}</span>
                </div>
              </DrillTarget>
            ))}
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for this period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
