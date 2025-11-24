import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseFile, validateCsvData, validateXlsxData } from '../file-import-utils';

// Mock Supabase if needed, though these tests focus on parsing logic which is mostly pure or uses libraries
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [] }),
    })),
  },
}));

describe('File Import Utils Integration', () => {
  const fixturesDir = path.join(__dirname, '../../test/fixtures');
  const csvPath = path.join(fixturesDir, 'products.csv');
  const xlsxPath = path.join(fixturesDir, 'products.xlsx');

  it('should correctly parse a valid CSV file', async () => {
    const csvBuffer = fs.readFileSync(csvPath);
    const file = new File([csvBuffer], 'products.csv', { type: 'text/csv' });

    const result = await parseFile(file);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      'Customer Name': 'Test Company A',
      'Cust Account': '1001',
      'Item Name': 'Widget A',
      'Quantity': '10',
      'Price': '100',
      'Amount': '1000'
    });
  });

  it('should correctly parse a valid XLSX file', async () => {
    const xlsxBuffer = fs.readFileSync(xlsxPath);
    const file = new File([xlsxBuffer], 'products.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const result = await parseFile(file);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      'Customer Name': 'Test Company A',
      'Cust Account': '1001',
      'Item Name': 'Widget A',
      'Inv. Qty': '10',
      'Price': '100',
      'Amount': '1000'
    });
  });

  it('should validate CSV data correctly', () => {
    const validRows = [
      { 'Customer Name': 'A', 'Cust Account': '1', 'Item Name': 'B', 'Quantity': '1', 'Price': '10' }
    ];
    const invalidRows = [
      { 'Customer Name': 'A', 'Cust Account': '1' } // Missing fields
    ];

    expect(validateCsvData(validRows).isValid).toBe(true);
    expect(validateCsvData(invalidRows).isValid).toBe(false);
    expect(validateCsvData(invalidRows).errors[0]).toContain('Missing required field');
  });

  it('should validate XLSX data correctly', () => {
    const validRows = [
      { 'Customer Name': 'A', 'Cust Account': '1', 'Item Name': 'B', 'Inv. Qty': '1', 'Price': '10' }
    ];
    const invalidRows = [
      { 'Customer Name': 'A', 'Cust Account': '1' } // Missing fields
    ];

    expect(validateXlsxData(validRows).isValid).toBe(true);
    expect(validateXlsxData(invalidRows).isValid).toBe(false);
  });

  it('should throw error for unsupported file types', async () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
  });
});
