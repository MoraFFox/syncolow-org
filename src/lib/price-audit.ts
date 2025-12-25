
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

/**
 * Batch insert price audit entries for improved performance.
 * Uses a single database call instead of N individual inserts.
 * @param entries - Array of price audit entries to insert
 */
export async function logPriceAuditBatch(entries: Omit<PriceAuditEntry, 'id' | 'timestamp'>[]) {
  if (entries.length === 0) return;

  const timestamp = new Date().toISOString();
  const entriesWithTimestamp = entries.map(entry => ({
    ...entry,
    timestamp,
  }));

  // Supabase can handle large batches, but we chunk to 500 for safety
  const BATCH_SIZE = 500;
  for (let i = 0; i < entriesWithTimestamp.length; i += BATCH_SIZE) {
    const batch = entriesWithTimestamp.slice(i, i + BATCH_SIZE);
    await supabase.from('priceAudit').insert(batch);
  }
}

export async function getPriceHistory(productId: string): Promise<PriceAuditEntry[]> {
  const { data } = await supabase
    .from('priceAudit')
    .select('*')
    .eq('productId', productId)
    .order('timestamp', { ascending: false });

  return (data || []) as PriceAuditEntry[];
}