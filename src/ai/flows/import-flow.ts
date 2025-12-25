
'use server';
import { supabaseAdmin } from '@/lib/supabase';
import { Company, Order, Product, ImportRowError, CsvRow, ImportResult, ImportableEntityType } from '@/lib/types';
import { logPriceAuditBatch } from '@/lib/price-audit';
import { computeImportHash, parseLocalizedNumber, parseDate as parseDateISO } from '@/lib/import-schema';

// Environment flag for debug logging
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * @deprecated Use computeImportHash from import-schema instead
 * Kept for backward compatibility with existing import hashes
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

const findValueRobust = (row: CsvRow, ...keySubstrings: string[]): string | undefined => {
  for (const sub of keySubstrings) {
    for (const key in row) {
      if (key.trim().toLowerCase().includes(sub.toLowerCase())) {
        const value = row[key];
        if (value !== null && value !== undefined && value !== '') {
          return String(value).trim();
        }
      }
    }
  }
  return undefined;
};

interface ImportInput {
  entityType: ImportableEntityType;
  data: CsvRow[];
  companies?: Company[];
  products?: Product[];
}

// Helper function to query Supabase with 'in' operator in chunks
// Note: For 'name' fields, we fetch all records and filter in-memory for case-insensitive matching
async function queryInBatches<T extends { name?: string; id?: string }>(
  table: string,
  field: string,
  values: string[]
): Promise<T[]> {
  if (values.length === 0) {
    return [];
  }

  // For name-based queries, fetch all and filter case-insensitively to handle mismatches
  if (field === 'name') {
    const { data, error } = await supabaseAdmin.from(table).select('*');
    if (error || !data) {
      console.error(`[queryInBatches] Error fetching ${table}:`, error);
      return [];
    }

    // Create lowercase lookup set
    const lowerValues = new Set(values.map(v => v.toLowerCase()));

    // Filter case-insensitively
    return (data as T[]).filter(item =>
      item.name && lowerValues.has(item.name.toLowerCase())
    );
  }

  // For other fields (like 'id'), use exact .in() matching
  const CHUNK_SIZE = 50;
  const chunks = [];
  for (let i = 0; i < values.length; i += CHUNK_SIZE) {
    chunks.push(values.slice(i, i + CHUNK_SIZE));
  }

  const snapshotPromises = chunks.map(chunk => {
    return supabaseAdmin.from(table).select('*').in(field, chunk);
  });

  const snapshots = await Promise.all(snapshotPromises);

  const results: T[] = [];
  snapshots.forEach(result => {
    if (result.data) {
      results.push(...(result.data as T[]));
    }
  });

  return results;
}


/**
 * Parses a numeric value with support for localized formats.
 * Uses parseLocalizedNumber from import-schema for European/US number formats.
 */
const parseNumber = (val: unknown): number => {
  return parseLocalizedNumber(val as string | number | null | undefined);
};

export async function importFlow({
  entityType,
  data,
  companies: providedCompanies,
  products: providedProducts,
}: ImportInput): Promise<ImportResult> {
  console.log('Import flow started', { entityType, rowCount: data.length });
  console.log('Data size:', JSON.stringify(data).length, 'bytes');
  try {
    if (entityType !== 'order') {
      return {
        success: false,
        importedCount: 0,
        errors: [{
          rowIndex: 0,
          errorType: 'invalid-data',
          errorMessage: 'This flow currently only supports importing orders.',
          blocking: true,
        }],
      };
    }

    const rowsToImport = data.filter(row => row && typeof row === 'object' && Object.values(row).some(val => val !== '' && val !== null && val !== undefined));
    console.log('Rows to import:', rowsToImport.length);
    console.log('First row keys:', Object.keys(rowsToImport[0] || {}));
    console.log('First row data:', rowsToImport[0]);

    let allCompanies: Company[];
    let products: Product[];

    // Use provided data if available, otherwise query Supabase
    if (providedCompanies && providedProducts) {
      console.log('Using provided companies and products from client');
      allCompanies = providedCompanies;
      products = providedProducts;
    } else {
      const companyNames = new Set<string>();
      const productNames = new Set<string>();
      for (const row of rowsToImport) {
        const companyName = findValueRobust(row, 'customer', 'client', 'company', 'branch');
        if (companyName) companyNames.add(companyName);

        const productName = findValueRobust(row, 'product name', 'product', 'item');
        if (productName) productNames.add(productName);
      }

      const companiesAndBranches = await queryInBatches<Company>('companies', 'name', Array.from(companyNames));

      const parentCompanyIds = new Set<string>();
      const existingCompanyIds = new Set(companiesAndBranches.map(c => c.id));
      companiesAndBranches.forEach(c => {
        if (c.isBranch && c.parentCompanyId && !existingCompanyIds.has(c.parentCompanyId)) {
          parentCompanyIds.add(c.parentCompanyId);
        }
      });

      allCompanies = [...companiesAndBranches];
      if (parentCompanyIds.size > 0) {
        const parentCompanies = await queryInBatches<Company>('companies', 'id', Array.from(parentCompanyIds));
        allCompanies = [...allCompanies, ...parentCompanies];
      }

      products = await queryInBatches<Product>('products', 'name', Array.from(productNames));
    }

    const productNames = new Set(products.map(p => p.name));

    console.log('Product names to search:', Array.from(productNames));
    console.log('Products found in DB:', products.map(p => ({ id: p.id, name: p.name })));
    console.log('Total products found:', products.length);

    // Check for duplicate products in the query result
    const productNameCounts = products.reduce((acc, p) => {
      acc[p.name] = (acc[p.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const duplicateProducts = Object.entries(productNameCounts).filter(([name, count]) => count > 1);
    if (duplicateProducts.length > 0) {
      console.warn('DUPLICATE PRODUCTS FOUND IN QUERY:', duplicateProducts);
    }

    const companyMap = new Map<string, Company>(allCompanies.map(c => [c.name.toLowerCase(), c]));
    const companyIdMap = new Map<string, Company>(allCompanies.map(c => [c.id, c]));
    const productMap = new Map<string, Product>(products.map(p => [p.name.toLowerCase(), p]));

    const errors: ImportRowError[] = [];

    interface DuplicateDetail {
      rowIndex: number;
      invoiceNumber: string;
      source: string;
      hash: string;
      companyName: string;
      date: string;
      total: number;
      items: string;
    }

    const duplicates: DuplicateDetail[] = [];
    // Define a local type for orders with internal metadata
    type OrderWithMetadata = Omit<Order, 'id'> & {
      importHash: string;
      __rowIndex: number;
      tempInvoiceNumber?: string;
    };
    const validOrders: OrderWithMetadata[] = [];

    // We'll check for duplicates after building complete orders
    // Map Hash -> { invoiceNumber, rowIndex } to identify collision source
    const seenHashes = new Map<string, { invoiceNumber?: string, rowIndex?: number }>();
    let skippedDuplicates = 0;

    // Helper types for grouping
    interface ImportOrderItem {
      id: string;
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      taxId: string | null;
      taxRate: number | null;
      discountType: 'fixed' | 'percentage' | null;
      discountValue: number | null;
      isReturn?: boolean;
    }

    interface ImportOrderGroup {
      companyId: string;
      branchId: string;
      companyName: string;
      branchName: string;
      area: string | undefined;
      orderDate: string;
      firstRowIndex: number;
      status: Order['status'];
      paymentStatus: Order['paymentStatus'];
      items: ImportOrderItem[];
      cancellationReason: string | undefined;
      cancellationNotes: string | undefined;
    }

    // Group rows by Order ID (if available) or treat as single orders
    // Store rowIndex in group for debugging
    const orderGroups = new Map<string, ImportOrderGroup>();
    // Standalone orders deprecated in favor of grouping logic
    const standaloneOrders: any[] = [];

    for (const [index, row] of rowsToImport.entries()) {
      const originalRowIndex = data.indexOf(row);

      // DEBUG: Log keys for first row
      if (index === 0) {
        console.log('[IMPORT DEBUG] Row Keys:', Object.keys(row));
        console.log('[IMPORT DEBUG] Row Sample:', JSON.stringify(row));
      }

      // Try to find a unique Order Identifier
      const companyName = findValueRobust(row, 'customer', 'client', 'company', 'branch') || '';
      const potentialMatch = companyMap.get(companyName.toLowerCase());

      // Try to find a unique Order Identifier
      const orderIdVal = findValueRobust(row, 'inv. no', 'inv no', 'order id', 'invoice', 'ref', 'order no', 'id', 'number');

      // If no ID, we can't group reliably, so treat as standalone (or maybe group by Company+Date?)
      // For now, let's treat as standalone to be safe, unless we want to try heuristic grouping.
      // Group Key: Combine Company ID (or Name) with Invoice Number to allow same Inv No for DIFF companies
      const safeCompanyId = potentialMatch ? potentialMatch.id : companyName.trim();
      const groupKey = orderIdVal ? `${safeCompanyId}|${orderIdVal.toString().trim()}` : `standalone-${index}`;

      if (!potentialMatch) {
        errors.push({
          rowIndex: originalRowIndex,
          errorType: 'missing-entity',
          errorMessage: `Could not find a valid company or branch named '${companyName}'.`,
          blocking: true,
          resolution: {
            type: 'create-entity',
            entity: 'company',
            suggestedData: { name: companyName, isBranch: false },
          },
        });
        continue;
      }

      const isBranch = potentialMatch.isBranch;
      const parentId = potentialMatch.parentCompanyId;

      let companyId: string;
      let branchId: string | null;
      let parentCompany: Company;

      if (isBranch && parentId) {
        const parent = companyIdMap.get(parentId);
        if (parent) {
          companyId = parentId;
          branchId = potentialMatch.id;
          parentCompany = parent;
        } else {
          companyId = potentialMatch.id;
          branchId = potentialMatch.id;
          parentCompany = potentialMatch;
        }
      } else {
        companyId = potentialMatch.id;
        branchId = null; // Fix: Main companies should have null branchId, not copy of companyId
        parentCompany = potentialMatch;
      }

      const productName = findValueRobust(row, 'product name', 'item name', 'product', 'item');
      const priceStr = findValueRobust(row, 'unit price', 'price');
      const price = parseNumber(priceStr);

      if (productName) {
        const product = productMap.get(productName.toLowerCase());

        if (!product) {
          errors.push({
            rowIndex: originalRowIndex,
            errorType: 'missing-entity',
            errorMessage: `Product '${productName}' not found.`,
            blocking: true,
            resolution: {
              type: 'create-entity',
              entity: 'product',
              suggestedData: { name: productName, price: price },
            },
          });
          continue;
        }

        const quantityStr = findValueRobust(row, 'sales qty', 'Sales QTY', 'quantity', 'qty', 'inv. qty', 'inv qty', 'Inv. Qty');
        const quantityRaw = parseNumber(quantityStr);

        const isReturn = quantityRaw < 0;
        const quantity = Math.abs(quantityRaw);

        if (isNaN(quantity) || quantity === 0 || isNaN(price) || price < 0) {
          errors.push({
            rowIndex: originalRowIndex,
            errorType: 'invalid-data',
            errorMessage: `Invalid quantity or price for product '${productName}'.`,
            blocking: false,
          });
          continue;
        }

        const orderDateStr = findValueRobust(row, 'date', 'order date', 'inv. date', 'inv date');
        const orderDate = parseDateISO(orderDateStr) || new Date().toISOString();

        const discountStr = ((row['discount'] ?? row['Discount'] ?? '') || '').toString().trim();
        const discountTypeStr = ((row['discountType'] ?? row['DiscountType'] ?? 'fixed') || 'fixed').toString().trim();
        const discountValue = parseNumber(discountStr);
        const discountType = discountTypeStr === 'percentage' ? 'percentage' : 'fixed';

        const taxStr = ((row['tax'] ?? row['Tax'] ?? row['VAT'] ?? row['VAT %'] ?? row['vatPercent'] ?? row['Tax %'] ?? '') || '').toString().trim().replace('%', '');
        let taxRate = parseNumber(taxStr);
        if (taxRate > 0 && taxRate < 1) {
          taxRate = taxRate * 100;
        }

        const areaStr = findValueRobust(row, 'area', 'region', 'location');

        // Item Data
        const itemData: ImportOrderItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId: product.id,
          productName: product.name,
          quantity: quantity,
          price: price,
          taxId: null,
          taxRate: taxRate > 0 ? taxRate : null,
          // taxAmount calculated later based on line item total
          discountType: discountValue > 0 ? discountType : null,
          discountValue: discountValue > 0 ? discountValue : null,
          isReturn
        };

        // Initialize group if needed
        if (!orderGroups.has(groupKey)) {
          orderGroups.set(groupKey, {
            companyId,
            branchId: branchId || companyId,
            companyName: parentCompany.name,
            branchName: potentialMatch.name,
            area: areaStr || undefined,
            orderDate,
            firstRowIndex: originalRowIndex, // Store first row index for debugging
            status: isReturn ? 'Cancelled' : 'Delivered',
            paymentStatus: isReturn ? 'Pending' : 'Paid', // Fix: Returns should not be Paid by default
            items: [],
            cancellationReason: isReturn ? 'item returned' : undefined,
            cancellationNotes: isReturn ? 'Auto-detected return' : undefined,
          });
        }

        const group = orderGroups.get(groupKey)!;
        group.items.push(itemData);
      }
    }

    // Query existing orders to check for duplicates
    // We need to process all orders first to get their final hashes
    console.log(`[Import] Processing ${orderGroups.size} order groups`);

    // PASS 1: Build all valid orders with their hashes
    const candidateOrders: OrderWithMetadata[] = [];

    for (const [key, group] of orderGroups) {
      let grandTotal = 0;
      let totalSubtotal = 0;
      let totalTax = 0;

      const processedItems = group.items.map((item: any) => {
        const { isReturn, price, quantity, discountType, discountValue, taxRate } = item;

        const subtotal = price * quantity;

        let discountAmount = 0;
        if (discountValue && discountValue > 0) {
          discountAmount = discountType === 'percentage' ? (subtotal * discountValue / 100) : discountValue;
        }

        const netAmount = subtotal - discountAmount;

        const taxMultiplier = (taxRate || 0) / 100;
        const taxAmount = netAmount * taxMultiplier;

        const itemTotal = netAmount + taxAmount;

        // Accumulate Order Totals
        if (isReturn) {
          totalSubtotal -= subtotal;
          totalTax -= taxAmount;
          grandTotal -= itemTotal;
        } else {
          totalSubtotal += subtotal;
          totalTax += taxAmount;
          grandTotal += itemTotal;
        }

        return {
          ...item,
          taxAmount: taxAmount > 0 ? taxAmount : null,
          // Remove temp flags
          isReturn: undefined
        };
      });

      // If mixed return/sale, determine main status
      // If grandTotal < 0, it's a return.
      const isOverallReturn = grandTotal < 0;

      const finalStatus = isOverallReturn ? 'Cancelled' : 'Delivered';
      const finalPaymentStatus = isOverallReturn ? 'Pending' : 'Paid'; // Fix: Returns are Pending (refund needed), Sales are Paid

      const orderData: OrderWithMetadata = {
        companyId: group.companyId,
        branchId: group.branchId,
        companyName: group.companyName,
        branchName: group.branchName,
        area: group.area,
        orderDate: group.orderDate,
        status: finalStatus,
        paymentStatus: finalPaymentStatus,
        subtotal: totalSubtotal,
        totalTax: totalTax,
        grandTotal: grandTotal,
        total: grandTotal,
        items: processedItems,
        statusHistory: [{ status: finalStatus as any, timestamp: group.orderDate }],
        importHash: '', // Will be set below
        __rowIndex: group.firstRowIndex,
        tempInvoiceNumber: key.split('|')[1] || key // Extract actual invoice number from composite key
      };

      // Generate Hash for the WHOLE order using SHA-256
      // IMPORTANT: Include the invoiceNumber (groupKey) to distinguish 
      // between multiple identical orders on the same day from the same company
      const orderHash = computeImportHash({
        invoiceNumber: orderData.tempInvoiceNumber, // Use extracted invoice number
        companyId: orderData.companyId,
        orderDate: orderData.orderDate,
        items: orderData.items.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price
        }))
      });

      orderData.importHash = orderHash;
      candidateOrders.push(orderData);
    }

    console.log(`[Import] Built ${candidateOrders.length} candidate orders`);

    // PASS 2: Query database for existing orders with these hashes
    const candidateHashes = candidateOrders.map(o => o.importHash);
    if (candidateHashes.length > 0) {
      const existingOrders = await queryInBatches<Order>('orders', 'importHash', candidateHashes);
      console.log(`[Import] Found ${existingOrders.length} existing orders in database`);
      existingOrders.forEach(o => {
        if (o.importHash) {
          // Add existing hash without detailed row info (as it's from DB)
          seenHashes.set(o.importHash, { invoiceNumber: 'EXISTING_IN_DB', rowIndex: -1 });
        }
      });
    }

    // PASS 3: Filter out duplicates (database + within-file)
    for (const orderData of candidateOrders) {
      const orderHash = orderData.importHash;

      if (seenHashes.has(orderHash)) {
        const existing = seenHashes.get(orderHash);
        const duplicateSource = existing?.rowIndex === -1 ? 'Database' : `Row ${existing?.rowIndex}`;

        console.log('========== DUPLICATE DETECTED ==========');
        console.log(`[DUPLICATE MERGE] Skipping Row ${orderData.__rowIndex} (Inv: ${orderData.tempInvoiceNumber}).`);
        console.log(`Matches Order from: ${duplicateSource} (Inv: ${existing?.invoiceNumber})`);
        console.log('Hash:', orderHash);
        console.log('Company:', orderData.companyName);
        console.log('Items:', JSON.stringify(orderData.items.map((i: any) => `${i.productName} (x${i.quantity})`).join(', ')));
        console.log('Items:', JSON.stringify(orderData.items.map((i: any) => `${i.productName} (x${i.quantity})`).join(', ')));
        console.log('=======================================');

        duplicates.push({
          rowIndex: orderData.__rowIndex,
          invoiceNumber: orderData.tempInvoiceNumber || 'N/A',
          source: duplicateSource,
          hash: orderHash,
          companyName: orderData.companyName || 'Unknown',
          date: orderData.orderDate,
          total: orderData.total,
          items: orderData.items.map((i: any) => `${i.productName} (x${i.quantity})`).join('; ')
        });

        skippedDuplicates++;
        continue;
      }

      console.log('[NEW ORDER]', JSON.stringify({
        hash: orderHash,
        company: orderData.companyName,
        date: orderData.orderDate,
        itemCount: orderData.items.length,
        total: orderData.total
      }));
      seenHashes.set(orderHash, {
        invoiceNumber: orderData.tempInvoiceNumber,
        rowIndex: orderData.__rowIndex
      });

      validOrders.push(orderData);
    }

    console.log(`[Import] After filtering: ${validOrders.length} unique orders, ${skippedDuplicates} duplicates skipped`);

    if (validOrders.length > 0 && errors.filter(e => e.blocking).length === 0) {
      console.log('Writing', validOrders.length, 'orders to Supabase');

      const BATCH_SIZE = 500;

      for (let i = 0; i < validOrders.length; i += BATCH_SIZE) {
        const batchOrders = validOrders.slice(i, i + BATCH_SIZE).map(order => {
          // Strip metadata fields to match strict Order type for insertion
          const { importHash, __rowIndex, tempInvoiceNumber, ...cleanOrder } = order;
          return cleanOrder;
        });
        const { error } = await supabaseAdmin.from('orders').insert(batchOrders);

        if (error) {
          console.error('Error inserting batch:', error);
          throw error;
        }
      }

      console.log('Batch insert successful');

      // Batch price audit logging - single DB call instead of N calls
      const auditEntries = validOrders
        .filter(order => order.items && order.items.length > 0)
        .flatMap(order => { // Fix: Flatten audit items to log ALL items, not just the first one
          return order.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            source: 'import' as const,
          }));
        });

      if (auditEntries.length > 0) {
        await logPriceAuditBatch(auditEntries);
        if (DEBUG) console.log(`[Import] Logged ${auditEntries.length} price audit entries in batch`);
      }
    }

    // Calculate totals for verification
    const importedTotal = validOrders.reduce((sum, o) => sum + o.total, 0);
    const importedSubtotal = validOrders.reduce((sum, o) => sum + o.subtotal, 0);

    const result = {
      // Fix: Success requires importedCount > 0 AND no existing blocking/non-blocking errors? 
      // User requested stricter success logic. Let's say if importedCount > 0 it is partial success if errors exist.
      // But typically "success" means everything went well.
      // Condition: importedCount > 0 AND errors.length === 0
      success: validOrders.length > 0 && errors.length === 0,
      importedCount: validOrders.length,
      skippedCount: skippedDuplicates,
      importedTotal,
      importedSubtotal,
      errors: errors,
      duplicates: duplicates
    };
    console.log('Import flow completed:', result);
    console.log(`Imported total revenue: $${importedTotal.toFixed(2)}`);
    console.log(`Imported subtotal: $${importedSubtotal.toFixed(2)}`);
    if (skippedDuplicates > 0) {
      console.log(`Skipped ${skippedDuplicates} duplicate orders`);
    }
    return result;
  } catch (error: any) {
    console.error("Critical error in importFlow:", error);
    console.error("Error details:", { message: error.message, stack: error.stack, name: error.name });
    return {
      success: false,
      importedCount: 0,
      errors: [{
        rowIndex: -1,
        errorType: 'invalid-data',
        errorMessage: `Server Error: ${error.message}`,
        blocking: true,
      }],
    };
  }
}
