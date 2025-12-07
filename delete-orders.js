/** @format */

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('Error: Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable.');
  console.error('Please copy .env.example to .env and configure your Firebase credentials.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
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
