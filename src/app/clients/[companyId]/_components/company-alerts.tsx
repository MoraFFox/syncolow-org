
"use client";

import { useMemo } from 'react';
import type { Order, Product, Company } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Package, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface CompanyAlertsProps {
  orders: Order[];
  products: Product[];
  branches: (Company & { isBranch: true })[];
}

export function CompanyAlerts({ orders, products, branches }: CompanyAlertsProps) {

  const overduePayments = useMemo(() => {
    return orders.filter(o => o.paymentStatus === 'Overdue');
  }, [orders]);

  const lowStockProducts = useMemo(() => {
    const productIdsInOrders = new Set(orders.flatMap(o => o.items.map(i => i.productId)));
    return products.filter(p => productIdsInOrders.has(p.id) && p.stock < 10);
  }, [orders, products]);

  const hasAlerts = overduePayments.length > 0 || lowStockProducts.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Company-Specific Alerts
        </CardTitle>
        <CardDescription>Urgent issues across all branches.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAlerts ? (
          <>
            {overduePayments.length > 0 && (
              <Link href="/orders?filter=overdue">
                <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10 hover:bg-destructive/20 transition-colors">
                  <div className="flex items-center gap-2 font-semibold text-destructive">
                    <DollarSign className="h-4 w-4" />
                    {overduePayments.length} Overdue Payment(s)
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">
                    Payments for orders from {new Set(overduePayments.map(o => o.branchName)).size} branch(es) are overdue.
                  </p>
                </div>
              </Link>
            )}
            {lowStockProducts.length > 0 && (
              <Link href="/products?filter=low_stock">
                 <div className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                  <div className="flex items-center gap-2 font-semibold text-amber-700">
                    <Package className="h-4 w-4" />
                    {lowStockProducts.length} Low-Stock Product(s)
                  </div>
                   <p className="text-sm text-amber-600/80 mt-1">
                    Key products for this company are running low.
                  </p>
                </div>
              </Link>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">No specific alerts for this company.</p>
        )}
      </CardContent>
    </Card>
  );
}
