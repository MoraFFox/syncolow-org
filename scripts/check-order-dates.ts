
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

// Force mock schema
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'mock_data' } });

async function checkDates() {
    console.log('Checking order dates in mock_data schema...');
  
  // Check count
  const { count, error: countError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting orders:', countError);
    return;
  }
  console.log(`Total Orders: ${count}`);

  if (count === 0) {
      console.log('No orders found.');
      return;
  }

  // Get Min Date
  const { data: minData, error: minError } = await supabase
    .from('orders')
    .select('orderDate')
    .order('orderDate', { ascending: true })
    .limit(1);
    
  if (minError) console.error('Error getting min date:', minError);
  else console.log('Earliest Order:', minData?.[0]?.orderDate);

  // Get Max Date
  const { data: maxData, error: maxError } = await supabase
    .from('orders')
    .select('orderDate')
    .order('orderDate', { ascending: false })
    .limit(1);

  if (maxError) console.error('Error getting max date:', maxError);
  else console.log('Latest Order:', maxData?.[0]?.orderDate);

  // Check what Analytics Page queries (Last 5 months from today Dec 17 2025)
  // From roughly July 2025 to Dec 2025
  const from = '2025-07-17T00:00:00.000Z';
  const to = '2025-12-17T23:59:59.999Z';
  
  const { count: rangeCount, error: rangeError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('orderDate', from)
    .lte('orderDate', to);

    
  if (rangeError) console.error('Error querying range:', rangeError);
  console.log(`Orders in Analytics Range (Mock Data): ${rangeCount}`);

  // Check PUBLIC schema
  const supabasePublic = createClient(supabaseUrl, supabaseKey, { db: { schema: 'public' } });
  const { count: publicCount } = await supabasePublic
    .from('orders')
    .select('*', { count: 'exact', head: true });
  console.log(`Orders in Public Schema: ${publicCount}`);
}

checkDates();
