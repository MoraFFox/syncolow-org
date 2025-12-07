/** @format */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, limit, query } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nPlease copy .env.example to .env and configure your Firebase credentials.');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllOrders() {
  const batchSize = 100;
  let totalDeleted = 0;

  console.log('Starting deletion of orders...\n');

  // Delete orders collection
  while (true) {
    const q = query(collection(db, 'orders'), limit(batchSize));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) break;

    const batch = writeBatch(db);
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
    const q = query(collection(db, 'orders_search'), limit(batchSize));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) break;

    const batch = writeBatch(db);
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
