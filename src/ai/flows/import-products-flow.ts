
'use server';
/**
 * @fileOverview An AI flow for importing product data, including manufacturer handling.
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, Manufacturer } from '@/lib/types';

// Define the input schema for a single product record in the import
const ProductImportSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.string().or(z.number()).optional(),
  stock: z.string().or(z.number()).optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  manufacturerName: z.string().optional(), // Changed from manufacturerId to handle names
});

// Define the input schema for the entire flow
const ImportProductsInputSchema = z.object({
  products: z.array(ProductImportSchema),
});

// Define the output schema for the flow
const ImportProductsOutputSchema = z.object({
  successCount: z.number(),
  errorCount: z.number(),
  errors: z.array(z.string()),
});

// Helper function to find or create a manufacturer
async function findOrCreateManufacturer(name: string, batch: any, existingManufacturers: Map<string, string>): Promise<string> {
    if (!name || name.trim() === '') return '';
    const lowerCaseName = name.trim().toLowerCase();

    if (existingManufacturers.has(lowerCaseName)) {
        return existingManufacturers.get(lowerCaseName)!;
    }

    // Double-check Firestore in case the cache is stale (though unlikely in a single flow run)
    const manufacturersRef = collection(db, 'manufacturers');
    const q = query(manufacturersRef, where("name", "==", name.trim()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const manufId = querySnapshot.docs[0].id;
        existingManufacturers.set(lowerCaseName, manufId);
        return manufId;
    } else {
        const newManufacturerRef = doc(collection(db, 'manufacturers'));
        batch.set(newManufacturerRef, {
            name: name.trim(),
            description: `Auto-generated manufacturer: ${name.trim()}`,
            color: '#cccccc', // Default color
            icon: '',
            tags: ['auto-generated']
        });
        existingManufacturers.set(lowerCaseName, newManufacturerRef.id);
        return newManufacturerRef.id;
    }
}

export const importProductsFlow = ai.defineFlow(
  {
    name: 'importProductsFlow',
    inputSchema: ImportProductsInputSchema,
    outputSchema: ImportProductsOutputSchema,
  },
  async ({ products }) => {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    const BATCH_SIZE = 499; // Firestore batch limit is 500 operations

    // Pre-fetch existing manufacturers to minimize reads inside the loop
    const [manufacturersSnapshot, existingProductsSnapshot] = await Promise.all([
        getDocs(collection(db, 'manufacturers')),
        getDocs(collection(db, 'products')),
    ]);
    
    const existingManufacturers = new Map(
        manufacturersSnapshot.docs.map(doc => [doc.data().name.toLowerCase(), doc.id])
    );

    const existingProductNames = new Set(existingProductsSnapshot.docs.map(doc => doc.data().name.toLowerCase()));
    const existingProductSkus = new Set(existingProductsSnapshot.docs.map(doc => doc.data().sku?.toLowerCase()).filter(Boolean));
    const processedInThisBatch = new Set<string>();

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = products.slice(i, i + BATCH_SIZE);
        const currentChunkNames = new Set<string>();
        const currentChunkSkus = new Set<string>();

        for (const [index, productData] of chunk.entries()) {
            const rowIndex = i + index + 1;
            try {
                if (!productData.name) {
                    errors.push(`Row ${rowIndex}: Product name is missing.`);
                    errorCount++;
                    continue;
                }
                
                const productNameLower = productData.name.toLowerCase();
                const productSkuLower = productData.sku?.toLowerCase();

                // Duplicate check: against DB and within the entire batch
                if (existingProductNames.has(productNameLower) || processedInThisBatch.has(productNameLower)) {
                    errors.push(`Row ${rowIndex}: Product name "${productData.name}" already exists.`);
                    errorCount++;
                    continue;
                }
                if (productSkuLower && (existingProductSkus.has(productSkuLower) || processedInThisBatch.has(productSkuLower))) {
                    errors.push(`Row ${rowIndex}: SKU "${productData.sku}" already exists.`);
                    errorCount++;
                    continue;
                }
                
                // Duplicate check: within the current chunk being processed
                if (currentChunkNames.has(productNameLower)) {
                    errors.push(`Row ${rowIndex}: Duplicate product name "${productData.name}" found in the import file.`);
                    errorCount++;
                    continue;
                }
                if (productSkuLower && currentChunkSkus.has(productSkuLower)) {
                     errors.push(`Row ${rowIndex}: Duplicate SKU "${productData.sku}" found in the import file.`);
                    errorCount++;
                    continue;
                }

                let manufacturerId = '';
                if (productData.manufacturerName) {
                    manufacturerId = await findOrCreateManufacturer(productData.manufacturerName, batch, existingManufacturers);
                }
                
                const priceStr = String(productData.price ?? '0').replace(',', '.');
                const price = parseFloat(priceStr);
                const stock = parseInt(String(productData.stock ?? '0'), 10);

                const newProduct: Omit<Product, 'id'> = {
                    name: productData.name,
                    description: productData.description || 'No description provided.',
                    price: isNaN(price) ? 0 : price,
                    stock: isNaN(stock) ? 0 : stock,
                    sku: productData.sku || '',
                    category: productData.category || 'Uncategorized',
                    manufacturerId: manufacturerId,
                    imageUrl: 'https://placehold.co/100x100.png',
                    hint: productData.name,
                    isVariant: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const productRef = doc(collection(db, 'products'));
                batch.set(productRef, newProduct);

                // Add to sets for duplicate checking
                currentChunkNames.add(productNameLower);
                if (productSkuLower) currentChunkSkus.add(productSkuLower);
                processedInThisBatch.add(productNameLower);
                if(productSkuLower) processedInThisBatch.add(productSkuLower);

                successCount++;

            } catch (error: any) {
                errors.push(`Row ${rowIndex}: ${error.message}`);
                errorCount++;
            }
        }
        
        try {
            await batch.commit();
        } catch(batchError: any) {
            const failedCount = chunk.length - successCount; // Only count those that were not already errored out
            errorCount += failedCount;
            successCount -= failedCount; // Adjust success count
            errors.push(`A batch of up to ${chunk.length} products failed to import. Please check your data. Error: ${batchError.message}`);
        }
    }

    return {
      successCount,
      errorCount,
      errors,
    };
  }
);
