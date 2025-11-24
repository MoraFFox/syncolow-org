'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, CreditCard, History } from 'lucide-react';
import { useCompanyStore } from '@/store/use-company-store';
import { useOrderStore } from '@/store/use-order-store';
import { formatCurrency } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';

export default function ClientDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const { companies } = useCompanyStore();
  const { orders } = useOrderStore();
  
  const clientId = params.id as string;
  const client = companies.find(c => c.id === clientId) || { name: 'Unknown Client', status: 'Inactive' as const };

  const clientOrders = React.useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => (o.companyName || o.branchName) === client.name); // Assuming simple name match for now
  }, [orders, client.name]);

  const totalSpent = clientOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">
            Client Profile & History
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{client.status}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientOrders.map((order) => (
              <DrillTarget
                key={order.id}
                kind="order"
                payload={{ id: order.id, total: order.total }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">Order #{order.id}</span>
                  <span className="text-sm text-muted-foreground">{order.orderDate}</span>
                </div>
                <div className="font-bold">{formatCurrency(order.total)}</div>
              </DrillTarget>
            ))}
            {clientOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No orders found for this client.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
