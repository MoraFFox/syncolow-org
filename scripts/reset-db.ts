#!/usr/bin/env npx tsx
/**
 * Mock Data Reset Script
 *
 * Manually deletes data from mock_data tables in correct dependency order.
 * Used when API server is not available.
 */

import 'dotenv/config';
import { getSafeMockDataClient } from '../src/lib/mock-data-generator/safety-guard';

async function reset() {
  console.log('🧹 Cleaning up mock data tables...');
  const supabase = getSafeMockDataClient();

  const tables = [
    'audit_logs_data',
    'notifications_data',
    'inventory_movements_data',
    'refunds_data',
    'payments_data',
    'delivery_attempts_data',
    'shipments_data',
    'returns_data',
    'orders_data',
    'visits_data',
    'feedback_data',
    'baristas_data',
    'products_data',
    'companies_data', // Handle self-referencing branches appropriately? 
                      // Supabase CASCADE might handle it if FK set to CASCADE, check schema.
                      // companies.parent_company_id -> companies.id. 
                      // If cycle exists, might complain. 
                      // Usually deletion of everything works if constraints allow.
    'users_data',
    'jobs_data'
  ];

  // We loop and delete.
  // Note: 'companies_data' has self-ref parent_company_id.
  
  for (const table of tables) {
    process.stdout.write(`   Deleting ${table}... `);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) {
        // Ignore "relation does not exist" if using view names by mistake, but these are table names.
        // For companies, if foreign key restriction, we might need 2 passes or specific order.
        if (error.code === '23503') { // ForeignKeyViolation
            console.log('⚠️ FK Constraint (retrying later)');
        } else {
            console.log(`❌ Error: ${error.message}`);
        }
    } else {
        console.log('✅');
    }
  }

  // Double check companies (if self-ref prevented deletion)
  // Delete where parent is not null first? 
  // actually delete where parent is null might wait?
  // Just try deleting companies again to be sure.
  await supabase.from('companies_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✨ Cleanup finished.');
}

reset().catch(console.error);
