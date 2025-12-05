'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, TrendingUp, DollarSign, Factory } from 'lucide-react';
import { useManufacturerStore } from '@/store/use-manufacturer-store';
import { useOrderStore } from '@/store/use-order-store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DrillTarget } from '@/components/drilldown/drill-target';
import { Manufacturer, Product, Order, OrderItem } from '@/lib/types';

export default function ManufacturerDrillDownPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { manufacturers, productsByManufacturer, fetchManufacturersAndProducts } = useManufacturerStore();
  const { orders } = useOrderStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (manufacturers.length === 0) {
          await fetchManufacturersAndProducts();
        }
      } catch (error) {
        console.error("Error loading manufacturer data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, manufacturers.length, fetchManufacturersAndProducts]);

  const { manufacturer, products, metrics, recentOrders } = useMemo(() => {
    const manufacturer = manufacturers.find((m: Manufacturer) => m.id === id);
    const products = productsByManufacturer[id] || [];
    
    const productIds = new Set(products.map((p: Product) => p.id));
    const relevantOrders = orders
      .filter(
        (order: Order) =>
          order.items &&
          Array.isArray(order.items) &&
          order.items.some((item: OrderItem) => productIds.has(item.productId))
      )
      .sort(
        (a: Order, b: Order) =>
          new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      );

    const totalRevenue = relevantOrders.reduce((sum: number, order: Order) => {
      const orderRevenue =
        order.items
          ?.filter((item: OrderItem) => productIds.has(item.productId))
          .reduce(
            (itemSum: number, item: OrderItem) => itemSum + item.price * item.quantity,
            0
          ) || 0;
      return sum + orderRevenue;
    }, 0);

    const avgPrice =
      products.length > 0
        ? products.reduce((sum: number, p: Product) => sum + p.price, 0) / products.length
        : 0;

    const productSales: Record<string, number> = {};
    relevantOrders.forEach((order: Order) => {
      order.items?.forEach((item: OrderItem) => {
        if (productIds.has(item.productId)) {
          productSales[item.productId] =
            (productSales[item.productId] || 0) + item.quantity;
        }
      });
    });

    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 1)
      .map(([productId]) => products.find((p: Product) => p.id === productId))
      .filter((p): p is Product => p !== undefined);

    return {
      manufacturer,
      products,
      metrics: {
        totalProducts: products.length,
        totalRevenue,
        avgPrice,
        topProduct: topProducts[0],
      },
      recentOrders: relevantOrders.slice(0, 10),
    };
  }, [id, manufacturers, productsByManufacturer, orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-xl font-semibold">Manufacturer not found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {manufacturer.icon ? (
              <img src={manufacturer.icon} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <Factory className="h-6 w-6" />
            )}
            {manufacturer.name}
          </h1>
          <p className="text-muted-foreground">Manufacturer Performance & Products</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.avgPrice)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Product</CardTitle>
            <Badge variant="secondary">Best Seller</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={metrics.topProduct?.name || 'No sales yet'}>
              {metrics.topProduct?.name || 'No sales yet'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Products from {manufacturer.name}</h2>
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
            No products found for this manufacturer.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product: Product) => (
              <DrillTarget key={product.id} kind="product" payload={{ id: product.id, name: product.name, price: product.price, stock: product.stock }}>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-semibold line-clamp-1">{product.name}</CardTitle>
                      <Badge variant={product.stock > 50 ? 'default' : product.stock > 10 ? 'secondary' : 'destructive'}>
                        {product.stock} in stock
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <div className="text-sm text-muted-foreground">SKU: {product.id.substring(0, 8)}</div>
                      <div className="font-bold text-lg">{formatCurrency(product.price)}</div>
                    </div>
                  </CardContent>
                </Card>
              </DrillTarget>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
            No recent orders found for this manufacturer's products.
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order: Order) => (
              <DrillTarget key={order.id} kind="order" payload={{ id: order.id, total: order.total }}>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex flex-col gap-1">
                      <div className="font-semibold">Order #{order.id.substring(0, 8)}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(order.orderDate)}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{order.status}</Badge>
                      <div className="font-bold">{formatCurrency(order.total)}</div>
                    </div>
                  </CardContent>
                </Card>
              </DrillTarget>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
