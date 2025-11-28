
'use server';
import { supabaseAdmin } from '@/lib/supabase';
import { Company, Order, Product, ImportRowError, CsvRow, ImportResult, ImportableEntityType } from '@/lib/types';
import { logPriceAudit } from '@/lib/price-audit';

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
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
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
async function queryInBatches<T>(table: string, field: string, values: string[]): Promise<T[]> {
    if (values.length === 0) {
        return [];
    }
    // Supabase 'in' filter handles reasonably large arrays, but let's chunk to be safe
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


const parseNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  // Remove all characters that are not digits, dots, or minus signs
  // This handles "1,000" -> "1000", "$100" -> "100"
  const clean = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
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
    const validOrders: (Omit<Order, 'id'> & { importHash: string })[] = [];
    
    // We'll check for duplicates after building complete orders
    const seenHashes = new Set<string>();
    let skippedDuplicates = 0;

    // Group rows by Order ID (if available) or treat as single orders
    const orderGroups = new Map<string, any>();
    const standaloneOrders: any[] = [];

    for (const [index, row] of rowsToImport.entries()) {
      const originalRowIndex = data.indexOf(row);
      
      // Try to find a unique Order Identifier
      const orderIdVal = findValueRobust(row, 'order id', 'invoice', 'ref', 'order no', 'id', 'number');
      
      // If no ID, we can't group reliably, so treat as standalone (or maybe group by Company+Date?)
      // For now, let's treat as standalone to be safe, unless we want to try heuristic grouping.
      const groupKey = orderIdVal ? orderIdVal.toString().trim() : `standalone-${index}`;

      const companyName = findValueRobust(row, 'customer', 'client', 'company', 'branch') || '';
      const potentialMatch = companyMap.get(companyName.toLowerCase());

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
        branchId = potentialMatch.id;
        parentCompany = potentialMatch;
      }

      const productName = findValueRobust(row, 'product name', 'product', 'item');
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

          const quantityStr = findValueRobust(row, 'quantity', 'qty', 'inv. qty', 'inv qty');
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
          let orderDate: string;
          if (orderDateStr) {
            const numericDate = Number(orderDateStr);
            if (!isNaN(numericDate) && numericDate > 1000) {
              const excelEpoch = new Date(1899, 11, 30);
              const date = new Date(excelEpoch.getTime() + numericDate * 86400000);
              if (date.getFullYear() < 2000 || date.getFullYear() > 2100 || isNaN(date.getTime())) {
                 errors.push({
                  rowIndex: originalRowIndex,
                  errorType: 'invalid-data',
                  errorMessage: `Invalid date.`,
                  blocking: false,
                });
                continue;
              }
              orderDate = date.toISOString();
            } else {
              orderDate = new Date(orderDateStr).toISOString();
            }
          } else {
            orderDate = new Date().toISOString();
          }
          
          const discountStr = ((row['discount'] ?? row['Discount'] ?? '') || '').toString().trim();
          const discountTypeStr = ((row['discountType'] ?? row['DiscountType'] ?? 'fixed') || 'fixed').toString().trim();
          const discountValue = parseNumber(discountStr);
          const discountType = discountTypeStr === 'percentage' ? 'percentage' : 'fixed';
          
          const taxStr = ((row['tax'] ?? row['Tax'] ?? row['VAT'] ?? '') || '').toString().trim().replace('%', '');
          let taxRate = parseNumber(taxStr);
          if (taxRate > 0 && taxRate < 1) {
            taxRate = taxRate * 100;
          }

          const areaStr = findValueRobust(row, 'area', 'region', 'location');
          
          // Item Data
          const itemData = {
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
                area: areaStr || null,
                orderDate,
                status: isReturn ? 'Cancelled' : 'Delivered',
                paymentStatus: isReturn ? 'Pending' : 'Paid',
                items: [],
                cancellationReason: isReturn ? 'item returned' : null,
                cancellationNotes: isReturn ? 'Auto-detected return' : null,
                // We will calculate totals after aggregating all items
            });
          }
          
          const group = orderGroups.get(groupKey);
          
          // Conflict resolution: if dates differ in the same group, take the latest? Or first?
          // Let's stick to the first one for simplicity, or maybe update if this row has a date?
          // For now, assume grouped rows have consistent header data.
          
          group.items.push(itemData);
      }
    }

    // Query existing orders to check for duplicates
    // We need to process all orders first to get their final hashes
    console.log(`[Import] Processing ${orderGroups.size} order groups`);

    // PASS 1: Build all valid orders with their hashes
    const candidateOrders: (Omit<Order, 'id'> & { importHash: string })[] = [];
    
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
        const finalPaymentStatus = 'Paid'; // All imported orders marked as paid

        const orderData = {
            ...group,
            status: finalStatus,
            paymentStatus: finalPaymentStatus,
            subtotal: totalSubtotal,
            totalTax: totalTax,
            grandTotal: grandTotal,
            total: grandTotal,
            items: processedItems,
            statusHistory: [{status: finalStatus, timestamp: group.orderDate}],
        };
        
        // Generate Hash for the WHOLE order
        // IMPORTANT: Include the groupKey (order ID/invoice) to distinguish 
        // between multiple identical orders on the same day from the same company
        const orderHash = simpleHash(JSON.stringify({
            key: key, // This is the order ID/invoice number or standalone ID
            cid: orderData.companyId,
            date: orderData.orderDate,
            items: orderData.items.map((i: any) => i.productId + i.quantity),
            total: orderData.total
        }));
        
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
                seenHashes.add(o.importHash);
            }
        });
    }

    // PASS 3: Filter out duplicates (database + within-file)
    for (const orderData of candidateOrders) {
        const orderHash = orderData.importHash;
        
        if (seenHashes.has(orderHash)) {
            // Enhanced logging for duplicate detection
            console.log('========== DUPLICATE DETECTED ==========');
            console.log('Hash:', orderHash);
            console.log('Company:', orderData.companyName);
            console.log('Date:', orderData.orderDate);
            console.log('Total:', orderData.total);
            console.log('Items:', JSON.stringify(orderData.items, null, 2));
            console.log('Full order data:', JSON.stringify({
                companyId: orderData.companyId,
                date: orderData.orderDate,
                items: orderData.items.map((i: any) => ({ 
                    productId: i.productId, 
                    productName: i.productName,
                    quantity: i.quantity,
                    price: i.price
                })),
                total: orderData.total
            }, null, 2));
            console.log('=======================================');
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
        seenHashes.add(orderHash);
        
        validOrders.push(orderData);
    }
    
    console.log(`[Import] After filtering: ${validOrders.length} unique orders, ${skippedDuplicates} duplicates skipped`);

    if (validOrders.length > 0 && errors.filter(e => e.blocking).length === 0) {
      console.log('Writing', validOrders.length, 'orders to Supabase');
      
      const BATCH_SIZE = 500;
      
      for (let i = 0; i < validOrders.length; i += BATCH_SIZE) {
        const batchOrders = validOrders.slice(i, i + BATCH_SIZE);
        const { error } = await supabaseAdmin.from('orders').insert(batchOrders);
        
        if (error) {
            console.error('Error inserting batch:', error);
            throw error;
        }
      }
      
      console.log('Batch insert successful');
      
      // Log price audit entries only after successful order creation
      for (const order of validOrders) {
        if (order.items && order.items.length > 0) {
          const item = order.items[0];
          await logPriceAudit({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            source: 'import',
          });
        }
      }
    }

    // Calculate totals for verification
    const importedTotal = validOrders.reduce((sum, o) => sum + o.total, 0);
    const importedSubtotal = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
    
    const result = {
      success: errors.filter(e => e.blocking).length === 0,
      importedCount: validOrders.length,
      skippedCount: skippedDuplicates,
      importedTotal,
      importedSubtotal,
      errors: errors,
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
