import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import type { ImportRowError } from '@/lib/types';
import { logger } from '@/lib/logger';

interface FixAllEntitiesOptions {
  errors: ImportRowError[];
  onProgress?: (message: string) => void;
}

interface FixAllEntitiesResult {
  createdCompanies: string[];
  createdProducts: string[];
  success: boolean;
  error?: string;
}

/**
 * Auto-creates missing companies and products from import errors
 * @param options - Configuration options including errors to fix
 * @returns Result containing created entities and success status
 */
export async function fixAllMissingEntities(
  options: FixAllEntitiesOptions
): Promise<FixAllEntitiesResult> {
  const { errors, onProgress } = options;
  const createdCompanies: string[] = [];
  const createdProducts: string[] = [];

  try {
    const missingEntityErrors = errors.filter(
      (e) => e.errorType === 'missing-entity'
    );

    onProgress?.(`Processing ${missingEntityErrors.length} missing entities...`);

    // 1. Extract unique names and data
    const uniqueCompanies = new Map<string, any>();
    const uniqueProducts = new Map<string, any>();

    for (const error of missingEntityErrors) {
      if (error.resolution?.entity === 'company' && error.resolution.suggestedData) {
        uniqueCompanies.set(error.resolution.suggestedData.name, error.resolution.suggestedData);
      } else if (error.resolution?.entity === 'product' && error.resolution.suggestedData) {
        uniqueProducts.set(error.resolution.suggestedData.name, error.resolution.suggestedData);
      }
    }

    // 2. Process Companies
    if (uniqueCompanies.size > 0) {
      const companyNames = Array.from(uniqueCompanies.keys());
      onProgress?.(`Checking ${companyNames.length} unique companies...`);

      // Check existence in chunks to avoid Supabase .in() limit (max ~50 items)
      const CHUNK_SIZE = 50;
      const existingNames = new Set<string>();

      for (let i = 0; i < companyNames.length; i += CHUNK_SIZE) {
        const chunk = companyNames.slice(i, i + CHUNK_SIZE);
        const { data: existingCompanies, error: checkError } = await supabase
          .from('companies')
          .select('name')
          .in('name', chunk);

        if (checkError) {
          logger.error(checkError, { component: 'ImportEntityFixer', action: 'checkExistingCompanies', chunkIndex: i, chunkSize: chunk.length });
          throw new Error(`Failed to check companies: ${checkError.message}`);
        }

        existingCompanies?.forEach((c: { name: string }) => existingNames.add(c.name));
      }

      const companiesToCreate = companyNames.filter(name => !existingNames.has(name));

      if (companiesToCreate.length > 0) {
        onProgress?.(`Creating ${companiesToCreate.length} new companies...`);

        // Yield to UI to prevent freeze
        await new Promise(r => setTimeout(r, 0));

        const newCompaniesData = companiesToCreate.map(name => ({
          name: name,
          parentCompanyId: null,
          region: 'A',
          createdAt: new Date().toISOString(),
          machineOwned: false,
          currentPaymentScore: 100,
          totalOutstandingAmount: 0,
          totalUnpaidOrders: 0,
        }));

        // Insert in batches of 50 to avoid timeouts on large imports
        const BATCH_SIZE = 50;
        for (let i = 0; i < newCompaniesData.length; i += BATCH_SIZE) {
          const batch = newCompaniesData.slice(i, i + BATCH_SIZE);

          const { error: insertError } = await supabase
            .from('companies')
            .insert(batch);

          if (insertError) {
            logger.error(insertError, { component: 'ImportEntityFixer', action: 'insertCompanies', batchIndex: i });
            throw new Error(`Failed to create companies: ${insertError.message}`);
          }

          // Yield to UI and update progress
          await new Promise(r => setTimeout(r, 0));
          onProgress?.(`Created ${Math.min(i + BATCH_SIZE, newCompaniesData.length)}/${newCompaniesData.length} companies...`);
        }

        createdCompanies.push(...companiesToCreate);
        onProgress?.(`✓ Created ${companiesToCreate.length} companies`);
      } else {
        onProgress?.('✓ All companies already exist');
      }
    }

    // 3. Process Products
    if (uniqueProducts.size > 0) {
      const productNames = Array.from(uniqueProducts.keys());
      onProgress?.(`Checking ${productNames.length} unique products...`);

      // Check existence in chunks to avoid Supabase .in() limit (max ~50 items)
      const CHUNK_SIZE = 50;
      const existingNames = new Set<string>();

      for (let i = 0; i < productNames.length; i += CHUNK_SIZE) {
        const chunk = productNames.slice(i, i + CHUNK_SIZE);
        const { data: existingProducts, error: checkError } = await supabase
          .from('products')
          .select('name')
          .in('name', chunk);

        if (checkError) {
          logger.error(checkError, { component: 'ImportEntityFixer', action: 'checkExistingProducts', chunkIndex: i, chunkSize: chunk.length });
          throw new Error(`Failed to check products: ${checkError.message}`);
        }

        existingProducts?.forEach((p: { name: string }) => existingNames.add(p.name));
      }

      const productsToCreate = productNames.filter(name => !existingNames.has(name));

      if (productsToCreate.length > 0) {
        onProgress?.(`Creating ${productsToCreate.length} new products...`);

        // Yield to UI to prevent freeze
        await new Promise(r => setTimeout(r, 0));

        const newProductsData = productsToCreate.map(name => ({
          name: name,
          price: uniqueProducts.get(name).price || 0,
          category: 'Uncategorized',
          createdAt: new Date().toISOString(),
        }));

        // Insert in batches of 50 to avoid timeouts on large imports
        const BATCH_SIZE = 50;
        for (let i = 0; i < newProductsData.length; i += BATCH_SIZE) {
          const batch = newProductsData.slice(i, i + BATCH_SIZE);

          const { error: insertError } = await supabase
            .from('products')
            .insert(batch);

          if (insertError) {
            logger.error(insertError, { component: 'ImportEntityFixer', action: 'insertProducts', batchIndex: i });
            throw new Error(`Failed to create products: ${insertError.message}`);
          }

          // Yield to UI and update progress
          await new Promise(r => setTimeout(r, 0));
          onProgress?.(`Created ${Math.min(i + BATCH_SIZE, newProductsData.length)}/${newProductsData.length} products...`);
        }

        createdProducts.push(...productsToCreate);
        onProgress?.(`✓ Created ${productsToCreate.length} products`);
      } else {
        onProgress?.('✓ All products already exist');
      }
    }

    // Show summary toast
    const totalCreated = createdCompanies.length + createdProducts.length;
    if (totalCreated > 0) {
      toast({
        title: 'Entities Created',
        description: `Created ${createdCompanies.length} companies and ${createdProducts.length} products. You can now retry the import.`,
      });
    } else {
      toast({
        title: 'No New Entities',
        description: 'All required entities already exist in the database.',
      });
    }

    return {
      createdCompanies,
      createdProducts,
      success: true,
    };
  } catch (error: any) {
    logger.error(error, { component: 'ImportEntityFixer', action: 'fixAllMissingEntities', errorCount: errors.length });

    toast({
      title: 'Fix All Failed',
      description: error.message || 'Failed to create entities. Please try again.',
      variant: 'destructive',
    });

    return {
      createdCompanies,
      createdProducts,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Creates a single missing entity (company or product)
 * @param entityType - Type of entity to create ('company' or 'product')
 * @param entityData - Data for the entity
 * @returns Success status
 */
export async function createMissingEntity(
  entityType: 'company' | 'product',
  entityData: { name: string; price?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (entityType === 'company') {
      const companyData = {
        name: entityData.name,
        parentCompanyId: null,
        region: 'A',
        createdAt: new Date().toISOString(),
        machineOwned: false,
        currentPaymentScore: 100,
        totalOutstandingAmount: 0,
        totalUnpaidOrders: 0,
      };

      const { error } = await supabase.from('companies').insert(companyData);

      if (error) {
        throw new Error(`Failed to create company: ${error.message}`);
      }

      toast({
        title: 'Company Created',
        description: `${entityData.name} has been created successfully.`,
      });
    } else if (entityType === 'product') {
      const productData = {
        name: entityData.name,
        price: entityData.price || 0,
        category: 'Uncategorized',
        createdAt: new Date().toISOString(),
      };

      const { error } = await supabase.from('products').insert(productData);

      if (error) {
        throw new Error(`Failed to create product: ${error.message}`);
      }

      toast({
        title: 'Product Created',
        description: `${entityData.name} has been created successfully.`,
      });
    }

    return { success: true };
  } catch (error: any) {
    logger.error(error, { component: 'ImportEntityFixer', action: 'createMissingEntity', entityType, entityName: entityData.name });

    toast({
      title: 'Creation Failed',
      description: error.message,
      variant: 'destructive',
    });

    return { success: false, error: error.message };
  }
}
