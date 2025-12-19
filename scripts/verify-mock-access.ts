
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verify() {
  console.log('🔍 Verifying Mock Data Access...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

  console.log('Config:', { 
    url: supabaseUrl ? 'Set' : 'Missing', 
    key: supabaseKey ? 'Set' : 'Missing',
    useMockData: useMock
  });

  if (!useMock) {
    console.warn('⚠️ NEXT_PUBLIC_USE_MOCK_DATA is not true. Testing access to mock_data explicitly.');
  }

  // Explicitly create client for mock_data
  const client = createClient(supabaseUrl!, supabaseKey!, {
    db: { schema: 'mock_data' }
  });

  // Test 1: Fetch Users
  console.log('\nTesting "users" (View)...');
  const { data: users, error: usersError } = await client
    .from('users')
    .select('*')
    .limit(5);

  if (usersError) {
    console.error('❌ Failed to fetch users:', usersError);
  } else {
    console.log(`✅ Fetched ${users?.length} users.`);
    if (users?.length > 0) console.log('Sample:', users![0]);
  }

  // Test 2: Fetch Orders
  console.log('\nTesting "orders" (View)...');
  const { count, error: ordersError } = await client
    .from('orders')
    .select('*', { count: 'exact', head: true });

  if (ordersError) {
    console.error('❌ Failed to fetch orders count:', ordersError);
  } else {
    console.log(`✅ Total Orders in mock_data: ${count}`);
  }

  // Test 3: Fetch with Filter (Use Order Store logic)
  console.log('\nTesting Orders Filter...');
  // Simulating: .eq('isPotentialClient', false)
  const { data: filtered, error: filterError } = await client
    .from('orders')
    .select('id, companyName, status')
    .eq('isPotentialClient', false)
    .limit(3);

  // Test 4: Fetch Companies
  console.log('\nTesting "companies" (View)...');
  const { data: companies, error: companiesError } = await client
    .from('companies')
    .select('*')
    .limit(5);

  if (companiesError) {
    console.error('❌ Failed to fetch companies:', companiesError);
  } else {
    console.log(`✅ Fetched ${companies?.length} companies.`);
    if (companies?.length > 0) console.log('Sample Company:', JSON.stringify(companies![0], null, 2));
  }

  // Test 5: Fetch Maintenance
  console.log('\nTesting "maintenance" (View)...');
  const { count: maintCount, error: maintError } = await client
    .from('maintenance')
    .select('*', { count: 'exact', head: true });

  if (maintError) {
    console.error('❌ Failed to fetch maintenance:', maintError);
  } else {
     console.log(`✅ Total Maintenance in mock_data: ${maintCount}`);
  }

  // Test 6: Fetch Baristas
  console.log('\nTesting "baristas" (View)...');
  const { count: baristaCount, error: baristaError } = await client
    .from('baristas')
    .select('*', { count: 'exact', head: true });
    
  if (baristaError) {
      console.error('❌ Failed to fetch baristas:', baristaError);
  } else {
      console.log(`✅ Total Baristas in mock_data: ${baristaCount}`);
  }

  // Test 7: Fetch Visits (The Missing Link?)
  console.log('\nTesting "visits" (View)...');
  const { count: visitsCount, error: visitsError } = await client
    .from('visits')
    .select('*', { count: 'exact', head: true });

  if (visitsError) {
    console.error('❌ Failed to fetch visits (Confirming Missing Entity):', visitsError);
  } else {
    console.log(`✅ Total Visits in mock_data: ${visitsCount}`);
  }


}

verify().catch(console.error);
