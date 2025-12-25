
import { read, utils } from 'xlsx';
import Papa from 'papaparse';
import { CsvRow } from './types';
import { calculateTotal, calculateOrderTotals } from './pricing-calculator';
import { supabase } from '@/lib/supabase';

// Re-export from import-schema for convenient access
export {
  parseLocalizedNumber,
  excelSerialToISO,
  parseDate,
  computeImportHash,
  autoMapHeaders,
  mapHeaderToCanonical,
  normalizeHeader,
  normalizeUnit,
  applyAutoFixes,
  HEADER_SYNONYMS,
  REQUIRED_IMPORT_FIELDS,
  OPTIONAL_IMPORT_FIELDS,
  ERROR_CODES,
} from './import-schema';

export type { ImportFieldDef, AutoFix, ImportHashInput, ErrorCode } from './import-schema';

/**
 * Determines the file type based on the file extension
 */
export function getFileType(fileName: string): 'csv' | 'xlsx' | 'xls' | null {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'csv') return 'csv';
  if (extension === 'xlsx') return 'xlsx';
  if (extension === 'xls') return 'xls';
  return null;
}

/**
 * Parses a file (CSV or Excel) using a Web Worker to prevent UI freezing.
 */
export function parseFile(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    // Dynamically create worker to avoid bundling issues if possible, or use standard URL
    const worker = new Worker(new URL('./import.worker.ts', import.meta.url));
    const fileType = getFileType(file.name);

    worker.onmessage = (event: MessageEvent) => {
      const { type, data, error } = event.data;
      if (type === 'SUCCESS') {
        let rows = data as CsvRow[];

        try {
          if (fileType === 'csv') {
            const csvValidation = validateCsvData(rows);
            if (!csvValidation.isValid) {
              throw new Error(`CSV validation failed: ${csvValidation.errors.join('; ')}`);
            }
          } else if (fileType === 'xlsx' || fileType === 'xls') {
            rows = mapXlsxToOrderFormat(rows);
            const xlsxValidation = validateXlsxData(rows);
            if (!xlsxValidation.isValid) {
              throw new Error(`Excel validation failed: ${xlsxValidation.errors.join('; ')}`);
            }
          }
          resolve(rows);
        } catch (err: any) {
          reject(err);
        } finally {
          worker.terminate();
        }
      } else if (type === 'ERROR') {
        reject(new Error(error));
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      reject(new Error('Worker initialization failed'));
      worker.terminate();
    };


    if (fileType === 'csv') {
      worker.postMessage({ type: 'PARSE_CSV', file });
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      // Read as ArrayBuffer first to pass to worker (efficient transfer)
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          // Transfer the ArrayBuffer to the worker
          worker.postMessage({ type: 'PARSE_EXCEL', file: e.target.result }, [e.target.result as ArrayBuffer]);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file for passing to worker'));
        worker.terminate();
      }
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file type'));
      worker.terminate();
    }
  });
}

/**
 * Parses CSV file content into an array of objects
 * @deprecated Use parseFile instead
 */
export function parseCsvFile(file: File): Promise<CsvRow[]> {
  return parseFile(file);
}

/**
 * Parses Excel file (XLSX/XLS) content into an array of objects
 * @deprecated Use parseFile instead
 */
export function parseExcelFile(file: File): Promise<CsvRow[]> {
  return parseFile(file);
}

/**
 * Maps XLSX sales data fields to the expected order format
 * This function transforms the XLSX data structure to match the system's expected format
 * Enhanced with comprehensive synonym matching from import-schema.
 */
import { HEADER_SYNONYMS, mapHeaderToCanonical } from './import-schema';

// ... (keep usage, remove require)

export function mapXlsxToOrderFormat(rows: CsvRow[]): CsvRow[] {
  return rows.map(row => {
    // First, try to auto-map import-schema utils
    const canonicalRow: CsvRow = {};


    // DEBUG: Log first row keys and checking Synonyms
    if (rows.indexOf(row) === 0) {
      console.log('[IMPORT DEBUG] Raw Keys in mapXlsx:', Object.keys(row));
      console.log('[IMPORT DEBUG] HEADER_SYNONYMS loaded?', !!HEADER_SYNONYMS, 'Keys:', Object.keys(HEADER_SYNONYMS || {}).length);
      console.log('[IMPORT DEBUG] Check Inv. No mapping:', mapHeaderToCanonical ? mapHeaderToCanonical('Inv. No') : 'Function missing');
    }

    // Map each header to its canonical form
    for (const [rawHeader, value] of Object.entries(row)) {
      const canonical = mapHeaderToCanonical(rawHeader);
      if (canonical) {
        canonicalRow[canonical] = value;
      }
    }

    // Build the expected format with fallbacks for backward compatibility
    const mappedRow: CsvRow = {
      // Map customer-related fields
      'Customer Name': canonicalRow['customerName'] || row['Customer Name'] || row['CustomerName'],
      'Cust Account': canonicalRow['customerAccount'] || row['Cust Account'] || row['CustAccount'] || row['Account'],
      'Area': canonicalRow['area'] || row['Area'] || row['Region'] || row['area'] || row['region'],

      // Map order-related fields
      'Inv. No': canonicalRow['invoiceNumber'] || row['Inv. No'] || row['Invoice Number'] || row['InvoiceNo'] || row['invoice_no'],
      'Inv. Date': canonicalRow['invoiceDate'] || row['Inv. Date'] || row['Invoice Date'] || row['InvoiceDate'] || row['Date'] || row['date'],

      // Map product-related fields
      'Item ID': canonicalRow['itemId'] || row['Item ID'] || row['ItemID'] || row['Product ID'] || row['ProductID'] || row['item_id'],
      'Item Name': canonicalRow['itemName'] || row['Item Name'] || row['ItemName'] || row['Product Name'] || row['ProductName'] || row['name'],
      'Inv. Qty': canonicalRow['quantity'] || row['Inv. Qty'] || row['Quantity'] || row['Qty'] || row['quantity'],
      'Inv. Unit': canonicalRow['unit'] || row['Inv. Unit'] || row['Unit'] || row['unit'],

      // Map pricing fields
      'Price': canonicalRow['price'] || row['Price'] || row['Unit Price'] || row['UnitPrice'] || row['price'],
      'Amount': canonicalRow['lineTotal'] || row['Amount'] || row['Total'] || row['Total Amount'] || row['total'],

      // Map discount fields
      'Discount': canonicalRow['discountAmount'] || row['Discount'] || row['discount'],
      'Disc. %': canonicalRow['discountPercent'] || row['Disc. %'] || row['Discount %'],

      // Map tax fields
      'VAT %': canonicalRow['vatPercent'] || row['VAT %'] || row['Tax %'] || row['vat_rate'],
      'VAT Amount': canonicalRow['vatAmount'] || row['VAT Amount'] || row['Tax Amount'],

      // Add all original fields as fallback
      ...row
    };

    return mappedRow;
  });
}

/**
 * Validates CSV file data according to expected order format
 */
export function validateCsvData(rows: CsvRow[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rows.length === 0) {
    return { isValid: false, errors: ['CSV file is empty'] };
  }

  // Check for required fields in CSV format
  const requiredFields = ['Customer Name', 'Cust Account', 'Item Name', 'Quantity', 'Price'];
  const firstRow = rows[0];

  for (const field of requiredFields) {
    if (!firstRow.hasOwnProperty(field)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate data types and formats
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Validate numeric fields
    if (row['Quantity'] && isNaN(Number(row['Quantity']))) {
      errors.push(`Row ${i + 1}: Quantity must be a number`);
    }

    if (row['Price'] && isNaN(Number(row['Price']))) {
      errors.push(`Row ${i + 1}: Price must be a number`);
    }

    if (row['Amount'] && isNaN(Number(row['Amount']))) {
      errors.push(`Row ${i + 1}: Amount must be a number`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates XLSX file data according to expected sales format
 */
export function validateXlsxData(rows: CsvRow[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rows.length === 0) {
    return { isValid: false, errors: ['Excel file is empty'] };
  }

  // Check for required fields in XLSX format
  const requiredFields = ['Customer Name', 'Cust Account', 'Item Name', 'Inv. Qty', 'Price'];
  const firstRow = rows[0];

  for (const field of requiredFields) {
    if (!firstRow.hasOwnProperty(field)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate data types and formats specific to XLSX
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Validate numeric fields
    if (row['Inv. Qty'] && isNaN(Number(row['Inv. Qty']))) {
      errors.push(`Row ${i + 1}: Inv. Qty must be a number`);
    }

    if (row['Price'] && isNaN(Number(row['Price']))) {
      errors.push(`Row ${i + 1}: Price must be a number`);
    }

    if (row['Amount'] && isNaN(Number(row['Amount']))) {
      errors.push(`Row ${i + 1}: Amount must be a number`);
    }

    // Validate date format if present
    if (row['Inv. Date']) {
      const dateValue = new Date(row['Inv. Date']);
      if (isNaN(dateValue.getTime())) {
        errors.push(`Row ${i + 1}: Invalid date format for Inv. Date`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Generic function to parse either CSV or Excel file based on file type
 */


/**
 * Normalizes headers in the CSV rows to have consistent naming
 * This helps match Excel headers with CSV headers
 */
export function normalizeHeaders(rows: CsvRow[]): CsvRow[] {
  if (rows.length === 0) return rows;

  // Get all unique headers and normalize them
  const originalHeaders = Object.keys(rows[0]);
  const normalizedHeaderMap: Record<string, string> = {};

  originalHeaders.forEach(header => {
    const normalized = header
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\s]/g, '');
    normalizedHeaderMap[normalized] = header;
  });

  return rows.map(row => {
    const newRow: CsvRow = {};
    Object.keys(row).forEach(key => {
      // Find the original header that matches this key when normalized
      const originalKey = normalizedHeaderMap[key.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w\s]/g, '')] || key;
      newRow[originalKey] = row[key];
    });
    return newRow;
  });
}

/**
 * Detects duplicates within the import file
 * Creates a unique key based on customer name, item name, quantity, and price
 */
export function detectDuplicatesWithinFile(rows: CsvRow[]): { duplicateIndices: number[]; duplicateMap: Map<string, number[]> } {
  const seenKeys = new Map<string, number[]>();
  const duplicateIndices = new Set<number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Create a unique key based on customer name, item name, quantity, and price
    // These are the key fields that would identify a duplicate order item
    const customerName = (row['Customer Name'] || row['CustomerName'] || '').toLowerCase().trim();
    const itemName = (row['Item Name'] || row['ItemName'] || row['Product Name'] || row['ProductName'] || '').toLowerCase().trim();
    const quantity = (row['Inv. Qty'] || row['Quantity'] || row['Qty'] || row['quantity'] || '').toString();
    const price = (row['Price'] || row['Unit Price'] || row['UnitPrice'] || row['price'] || '').toString();

    // Create a composite key that identifies a unique order item
    const key = `${customerName}|${itemName}|${quantity}|${price}`;

    if (seenKeys.has(key)) {
      // If we've seen this key before, mark both the current index and the previous index as duplicates
      const existingIndices = seenKeys.get(key)!;
      existingIndices.forEach(idx => duplicateIndices.add(idx));
      duplicateIndices.add(i);
      existingIndices.push(i);
    } else {
      seenKeys.set(key, [i]);
    }
  }

  return {
    duplicateIndices: Array.from(duplicateIndices).sort((a, b) => a - b),
    duplicateMap: seenKeys
  };
}

/**
 * Detects duplicates against existing database records
 * This function checks if the records in the import file already exist in the database
 */
export async function detectDuplicatesAgainstDatabase(rows: CsvRow[]): Promise<{ duplicateIndices: number[]; existingRecords: CsvRow[] }> {
  // Get all existing orders from the database
  const { data: orders } = await supabase.from('orders').select('*');

  const existingOrders: any[] = orders || [];

  const duplicateIndices: number[] = [];
  const existingRecords: CsvRow[] = [];

  // For each row in the import file, check if it already exists in the database
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Create a unique key based on customer name, item name, quantity, and price
    const customerName = (row['Customer Name'] || row['CustomerName'] || '').toLowerCase().trim();
    const itemName = (row['Item Name'] || row['ItemName'] || row['Product Name'] || row['ProductName'] || '').toLowerCase().trim();
    const quantity = (row['Inv. Qty'] || row['Quantity'] || row['Qty'] || row['quantity'] || '').toString();
    const price = (row['Price'] || row['Unit Price'] || row['UnitPrice'] || row['price'] || '').toString();

    // Check if this combination exists in the existing orders
    const isDuplicate = existingOrders.some(order => {
      // Check if the order contains an item with the same product name, quantity, and price
      if (order.companyName?.toLowerCase().trim() === customerName &&
        Array.isArray(order.items) &&
        order.items.some((item: any) =>
          item.productName?.toLowerCase().trim() === itemName &&
          item.quantity?.toString() === quantity &&
          item.price?.toString() === price
        )) {
        return true;
      }
      return false;
    });

    if (isDuplicate) {
      duplicateIndices.push(i);
      existingRecords.push(row);
    }
  }

  return {
    duplicateIndices,
    existingRecords
  };
}

/**
 * Comprehensive duplicate detection function that checks both within file and against database
 */
export async function detectDuplicates(rows: CsvRow[]): Promise<{
  withinFile: { duplicateIndices: number[]; duplicateMap: Map<string, number[]> };
  againstDatabase: { duplicateIndices: number[]; existingRecords: CsvRow[] };
}> {
  const withinFile = detectDuplicatesWithinFile(rows);
  const againstDatabase = await detectDuplicatesAgainstDatabase(rows);

  return {
    withinFile,
    againstDatabase
  };
}

/**
 * Calculate totals for imported order items using the new pricing equation
 * Total = ((Quantity × Unit Price) - Discount) × 1.14
 */
export function calculateImportedOrderTotals(rows: CsvRow[]): CsvRow[] {
  return rows.map(row => {
    const quantity = parseFloat(row['Inv. Qty'] || row['Quantity'] || '0');
    const price = parseFloat(row['Price'] || row['Unit Price'] || '0');
    const discount = parseFloat(row['Discount'] || '0');

    if (quantity > 0 && price > 0) {
      const calculatedTotal = calculateTotal(quantity, price, discount);
      return {
        ...row,
        'Calculated Total': calculatedTotal.toFixed(2),
        'Original Amount': row['Amount'] || row['Total'] || '',
      };
    }

    return row;
  });
}

/**
 * Validate and recalculate order totals for import
 */
export function validateAndRecalculateOrderTotals(items: Array<{
  quantity: number;
  price: number;
  discountValue?: number;
}>): {
  isValid: boolean;
  totals: ReturnType<typeof calculateOrderTotals>;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate items
  items.forEach((item, index) => {
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    }
    if (item.price <= 0) {
      errors.push(`Item ${index + 1}: Price must be greater than 0`);
    }
    if (item.discountValue && item.discountValue < 0) {
      errors.push(`Item ${index + 1}: Discount cannot be negative`);
    }
  });

  const totals = calculateOrderTotals(items);

  return {
    isValid: errors.length === 0,
    totals,
    errors,
  };
}
