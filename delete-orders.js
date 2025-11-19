/** @format */

import admin from 'firebase-admin';

const serviceAccount = {
  projectId: 'synergyflow-pvqrj',
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'synergyflow-pvqrj'
});

const db = admin.firestore();

async function deleteAllOrders() {
  const batchSize = 100;
  let totalDeleted = 0;

  console.log('Starting deletion of orders...\n');

  // Delete orders collection
  while (true) {
    const snapshot = await db.collection('orders').limit(batchSize).get();
    
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    totalDeleted += snapshot.size;
    console.log(`Deleted ${snapshot.size} orders (Total: ${totalDeleted})`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nOrders deleted: ${totalDeleted}`);

  // Delete orders_search collection
  let searchDeleted = 0;
  console.log('\nDeleting orders_search...\n');
  
  while (true) {
    const snapshot = await db.collection('orders_search').limit(batchSize).get();
    
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    searchDeleted += snapshot.size;
    console.log(`Deleted ${snapshot.size} search records (Total: ${searchDeleted})`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nSearch records deleted: ${searchDeleted}`);
  console.log('\nAll done!');
  process.exit(0);
}

deleteAllOrders().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
