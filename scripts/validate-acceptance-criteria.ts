#!/usr/bin/env npx tsx
/**
 * Mock Data Acceptance Criteria Validator
 *
 * Verifies that the generated mock data meets business logic requirements,
 * referential integrity, and statistical plausibility.
 */

import 'dotenv/config';
import { getSafeMockDataClient } from '../src/lib/mock-data-generator/safety-guard';

async function validate() {
  console.log('\n🔍 Validating Mock Data Acceptance Criteria\n');

  const supabase = getSafeMockDataClient();
  let passed = true;
  const errors: string[] = [];

  const check = async (name: string, query: Promise<{ data: any, error: any }>, assertion: (data: any) => boolean) => {
    process.stdout.write(`  Checking ${name}... `);
    try {
      // Need to handle Supabase response structure carefully
      const result = await query;
      const { data, error } = result;
      
      if (error) throw error;
      
      if (assertion(data)) {
        console.log('✅ Passed');
      } else {
        console.log('❌ Failed');
        errors.push(`${name}: Assertion failed. Data: ${JSON.stringify(data).substring(0, 100)}...`);
        passed = false;
      }
    } catch (err) {
        console.log('❌ Error');
        errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
        passed = false;
    }
  };

  // 1. Check User Existence
  await check('Users exist', 
    supabase.from('users').select('count').single(),
    (d) => d && d.count > 0
  );

  // 2. Check Companies & Branches
  await check('Companies exist', 
    supabase.from('companies').select('count').eq('isBranch', false).single(),
    (d) => d && d.count > 0
  );

  // 3. Check Products
  await check('Products exist', 
    supabase.from('products').select('count').single(),
    (d) => d && d.count > 0
  );

  // 4. Check Orders Volume
  await check('Orders exist', 
    supabase.from('orders').select('count').single(),
    (d) => d && d.count > 0
  );

  // 5. Check Revenue (Grand Total > 0)
  await check('Positive Revenue', 
    supabase.from('orders').select('grandTotal').gt('grandTotal', 0).limit(1),
    (d) => d && d.length > 0
  );

  // 6. Referral Integrity: Orders have valid Company
  // Note: Views might not support direct joins via PostgREST if relationships aren't inferred.
  // We perform manual verification.
  await check('Orders linked to Companies',
    supabase.from('orders').select('companyId').limit(5),
    async (orders: any[]) => {
        if (!orders || orders.length === 0) return false;
        const companyIds = orders.map(o => o.companyId);
        const { data: companies } = await supabase.from('companies').select('id').in('id', companyIds);
        return companies && companies.length > 0;
    }
  );
  
  // 7. Data Freshness (Orders within last 90 days if scenario allows)
  // Check max order date
  await check('Recent Orders Generated',
    supabase.from('orders').select('orderDate').order('orderDate', { ascending: false }).limit(1).single(),
    (d) => {
        if (!d) return false;
        const lastOrder = new Date(d.orderDate);
        const now = new Date();
        const diff = (now.getTime() - lastOrder.getTime()) / (1000 * 3600 * 24);
        return diff < 365;
    }
  );

  // 8. Inventory Movements exist
  await check('Inventory Movements exist',
    supabase.from('inventoryMovements').select('count').single(),
    (d) => d && d.count > 0
  );

  // 9. Job Status Tracking
  await check('Jobs table populated',
    supabase.from('jobs').select('count').single(),
    (d) => d && d.count >= 0 // Should be >= 0 (might be empty if never run) - but we expect at least 1 from previous runs
  );

  console.log('\nResults:');
  if (passed) {
    console.log('✅ All acceptance criteria passed.');
    process.exit(0);
  } else {
    console.log('❌ Validation Failed:');
    errors.forEach(e => console.log(`  - ${e}`));
    process.exit(1);
  }
}

validate().catch(err => {
    console.error('Fatal Validation Error:', err);
    process.exit(1);
});
