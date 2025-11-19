"use client";

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { Order } from '@/lib/types';

interface VirtualizedOrderListProps {
  orders: Order[];
  selectedRowKeys: Set<string>;
  onRowSelectionChange: (id: string, isSelected: boolean) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onCancelOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
}

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

export function VirtualizedOrderList({
  orders,
  selectedRowKeys,
  onRowSelectionChange,
  onUpdateStatus,
  onCancelOrder,
  onDeleteOrder,
}: VirtualizedOrderListProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);
  const orderStatuses: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered'];

  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          No orders found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const order = orders[virtualRow.index];
              return (
                <div
                  key={order.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="border-b"
                >
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/50">
                    <Checkbox
                      checked={selectedRowKeys.has(order.id)}
                      onCheckedChange={(checked) => onRowSelectionChange(order.id, !!checked)}
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                        <p className="font-medium">#{order.id.slice(0, 7)}</p>
                      </div>
                      <div className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                        <div className="flex items-center gap-2">
                          <span>{order.companyName || order.temporaryCompanyName || 'Unknown'}</span>
                          {order.isPotentialClient && <Badge variant="outline">Potential</Badge>}
                        </div>
                      </div>
                      <div className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                        {format(new Date(order.orderDate), 'PPP')}
                      </div>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge variant={getStatusVariant(order.status)} className="cursor-pointer">
                              {order.status}
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {orderStatuses.map(status => (
                              <DropdownMenuItem
                                key={status}
                                onSelect={() => onUpdateStatus(order.id, status)}
                                disabled={order.status === status}
                              >
                                {status}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <Badge variant={getStatusVariant(order.paymentStatus || 'Pending')}>
                          {order.paymentStatus || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                          {formatCurrency(order.total)}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCancelOrder(order)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Order
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => onDeleteOrder(order.id)}>
                              Delete Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
