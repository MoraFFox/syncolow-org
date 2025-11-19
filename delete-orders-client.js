/** @format */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "synergyflow-pvqrj",
  appId: "1:945618752972:web:c66774aa022a98cd74b969",
  storageBucket: "synergyflow-pvqrj.appspot.com",
  apiKey: "AIzaSyDzFTXPJHLLfjPpzx2eSaVCiI5krW7Hy0s",
  authDomain: "synergyflow-pvqrj.firebaseapp.com",
  messagingSenderId: "945618752972",
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
