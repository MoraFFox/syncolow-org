import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { CsvRow } from './types';
import { calculateTotal, calculateOrderTotals } from './pricing-calculator';

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
 * Parses CSV file content into an array of objects
 */
export function parseCsvFile(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
          return;
        }
        resolve(results.data as CsvRow[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parses Excel file (XLSX/XLS) content into an array of objects
 * Uses the first worksheet by default
 */
export function parseExcelFile(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with automatic header detection
        // This will parse the sheet treating the first row as headers
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ''
        });
        
        if (jsonData.length === 0) {
          resolve([]);
          return;
        }
        
        // Extract headers from the first row
        const headers = jsonData[0] as string[];
        
        // Convert the rest of the data to objects using headers as keys
        const result: CsvRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          const rowObject: CsvRow = {};
          
          let hasData = false;
          for (let j = 0; j < headers.length; j++) {
            // Use the header as the key and the corresponding cell value
            const header = String(headers[j] || `Column${j}`);
            const value = String(row[j] || '');
            rowObject[header] = value;
            if (value.trim() !== '') {
              hasData = true;
            }
          }
          
          // Only add rows that have at least one non-empty cell
          if (hasData) {
            result.push(rowObject);
          }
        }
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Maps XLSX sales data fields to the expected order format
 * This function transforms the XLSX data structure to match the system's expected format
 */
export function mapXlsxToOrderFormat(rows: CsvRow[]): CsvRow[] {
  return rows.map(row => {
    // Map the XLSX fields to the expected order format
    const mappedRow: CsvRow = {
      // Map customer-related fields
      'Customer Name': row['Customer Name'] || row['CustomerName'],
      'Cust Account': row['Cust Account'] || row['CustAccount'] || row['Account'],
      'Area': row['Area'] || row['Region'] || row['area'] || row['region'],
      
      // Map order-related fields
      'Inv. No': row['Inv. No'] || row['Invoice Number'] || row['InvoiceNo'] || row['invoice_no'],
      'Inv. Date': row['Inv. Date'] || row['Invoice Date'] || row['InvoiceDate'] || row['Date'] || row['date'],
      
      // Map product-related fields
      'Item ID': row['Item ID'] || row['ItemID'] || row['Product ID'] || row['ProductID'] || row['item_id'],
      'Item Name': row['Item Name'] || row['ItemName'] || row['Product Name'] || row['ProductName'] || row['name'],
      'Inv. Qty': row['Inv. Qty'] || row['Quantity'] || row['Qty'] || row['quantity'],
      'Inv. Unit': row['Inv. Unit'] || row['Unit'] || row['unit'],
      
      // Map pricing fields
      'Price': row['Price'] || row['Unit Price'] || row['UnitPrice'] || row['price'],
      'Amount': row['Amount'] || row['Total'] || row['Total Amount'] || row['total'],
      
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
export async function parseFile(file: File): Promise<CsvRow[]> {
  const fileType = getFileType(file.name);
  
  if (!fileType) {
    throw new Error('Unsupported file type. Please upload a CSV, XLS, or XLSX file.');
  }
  
  let rows: CsvRow[];
  
  switch (fileType) {
    case 'csv':
      rows = await parseCsvFile(file);
      // Validate CSV data
      const csvValidation = validateCsvData(rows);
      if (!csvValidation.isValid) {
        throw new Error(`CSV validation failed: ${csvValidation.errors.join('; ')}`);
      }
      break;
    case 'xlsx':
    case 'xls':
      rows = await parseExcelFile(file);
      // Apply field mapping for XLSX files to match expected format
      rows = mapXlsxToOrderFormat(rows);
      // Validate XLSX data
      const xlsxValidation = validateXlsxData(rows);
      if (!xlsxValidation.isValid) {
        throw new Error(`Excel validation failed: ${xlsxValidation.errors.join('; ')}`);
      }
      break;
    default:
      throw new Error('Unsupported file type');
  }
  
  return rows;
}

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
  // Import necessary Firebase functions at the top of the function
  const { db } = await import('./firebase');
  const { collection, getDocs } = await import('firebase/firestore');
  
  // Get all existing orders from the database
  const ordersSnapshot = await getDocs(collection(db, 'orders'));
  // We'll cast the data as any for now and check properties dynamically
  const existingOrders: any[] = ordersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
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
