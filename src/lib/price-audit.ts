/** @format */

import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

export interface PriceAuditEntry {
  id?: string;
  productId: string;
  productName: string;
  price: number;
  source: 'import' | 'manual' | 'system';
  orderId?: string;
  timestamp: string;
  userId?: string;
}

export async function logPriceAudit(entry: Omit<PriceAuditEntry, 'id' | 'timestamp'>) {
  await addDoc(collection(db, 'priceAudit'), {
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export async function getPriceHistory(productId: string): Promise<PriceAuditEntry[]> {
  const q = query(
    collection(db, 'priceAudit'),
    where('productId', '==', productId),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PriceAuditEntry[];
}