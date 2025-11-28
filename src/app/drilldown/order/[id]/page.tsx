'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, User, Calendar } from 'lucide-react';
import { useOrderStore } from '@/store/use-order-store';
import { formatCurrency } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';

import { CalendarSyncButton } from '@/components/google-calendar/calendar-sync-button';

export default function OrderDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const { orders } = useOrderStore();
  
  const orderId = params.id as string;
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold">Order Not Found</h1>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
            <h1 className="text-2xl font-bold tracking-tight">Order #{order.id}</h1>
            <p className="text-muted-foreground">
                Transaction Details
            </p>
            </div>
        </div>
        <CalendarSyncButton order={order} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(order.total)}</div>
            <p className="text-xs text-muted-foreground capitalize">
              Status: {order.status}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <DrillTarget 
              kind="company" 
              payload={{ name: order.companyName || order.branchName }} // Ideally ID
              className="text-2xl font-bold hover:underline cursor-pointer"
            >
              {order.companyName || order.branchName}
            </DrillTarget>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.orderDate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Mock items list since order structure might vary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             <DrillTarget
                kind="product"
                payload={{ id: 'p1' }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">Premium Coffee Beans</span>
                  <span className="text-sm text-muted-foreground">x2</span>
                </div>
                <div className="font-bold">{formatCurrency(50.00)}</div>
              </DrillTarget>
              <DrillTarget
                kind="product"
                payload={{ id: 'p3' }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">Paper Cups</span>
                  <span className="text-sm text-muted-foreground">x1</span>
                </div>
                <div className="font-bold">{formatCurrency(45.00)}</div>
              </DrillTarget>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
