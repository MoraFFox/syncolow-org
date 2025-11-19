import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

/**
 * Migration script to add default payment configuration to existing companies
 * Default: Transfer, Net 30
 */
export async function migrateCompanyPaymentConfig() {
  const companiesRef = collection(db, 'companies');
  const snapshot = await getDocs(companiesRef);
  
  const batch = writeBatch(db);
  let updateCount = 0;

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    
    // Only update if payment configuration doesn't exist
    if (!data.paymentMethod) {
      const companyRef = doc(db, 'companies', docSnapshot.id);
      batch.update(companyRef, {
        paymentMethod: 'transfer',
        paymentDueType: 'days_after_order',
        paymentDueDays: 30,
      });
      updateCount++;
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`✅ Migrated ${updateCount} companies with default payment configuration`);
  } else {
    console.log('✅ All companies already have payment configuration');
  }

  return updateCount;
}

