import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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

  await setDoc(doc(db, 'orders_search', order.id), searchDoc);
}

export async function deleteOrderFromSearch(orderId: string): Promise<void> {
  await deleteDoc(doc(db, 'orders_search', orderId));
}

export async function bulkSyncOrdersToSearch(orders: Order[]): Promise<void> {
  const batches: any[] = [];
  const BATCH_SIZE = 500;

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchOrders = orders.slice(i, i + BATCH_SIZE);

    batchOrders.forEach(order => {
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

      batch.set(doc(db, 'orders_search', order.id), searchDoc);
    });

    batches.push(batch.commit());
  }

  await Promise.all(batches);
}

