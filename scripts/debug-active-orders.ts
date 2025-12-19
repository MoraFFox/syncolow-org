
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'mock_data' }
});

async function debugOrders() {
  console.log('--- Debugging Active Orders Query ---');
  
  // Replicating fetchOrdersWithFilters logic
  // query = query.neq('status', 'Delivered').neq('status', 'Cancelled');
  
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, companyName")
    .neq('status', 'Delivered')
    .neq('status', 'Cancelled')
    .limit(50);
    
  if (error) {
    console.error('Query Error:', error);
    return;
  }
  
  console.log(`Query returned ${data?.length} orders.`);
  
  const delivered = data?.filter(o => o.status === 'Delivered');
  const cancelled = data?.filter(o => o.status === 'Cancelled');
  
  console.log(`Found ${delivered?.length} DELIVERED orders in result.`);
  if (delivered?.length > 0) {
    console.log('Examples:', delivered.slice(0, 3));
  }
  
  console.log(`Found ${cancelled?.length} CANCELLED orders in result.`);
   if (cancelled?.length > 0) {
    console.log('Examples:', cancelled.slice(0, 3));
  }
  
  // Also check without filter to see if they exist at all
  const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Delivered');
  console.log(`Total Delivered orders in DB: ${count}`);
}

debugOrders();
