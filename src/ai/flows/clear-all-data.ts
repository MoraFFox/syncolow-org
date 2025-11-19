
'use server';
/**
 * @fileOverview A server-side flow to clear all documents from specified Firestore collections.
 */

import { z } from 'genkit';
import { collection, getDocs, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ClearDataOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedDocumentsCount: z.number(),
});

// Helper function to delete all documents in a collection
async function deleteCollection(collectionName: string, batch: any): Promise<number> {
    const snapshot = await getDocs(collection(db, collectionName));
    let count = 0;
    if (!snapshot.empty) {
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          count++;
        });
    }
    return count;
}


export async function clearAllData(): Promise<z.infer<typeof ClearDataOutputSchema>> {
  // Define all collections to be cleared. 'users' is intentionally excluded.
  const collectionsToDelete = [
    'products',
    'orders',
    'feedback',
    'maintenance',
    'visits',
    'baristas',
    'companies' // companies is handled separately due to subcollections
  ];
  let deletedDocumentsCount = 0;

  try {
    const batch = writeBatch(db);

    // Delete simple collections
    for (const collectionName of collectionsToDelete) {
        if(collectionName !== 'companies') {
            deletedDocumentsCount += await deleteCollection(collectionName, batch);
        }
    }
    
    // Delete companies (which are both parents and branches in the same collection)
    const companiesSnapshot = await getDocs(collection(db, 'companies'));
    if (!companiesSnapshot.empty) {
        companiesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedDocumentsCount++;
        });
    }

    await batch.commit();
    return {
      success: true,
      message: 'All specified collections have been cleared.',
      deletedDocumentsCount,
    };
  } catch (error: any) {
    console.error('Error clearing data:', error);
    return {
      success: false,
      message: error.message || 'An unknown error occurred while clearing data.',
      deletedDocumentsCount: 0,
    };
  }
}
