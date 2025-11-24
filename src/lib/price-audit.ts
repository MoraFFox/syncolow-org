
/** @format */

import { supabase } from './supabase';

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
  await supabase.from('priceAudit').insert({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export async function getPriceHistory(productId: string): Promise<PriceAuditEntry[]> {
  const { data } = await supabase
    .from('priceAudit')
    .select('*')
    .eq('productId', productId)
    .order('timestamp', { ascending: false });
  
  return (data || []) as PriceAuditEntry[];
}