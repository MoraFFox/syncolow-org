/** @format */
"use client";

import { useState } from 'react';
import { Order } from '@/lib/types';
import { useOptimisticMutation } from '@/hooks/use-optimistic-mutation';
import { useOrderStore } from '@/store/use-order-store';
import { Button } from '@/components/ui/button';
import { OptimisticStatusBadge } from '@/components/ui/optimistic-status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OptimisticOrderStatusUpdateProps {
  order: Order;
}

export function OptimisticOrderStatusUpdate({ order }: OptimisticOrderStatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState<Order['status']>(order.status);
  const updateOrderStatus = useOrderStore(state => state.updateOrderStatus);
  const { mutate, isPending } = useOptimisticMutation<Order, { status: Order['status'] }>({
    entity: 'orders',
    mutationFn: async ({ status }) => {
      await updateOrderStatus(order.id, status);
      return { ...order, status };
    },
    getOptimisticData: ({ status }) => ({ ...order, status } as Order),
    onOptimistic: (data) => {
      // Optimistic update in store
      useOrderStore.setState(state => ({
        orders: state.orders.map(o =>
          o.id === order.id ? { ...o, ...data } : o
        )
      }));
    },
    onSuccess: () => {
      console.log('Status updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update status:', error);
    }
  });

  const handleStatusChange = async () => {
    if (selectedStatus === order.status) return;
    mutate({ status: selectedStatus });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as Order['status'])}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="Confirmed">Confirmed</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Delivered">Delivered</SelectItem>
          <SelectItem value="Cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={handleStatusChange} disabled={isPending || selectedStatus === order.status}>
        Update
      </Button>
      <OptimisticStatusBadge isPending={isPending} />
    </div>
  );
}
