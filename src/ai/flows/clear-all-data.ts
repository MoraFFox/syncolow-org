
'use server';
/**
 * @fileOverview A server-side flow to clear all documents from specified Supabase tables.
 */

import { z } from 'genkit';
import { supabase } from '@/lib/supabase';

const ClearDataOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedDocumentsCount: z.number(),
});

// Helper function to delete all documents in a table
async function deleteTableData(tableName: string): Promise<number> {
    // In Supabase, we can delete all rows by matching a condition that is always true for existing rows.
    // Assuming 'id' exists and is not null.
    const { count, error } = await supabase
        .from(tableName)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows where id is not a dummy UUID

    if (error) {
        console.error(`Error deleting from ${tableName}:`, error);
        throw error;
    }
    return count || 0;
}


export async function clearAllData(): Promise<z.infer<typeof ClearDataOutputSchema>> {
  // Define all tables to be cleared. 'users' is intentionally excluded.
  const tablesToDelete = [
    'products',
    'orders',
    'feedback',
    'maintenance',
    'visits',
    'baristas',
    'companies',
    'manufacturers', // Added manufacturers as it was likely missed or implicitly handled in firebase
    'priceAudit', // Added priceAudit
    'orders_search', // Added orders_search
    'pushSubscriptions' // Added pushSubscriptions
  ];
  let deletedDocumentsCount = 0;

  try {
    // Delete tables
    for (const tableName of tablesToDelete) {
        try {
             deletedDocumentsCount += await deleteTableData(tableName);
        } catch (e) {
            console.warn(`Failed to clear table ${tableName}, it might not exist or has constraints.`, e);
        }
    }
    
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
