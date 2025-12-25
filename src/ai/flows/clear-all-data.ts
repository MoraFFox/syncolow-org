
'use server';
/**
 * @fileOverview A server-side flow to clear all documents from specified Supabase tables.
 */

import { z } from 'genkit';
import { supabaseAdmin, supabase } from '@/lib/supabase';

const ClearDataOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedDocumentsCount: z.number(),
});

// Use admin client to bypass RLS policies
const adminClient = supabaseAdmin || supabase;

// Helper function to delete all documents in a table
async function deleteTableData(tableName: string): Promise<number> {
  // Use gt (greater than) with an empty UUID to match all rows
  // This is more reliable than neq as it effectively matches all valid UUIDs
  const { count, error } = await adminClient
    .from(tableName)
    .delete({ count: 'exact' })
    .gte('id', '00000000-0000-0000-0000-000000000000'); // Matches all UUIDs

  if (error) {
    console.error(`Error deleting from ${tableName}:`, error.message);
    // Don't throw - we'll continue with other tables
    return 0;
  }
  console.log(`Deleted ${count || 0} rows from ${tableName}`);
  return count || 0;
}


export async function clearAllData(): Promise<z.infer<typeof ClearDataOutputSchema>> {
  // Define all tables to be cleared. 'users' and 'user_settings' are intentionally excluded.
  const tablesToDelete = [
    'products',
    'orders',
    'feedback',
    'maintenance',
    'visits',
    'baristas',
    'companies',
    'manufacturers',
    'priceAudit',
    'orders_search',
    'pushSubscriptions'
  ];
  let deletedDocumentsCount = 0;

  try {
    console.log('Starting database clear operation...');
    console.log('Using admin client:', adminClient === supabaseAdmin ? 'supabaseAdmin' : 'supabase (fallback)');

    // Delete tables
    for (const tableName of tablesToDelete) {
      try {
        const count = await deleteTableData(tableName);
        deletedDocumentsCount += count;
      } catch (e) {
        console.warn(`Failed to clear table ${tableName}:`, e);
      }
    }

    console.log(`Total deleted: ${deletedDocumentsCount} documents`);

    return {
      success: true,
      message: 'All specified tables have been cleared.',
      deletedDocumentsCount,
    };
  } catch (error: any) {
    console.error('Error clearing data:', error);
    return {
      success: false,
      message: error.message || 'An unknown error occurred while clearing data.',
      deletedDocumentsCount: 0,
    };
  }
}
