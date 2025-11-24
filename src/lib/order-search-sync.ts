
import { supabase } from './supabase';
import type { Order } from './types';

export interface OrderSearchDoc {
  id: string;
  companyName: string;
  companyId: string;
  branchName: string;
  status: Order['status'];
  paymentStatus: Order['paymentStatus'];
  orderDate: string;
  total: number;
  isPotentialClient: boolean;
}

export async function syncOrderToSearch(order: Order): Promise<void> {
  const searchDoc: OrderSearchDoc = {
    id: order.id,
    companyName: (order.companyName || order.temporaryCompanyName || '').toLowerCase(),
    companyId: order.companyId || '',
    branchName: (order.branchName || order.temporaryBranchName || '').toLowerCase(),
    status: order.status,
    paymentStatus: order.paymentStatus || 'Pending',
    orderDate: order.orderDate,
    total: order.total,
    isPotentialClient: order.isPotentialClient || false,
  };

  await supabase.from('orders_search').upsert(searchDoc);
}

export async function deleteOrderFromSearch(orderId: string): Promise<void> {
  await supabase.from('orders_search').delete().eq('id', orderId);
}

export async function bulkSyncOrdersToSearch(orders: Order[]): Promise<void> {
  const BATCH_SIZE = 500;

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batchOrders = orders.slice(i, i + BATCH_SIZE);
    const searchDocs: OrderSearchDoc[] = batchOrders.map(order => ({
        id: order.id,
        companyName: (order.companyName || order.temporaryCompanyName || '').toLowerCase(),
        companyId: order.companyId || '',
        branchName: (order.branchName || order.temporaryBranchName || '').toLowerCase(),
        status: order.status,
        paymentStatus: order.paymentStatus || 'Pending',
        orderDate: order.orderDate,
        total: order.total,
        isPotentialClient: order.isPotentialClient || false,
    }));

    const { error } = await supabase.from('orders_search').upsert(searchDocs);
    if (error) {
        console.error('Error in bulk sync to search:', error);
    }
  }
}
