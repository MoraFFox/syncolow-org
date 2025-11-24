
import { supabase } from '@/lib/supabase';

/**
 * Migration script to add default payment configuration to existing companies
 * Default: Transfer, Net 30
 */
export async function migrateCompanyPaymentConfig() {
  const { data: companies } = await supabase.from('companies').select('*');
  
  if (!companies) return 0;

  let updateCount = 0;

  for (const company of companies) {
    // Only update if payment configuration doesn't exist
    if (!company.paymentMethod) {
      await supabase.from('companies').update({
        paymentMethod: 'transfer',
        paymentDueType: 'days_after_order',
        paymentDueDays: 30,
      }).eq('id', company.id);
      
      updateCount++;
    }
  }

  if (updateCount > 0) {
    console.log(`✅ Migrated ${updateCount} companies with default payment configuration`);
  } else {
    console.log('✅ All companies already have payment configuration');
  }

  return updateCount;
}
