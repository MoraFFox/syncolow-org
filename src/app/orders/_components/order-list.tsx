
"use client";


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Order, Company } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { DrillTarget } from '@/components/drilldown/drill-target';

interface OrderListProps {
  orders: Order[];
  companies: Company[];
  selectedRowKeys: Set<string>;
  onRowSelectionChange: (id: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
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


export function OrderList({
  orders,
  companies,
  selectedRowKeys,
  onRowSelectionChange,
  onSelectAll,
  onUpdateStatus,
  onCancelOrder,
  onDeleteOrder,
}: OrderListProps) {
  const router = useRouter();
  const orderStatuses: Order['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered'];

  // Resolve company name from companyId as source of truth
  const getCompanyName = (order: Order): string => {
    if (order.isPotentialClient) {
      return order.temporaryCompanyName || 'Unknown Client';
    }

    const company = companies.find(c => c.id === order.companyId);
    return company?.name || order.companyName || 'Unknown Client';
  };

  const renderMobileView = () => (
    <div className="grid grid-cols-1 gap-4 md:hidden">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <DrillTarget kind="company" payload={{ id: order.companyId, name: getCompanyName(order) }} asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <p className="font-semibold">{getCompanyName(order)}</p>
                    {order.isPotentialClient && <Badge variant="outline">Potential</Badge>}
                  </div>
                </DrillTarget>
                <DrillTarget kind="order" payload={{ id: order.id }} asChild>
                  <p className="text-sm text-muted-foreground cursor-pointer">#{order.id.slice(0, 7)}</p>
                </DrillTarget>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 -mr-2">
                    <span className="sr-only">Open menu</span>
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

            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">{format(new Date(order.orderDate), 'PPP')}</p>
                <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-right text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Order</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge variant={getStatusVariant(order.status)} className="cursor-pointer">{order.status}</Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {orderStatuses.map(status => (
                        <DropdownMenuItem key={status} onSelect={() => onUpdateStatus(order.id, status)} disabled={order.status === status}>
                          {status}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant={getStatusVariant(order.paymentStatus || 'Pending')} className="capitalize">{order.paymentStatus || 'Pending'}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {orders.length === 0 && <p className="text-center text-muted-foreground py-10 md:hidden">No results found.</p>}
    </div>
  );

  const renderDesktopView = () => (
    <Card className="hidden md:block">
      <CardContent className="p-0 overflow-visible">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedRowKeys.size > 0 && selectedRowKeys.size === orders.length}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <TableRow key={order.id} data-state={selectedRowKeys.has(order.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRowKeys.has(order.id)}
                      onCheckedChange={(checked) => onRowSelectionChange(order.id, !!checked)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <DrillTarget kind="order" payload={{ id: order.id }} asChild>
                      <span className="cursor-pointer">#{order.id.slice(0, 7)}</span>
                    </DrillTarget>
                  </TableCell>
                  <TableCell>
                    <DrillTarget kind="company" payload={{ id: order.companyId, name: getCompanyName(order) }} asChild>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <span>{getCompanyName(order)}</span>
                        {order.isPotentialClient && <Badge variant="outline">Potential</Badge>}
                      </div>
                    </DrillTarget>
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>{format(new Date(order.orderDate), 'PPP')}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                    {order.deliveryDate ? format(new Date(order.deliveryDate), 'PPP') : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge variant={getStatusVariant(order.status)} className="cursor-pointer">{order.status}</Badge>
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
                  </TableCell>
                  <TableCell className="text-right cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>{formatCurrency(order.total)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
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
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && <TableRow><TableCell colSpan={8} className="text-center h-24">No orders found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {renderMobileView()}
      {renderDesktopView()}
    </>
  )
}
