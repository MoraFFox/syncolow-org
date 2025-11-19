
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AllOrdersProps {
  orders: Order[];
}

export function AllOrders({ orders }: AllOrdersProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Delivered':
      case 'Paid':
        return 'default';
      case 'Processing':
      case 'Shipped':
      case 'Pending':
        return 'secondary';
      case 'Cancelled':
      case 'Overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Company Orders</CardTitle>
        <CardDescription>A complete list of orders from all branches.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
             {orders.map(order => (
                <Link href={`/orders/${order.id}`} key={order.id} className="active:scale-95 transition-transform">
                    <Card>
                        <CardContent className="p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-primary">#{order.id.slice(0,7)}</p>
                                    <p className="text-sm font-medium">{order.branchName}</p>
                                </div>
                                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                            </div>
                            <div className="flex justify-between items-end pt-2">
                                <p className="text-sm text-muted-foreground">{format(new Date(order.orderDate), 'PPP')}</p>
                                <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
             ))}
             {orders.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No orders found for this company.</p>
             )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link href={`/orders/${order.id}`} className="hover:underline">#{order.id.slice(0, 7)}</Link>
                      </TableCell>
                      <TableCell>{order.branchName}</TableCell>
                      <TableCell>{format(new Date(order.orderDate), 'PPP')}</TableCell>
                      <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">No orders found for this company.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
