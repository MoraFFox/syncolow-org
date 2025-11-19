
"use client";

import { useMemo } from 'react';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package } from 'lucide-react';
import Link from 'next/link';

interface TopProductsProps {
  orders: Order[];
}

export function TopProducts({ orders }: TopProductsProps) {
  const topProducts = useMemo(() => {
    const productSales: Record<string, { id: string; name: string; quantity: number; revenue: number }> = {};

    orders.forEach(order => {
      if (order.status === 'Cancelled') return;
      
      order.items.forEach(item => {
        if (productSales[item.productId]) {
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.price * item.quantity;
        } else {
          productSales[item.productId] = {
            id: item.productId,
            name: item.productName,
            quantity: item.quantity,
            revenue: item.price * item.quantity,
          };
        }
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Top Products
        </CardTitle>
        <CardDescription>Most purchased products by this company.</CardDescription>
      </CardHeader>
      <CardContent>
        {topProducts.length > 0 ? (
            <div className="space-y-3">
                {topProducts.map(product => (
                    <Link href={`/products/${product.id}`} key={product.id}>
                        <div className="flex items-center justify-between p-3 rounded-md border hover:bg-muted transition-colors">
                            <p className="font-medium text-sm">{product.name}</p>
                            <div className="text-right">
                                <p className="text-sm font-bold">{product.quantity} units</p>
                                <p className="text-xs text-muted-foreground">${product.revenue.toFixed(2)}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No order data available.</p>
        )}
      </CardContent>
    </Card>
  );
}
