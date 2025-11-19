
'use server';
import { collection, getDocs, writeBatch, doc, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
}

// Helper function to query Firestore with 'in' operator in chunks of 30
async function queryInBatches<T>(collectionRef: any, field: string, values: string[]): Promise<T[]> {
    if (values.length === 0) {
        return [];
    }
    const chunks = [];
    for (let i = 0; i < values.length; i += 30) {
        chunks.push(values.slice(i, i + 30));
    }

    const isDocumentIdQuery = field === documentId().toString();

    const snapshotPromises = chunks.map(chunk => {
        if (isDocumentIdQuery) {
            return getDocs(query(collectionRef, where(documentId(), 'in', chunk)));
        }
        return getDocs(query(collectionRef, where(field, 'in', chunk)));
    });

    const snapshots = await Promise.all(snapshotPromises);
    
    const results: T[] = [];
    snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
            results.push({ id: doc.id, ...(doc.data() as Partial<T>) } as T);
        });
    });

    return results;
}


export async function importFlow({
  entityType,
  data,
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

    const companyNames = new Set<string>();
    const productNames = new Set<string>();
    for (const row of rowsToImport) {
        const companyName = findValueRobust(row, 'customer', 'client', 'company', 'branch');
        if (companyName) companyNames.add(companyName);

        const productName = findValueRobust(row, 'product name', 'product', 'item');
        if (productName) productNames.add(productName);
    }

    const companiesAndBranches = await queryInBatches<Company>(collection(db, 'companies'), 'name', Array.from(companyNames));
    
    // New logic: find parent companies for any branches found
    const parentCompanyIds = new Set<string>();
    const existingCompanyIds = new Set(companiesAndBranches.map(c => c.id));
    companiesAndBranches.forEach(c => {
        if (c.isBranch && c.parentCompanyId && !existingCompanyIds.has(c.parentCompanyId)) {
            parentCompanyIds.add(c.parentCompanyId);
        }
    });

    let allCompanies = [...companiesAndBranches];
    if (parentCompanyIds.size > 0) {
        const parentCompanies = await queryInBatches<Company>(collection(db, 'companies'), documentId().toString(), Array.from(parentCompanyIds));
        allCompanies = [...allCompanies, ...parentCompanies];
    }
    // End of new logic


    const products = await queryInBatches<Product>(collection(db, 'products'), 'name', Array.from(productNames));
    
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
    
    // Check for existing hashes to prevent duplicates
    const hashes = rowsToImport.map(row => simpleHash(JSON.stringify(row)));
    const existingOrders = await queryInBatches<Order>(collection(db, 'orders'), 'importHash', hashes);
    const existingHashes = new Set(existingOrders.map(o => o.importHash));
    let skippedDuplicates = 0;

    for (const [index, row] of rowsToImport.entries()) {
      const originalRowIndex = data.indexOf(row);
      const rowHash = simpleHash(JSON.stringify(row));
      
      // Skip if already imported
      if (existingHashes.has(rowHash)) {
        console.log('Skipping duplicate row', index, 'with hash', rowHash);
        skippedDuplicates++;
        continue;
      }

      const companyName = findValueRobust(row, 'customer', 'client', 'company', 'branch') || '';
      console.log('Processing row', index, '- Company name found:', companyName);
      const potentialMatch = companyMap.get(companyName.toLowerCase());
      console.log('Company match in DB:', potentialMatch ? 'FOUND' : 'NOT FOUND');

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
          // Parent doesn't exist, treat branch as standalone company
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
      console.log('Product name found:', productName);
      const priceStr = findValueRobust(row, 'unit price', 'price');
      const price = priceStr ? parseFloat(priceStr) : 0;
      
      if (productName) {
          const product = productMap.get(productName.toLowerCase());
          console.log('Product match in DB:', product ? 'FOUND' : 'NOT FOUND');

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

          const quantityStr = findValueRobust(row, 'quantity', 'order', 'qty');
          const quantityRaw = quantityStr ? parseFloat(quantityStr) : 0;
          
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

          const orderDateStr = findValueRobust(row, 'date', 'order');
          let orderDate: string;
          if (orderDateStr) {
            const numericDate = Number(orderDateStr);
            if (!isNaN(numericDate) && numericDate > 1000) {
              // Excel serial date number (days since 1900-01-01)
              const excelEpoch = new Date(1899, 11, 30);
              const date = new Date(excelEpoch.getTime() + numericDate * 86400000);
              
              // Validate date is reasonable (between 2000 and 2100)
              if (date.getFullYear() < 2000 || date.getFullYear() > 2100 || isNaN(date.getTime())) {
                errors.push({
                  rowIndex: originalRowIndex,
                  errorType: 'invalid-data',
                  errorMessage: `Invalid date: ${orderDateStr} parsed to ${date.toISOString()}. Year must be between 2000-2100.`,
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
          
          // Step 1: Calculate Subtotal = Qty × Price
          const subtotal = price * quantity;
          
          // Step 2: Calculate Discount Amount
          const discountStr = ((row['discount'] ?? row['Discount'] ?? '') || '').toString().trim();
          const discountTypeStr = ((row['discountType'] ?? row['DiscountType'] ?? 'fixed') || 'fixed').toString().trim();
          const discountValue = discountStr && !isNaN(parseFloat(discountStr)) ? parseFloat(discountStr) : 0;
          const discountType = discountTypeStr === 'percentage' ? 'percentage' : 'fixed';
          
          // For negative orders, discount is already negative in the CSV
          let discountAmount = 0;
          if (discountValue !== 0 && !isNaN(discountValue)) {
            discountAmount = discountType === 'percentage' ? (subtotal * discountValue / 100) : Math.abs(discountValue);
          }
          
          // Step 3: Calculate Net Amount = Subtotal − Discount
          const netAmount = subtotal - discountAmount;
          
          // Step 4: Calculate VAT Amount = Net Amount × VAT Rate
          const taxStr = ((row['tax'] ?? row['Tax'] ?? row['VAT'] ?? '') || '').toString().trim().replace('%', '');
          let taxRate = taxStr && !isNaN(parseFloat(taxStr)) ? parseFloat(taxStr) : 0;
          // If tax is in decimal form (0.14), use directly; if percentage (14), divide by 100
          const taxMultiplier = (taxRate > 0 && taxRate < 1) ? taxRate : (taxRate / 100);
          const taxAmount = taxRate > 0 && !isNaN(taxRate) ? (netAmount * taxMultiplier) : 0;
          // Store taxRate as percentage for display
          if (taxRate > 0 && taxRate < 1) {
            taxRate = taxRate * 100;
          }
          
          // Step 5: Calculate Total = Net Amount + VAT Amount
          // For returns (negative qty), make all amounts negative to subtract from revenue
          const grandTotal = isReturn ? -(netAmount + taxAmount) : (netAmount + taxAmount);
          
          console.log('Order calculation for row', index, ':', {
            isReturn,
            qty: quantityRaw,
            absQty: quantity,
            price,
            subtotal,
            discountStr,
            discountType,
            discountValue,
            discountAmount,
            netAmount,
            taxStr,
            taxRate,
            taxAmount,
            grandTotal,
            expectedTotal: isReturn ? -15754.8 : 'N/A'
          });
          
          const areaStr = findValueRobust(row, 'area', 'region', 'location');
          
          const orderStatus = isReturn ? 'Cancelled' as const : 'Delivered' as const;
          const orderPaymentStatus = isReturn ? 'Pending' as const : 'Paid' as const;
          
          const newOrderData: any = {
            importHash: rowHash,
            companyId: companyId,
            branchId: branchId || companyId,
            companyName: parentCompany.name,
            branchName: potentialMatch.name,
            area: areaStr || null,
            orderDate,
            deliveryDate: null,
            paymentDueDate: null,
            status: orderStatus,
            paymentStatus: orderPaymentStatus,
            subtotal: isReturn ? -subtotal : subtotal,
            totalTax: isReturn ? -taxAmount : taxAmount,
            grandTotal,
            total: grandTotal,
            items: [{
                id: `item-${Date.now()}`,
                productId: product.id,
                productName: product.name,
                quantity: quantity,
                price: price,
                taxId: null,
                taxRate: taxRate > 0 ? taxRate : null,
                taxAmount: taxAmount > 0 ? taxAmount : null,
                discountType: null,
                discountValue: null,
            }],
            statusHistory: [{status: orderStatus, timestamp: orderDate}],
            isReturn: isReturn,
          };
          
          if (isReturn) {
            newOrderData.cancellationReason = 'item returned';
            newOrderData.cancellationNotes = 'Auto-detected return from import (negative quantity)';
          }
          
          if (discountValue > 0) {
            newOrderData.discountType = discountType;
            newOrderData.discountValue = discountValue;
            newOrderData.discountAmount = discountAmount;
          }
          validOrders.push(newOrderData);
      }
    }

    if (validOrders.length > 0 && errors.filter(e => e.blocking).length === 0) {
      console.log('Writing', validOrders.length, 'orders to Firestore');
      
      const BATCH_SIZE = 500;
      const batches = [];
      
      for (let i = 0; i < validOrders.length; i += BATCH_SIZE) {
        const batchOrders = validOrders.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        
        batchOrders.forEach(order => {
          const newOrderRef = doc(collection(db, 'orders'));
          batch.set(newOrderRef, order);
        });
        
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      console.log('Batch commit successful');
      
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
