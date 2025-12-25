'use server';
/**
 * @fileOverview An AI flow for importing product data, including manufacturer handling.
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { supabase, supabaseAdmin } from '@/lib/supabase';
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
    const { data: existing } = await supabaseAdmin
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

        const { data: created, error } = await supabaseAdmin
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
            supabaseAdmin.from('manufacturers').select('id, name'),
            supabaseAdmin.from('products').select('id, name, sku'),
        ]);

        const existingManufacturers = new Map<string, string>(
            (manufacturersResult.data || []).map((m: { name: string; id: string }) => [m.name.toLowerCase(), m.id])
        );

        // Map Name -> ID
        const existingProductNames = new Map<string, string>(
            (productsResult.data || []).map((p: { id: string; name: string; sku?: string }) => [p.name.toLowerCase(), p.id])
        );
        // Map SKU -> ID
        const existingProductSkus = new Map<string, string>(
            (productsResult.data || []).map((p: { id: string; name: string; sku?: string }) => p.sku ? [p.sku.toLowerCase(), p.id] : ['', '']).filter((entry: any) => entry[0] !== '') // Explicit any to shut up TS for this filter, or cast properly
        );

        const processedInThisBatch = new Set<string>();

        // Step 1: Ensure Categories Exist
        // Collect all unique non-empty categories from the import list
        const uniqueCategories = new Set<string>();
        products.forEach(p => {
            if (p.category && p.category.trim() !== '') {
                uniqueCategories.add(p.category.trim());
            }
        });

        if (uniqueCategories.size > 0) {
            const categoryNames = Array.from(uniqueCategories);

            // Fetch existing categories to avoid duplicates
            const { data: existingCats, error: catFetchError } = await supabaseAdmin
                .from('categories')
                .select('name');

            if (!catFetchError && existingCats) {
                const existingCatNames = new Set((existingCats || []).map((c: { name: string }) => c.name.toLowerCase()));
                const categoriesToCreate = categoryNames.filter(name => !existingCatNames.has(name.toLowerCase()));

                if (categoriesToCreate.length > 0) {
                    console.log(`Creating ${categoriesToCreate.length} new categories...`);
                    const { error: catInsertError } = await supabaseAdmin
                        .from('categories')
                        .insert(categoriesToCreate.map(name => ({ name })));

                    if (catInsertError) {
                        console.error('Error creating categories:', catInsertError);
                        // We don't block the flow, but log the error
                        errors.push(`Warning: Failed to create some categories: ${catInsertError.message}`);
                    }
                }
            }
        }

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const chunk = products.slice(i, i + BATCH_SIZE);
            const currentChunkNames = new Set<string>();
            const currentChunkSkus = new Set<string>();
            const productsToInsert: any[] = [];
            const productsToUpdate: any[] = [];

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
                    let existingId: string | undefined;

                    // Duplicate check: against DB (Update Candidate)
                    if (existingProductNames.has(productNameLower)) {
                        existingId = existingProductNames.get(productNameLower);
                    } else if (productSkuLower && existingProductSkus.has(productSkuLower)) {
                        existingId = existingProductSkus.get(productSkuLower);
                    }

                    // Duplicate check: within the current chunk being processed
                    // If it matched a DB record, but we also saw it in this batch earlier -> Real Duplicate in File
                    if (currentChunkNames.has(productNameLower) || processedInThisBatch.has(productNameLower)) {
                        if (!existingId || processedInThisBatch.has(productNameLower)) {
                            errors.push(`Row ${rowIndex}: Duplicate product name "${productData.name}" found in the import file.`);
                            errorCount++;
                            continue;
                        }
                    }
                    if (productSkuLower && (currentChunkSkus.has(productSkuLower) || (processedInThisBatch.has(productSkuLower) && !existingId))) {
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

                    const productPayload = {
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
                        updatedAt: new Date().toISOString(),
                    };

                    if (existingId) {
                        // UPDATE
                        // Note: Supabase upsert needs the key to be present
                        productsToUpdate.push({ ...productPayload, id: existingId });
                    } else {
                        // INSERT
                        productsToInsert.push({ ...productPayload, createdAt: new Date().toISOString() });
                    }

                    // Add to sets for duplicate checking
                    currentChunkNames.add(productNameLower);
                    if (productSkuLower) currentChunkSkus.add(productSkuLower);
                    processedInThisBatch.add(productNameLower);
                    if (productSkuLower) processedInThisBatch.add(productSkuLower);

                } catch (error: any) {
                    errors.push(`Row ${rowIndex}: ${error.message}`);
                    errorCount++;
                }
            }

            if (productsToInsert.length > 0) {
                const { error } = await supabaseAdmin.from('products').insert(productsToInsert);

                if (error) {
                    errorCount += productsToInsert.length;
                    errors.push(`Failed to insert batch of ${productsToInsert.length} products: ${error.message}`);
                } else {
                    successCount += productsToInsert.length;
                }
            }

            if (productsToUpdate.length > 0) {
                const { error } = await supabaseAdmin.from('products').upsert(productsToUpdate);

                if (error) {
                    errorCount += productsToUpdate.length;
                    errors.push(`Failed to update batch of ${productsToUpdate.length} products: ${error.message}`);
                } else {
                    successCount += productsToUpdate.length;
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
