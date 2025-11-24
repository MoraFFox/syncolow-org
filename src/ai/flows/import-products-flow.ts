
'use server';
/**
 * @fileOverview An AI flow for importing product data, including manufacturer handling.
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';

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
async function findOrCreateManufacturer(name: string, existingManufacturers: Map<string, string>): Promise<string> {
    if (!name || name.trim() === '') return '';
    const lowerCaseName = name.trim().toLowerCase();

    if (existingManufacturers.has(lowerCaseName)) {
        return existingManufacturers.get(lowerCaseName)!;
    }

    // Double-check Supabase in case the cache is stale
    const { data: existing } = await supabase
        .from('manufacturers')
        .select('id')
        .eq('name', name.trim())
        .single();

    if (existing) {
        existingManufacturers.set(lowerCaseName, existing.id);
        return existing.id;
    } else {
        const newManufacturer = {
            name: name.trim(),
            description: `Auto-generated manufacturer: ${name.trim()}`,
            color: '#cccccc', // Default color
            icon: '',
            tags: ['auto-generated']
        };
        
        const { data: created, error } = await supabase
            .from('manufacturers')
            .insert(newManufacturer)
            .select('id')
            .single();
            
        if (error || !created) {
            console.error('Error creating manufacturer:', error);
            return '';
        }

        existingManufacturers.set(lowerCaseName, created.id);
        return created.id;
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
    
    const BATCH_SIZE = 100; // Supabase handles batches well, but keep it reasonable

    // Pre-fetch existing manufacturers to minimize reads inside the loop
    const [manufacturersResult, productsResult] = await Promise.all([
        supabase.from('manufacturers').select('id, name'),
        supabase.from('products').select('name, sku'),
    ]);
    
    const existingManufacturers = new Map(
        (manufacturersResult.data || []).map(m => [m.name.toLowerCase(), m.id])
    );

    const existingProductNames = new Set((productsResult.data || []).map(p => p.name.toLowerCase()));
    const existingProductSkus = new Set((productsResult.data || []).map(p => p.sku?.toLowerCase()).filter(Boolean));
    const processedInThisBatch = new Set<string>();

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const chunk = products.slice(i, i + BATCH_SIZE);
        const currentChunkNames = new Set<string>();
        const currentChunkSkus = new Set<string>();
        const productsToInsert: any[] = [];

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
                    manufacturerId = await findOrCreateManufacturer(productData.manufacturerName, existingManufacturers);
                }
                
                const priceStr = String(productData.price ?? '0').replace(',', '.');
                const price = parseFloat(priceStr);
                const stock = parseInt(String(productData.stock ?? '0'), 10);

                const newProduct = {
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

                productsToInsert.push(newProduct);

                // Add to sets for duplicate checking
                currentChunkNames.add(productNameLower);
                if (productSkuLower) currentChunkSkus.add(productSkuLower);
                processedInThisBatch.add(productNameLower);
                if(productSkuLower) processedInThisBatch.add(productSkuLower);

            } catch (error: any) {
                errors.push(`Row ${rowIndex}: ${error.message}`);
                errorCount++;
            }
        }
        
        if (productsToInsert.length > 0) {
            const { error } = await supabase.from('products').insert(productsToInsert);
            
            if (error) {
                errorCount += productsToInsert.length;
                errors.push(`A batch of up to ${productsToInsert.length} products failed to import. Error: ${error.message}`);
            } else {
                successCount += productsToInsert.length;
            }
        }
    }

    return {
      successCount,
      errorCount,
      errors,
    };
  }
);
