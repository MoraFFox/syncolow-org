'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { useOrderStore } from '@/store/use-order-store';
import { formatCurrency } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';

// Mock product data since we don't have a dedicated product store with full details
const MOCK_PRODUCTS: Record<string, any> = {
  'p1': { name: 'Premium Coffee Beans', price: 25.00, stock: 150, category: 'Ingredients' },
  'p2': { name: 'Espresso Machine X1', price: 1200.00, stock: 5, category: 'Equipment' },
  'p3': { name: 'Paper Cups (1000x)', price: 45.00, stock: 500, category: 'Supplies' },
};

export default function ProductDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const { orders } = useOrderStore();
  
  const productId = params.id as string;
  const product = MOCK_PRODUCTS[productId] || { name: `Product ${productId}`, price: 0, stock: 0, category: 'Unknown' };

  // Find orders containing this product (mock logic as order structure might vary)
  const productOrders = React.useMemo(() => {
    if (!orders) return [];
    // Assuming orders might have items, but for now just filtering by ID for demo purposes
    // In a real app, we'd check order.items
    return orders.slice(0, 5); // Just showing recent orders as mock
  }, [orders]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground">
            Product Analysis & Performance
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.stock} units</div>
            <p className="text-xs text-muted-foreground">
              {product.stock < 10 ? 'Low stock warning' : 'Healthy inventory'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(product.price)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+5.2%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productOrders.map((order) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
