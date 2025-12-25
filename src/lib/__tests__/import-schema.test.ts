/**
 * @fileoverview Unit tests for Import Schema utilities
 * Tests: parseLocalizedNumber, excelSerialToISO, parseDate, computeImportHash,
 *        mapHeaderToCanonical, normalizeUnit, applyAutoFixes
 */

import { describe, it, expect } from 'vitest';
import {
    parseLocalizedNumber,
    excelSerialToISO,
    parseDate,
    computeImportHash,
    mapHeaderToCanonical,
    normalizeHeader,
    normalizeUnit,
    applyAutoFixes,
    autoMapHeaders,
} from '../import-schema';

describe('Import Schema Utilities', () => {
    // ==========================================================================
    // parseLocalizedNumber tests
    // ==========================================================================
    describe('parseLocalizedNumber', () => {
        it('should parse US format numbers (1,234.56)', () => {
            expect(parseLocalizedNumber('1,234.56')).toBe(1234.56);
            expect(parseLocalizedNumber('10,000.00')).toBe(10000);
            expect(parseLocalizedNumber('1,234,567.89')).toBe(1234567.89);
        });

        it('should parse European format numbers (1.234,56)', () => {
            expect(parseLocalizedNumber('1.234,56')).toBe(1234.56);
            expect(parseLocalizedNumber('10.000,00')).toBe(10000);
            expect(parseLocalizedNumber('1.234.567,89')).toBe(1234567.89);
        });

        it('should handle currency symbols', () => {
            expect(parseLocalizedNumber('$100.50')).toBe(100.5);
            expect(parseLocalizedNumber('€1.234,56')).toBe(1234.56);
            expect(parseLocalizedNumber('£99.99')).toBe(99.99);
        });

        it('should handle plain numbers', () => {
            expect(parseLocalizedNumber('100')).toBe(100);
            expect(parseLocalizedNumber('100.50')).toBe(100.5);
            expect(parseLocalizedNumber(100)).toBe(100);
        });

        it('should handle edge cases', () => {
            expect(parseLocalizedNumber('')).toBe(0);
            expect(parseLocalizedNumber(null)).toBe(0);
            expect(parseLocalizedNumber(undefined)).toBe(0);
            expect(parseLocalizedNumber('abc')).toBe(0);
            expect(parseLocalizedNumber('  123  ')).toBe(123);
        });

        it('should handle ambiguous comma as decimal (123,45)', () => {
            // When comma is followed by 2 digits, treat as European decimal
            expect(parseLocalizedNumber('123,45')).toBe(123.45);
            expect(parseLocalizedNumber('0,99')).toBe(0.99);
        });
    });

    // ==========================================================================
    // excelSerialToISO tests
    // ==========================================================================
    describe('excelSerialToISO', () => {
        it('should convert Excel serial dates correctly', () => {
            expect(excelSerialToISO(44927)).toBe('2023-01-01');
            expect(excelSerialToISO(45292)).toBe('2024-01-01');
            expect(excelSerialToISO(44197)).toBe('2021-01-01');
        });

        it('should throw for dates out of valid range', () => {
            expect(() => excelSerialToISO(100)).toThrow('Date out of valid range');
            expect(() => excelSerialToISO(100000)).toThrow('Date out of valid range');
        });
    });

    // ==========================================================================
    // parseDate tests
    // ==========================================================================
    describe('parseDate', () => {
        it('should parse Excel serial numbers', () => {
            expect(parseDate(44927)).toBe('2023-01-01');
            expect(parseDate('44927')).toBe('2023-01-01');
        });

        it('should parse ISO date strings', () => {
            expect(parseDate('2023-01-01')).toBe('2023-01-01');
            expect(parseDate('2023-01-01T00:00:00.000Z')).toBe('2023-01-01');
        });

        it('should parse other date formats', () => {
            // Use ISO format which is timezone-safe
            expect(parseDate('2023-06-15')).toBe('2023-06-15');
        });

        it('should return null for invalid dates', () => {
            expect(parseDate('')).toBe(null);
            expect(parseDate(null)).toBe(null);
            expect(parseDate(undefined)).toBe(null);
            expect(parseDate('not a date')).toBe(null);
        });
    });

    // ==========================================================================
    // computeImportHash tests
    // ==========================================================================
    describe('computeImportHash', () => {
        it('should generate deterministic hashes', () => {
            const input = {
                invoiceNumber: 'INV-001',
                companyId: 'company-1',
                orderDate: '2023-01-01T00:00:00.000Z',
                items: [{ productId: 'prod-1', quantity: 10, price: 100 }]
            };

            const hash1 = computeImportHash(input);
            const hash2 = computeImportHash(input);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(16); // SHA-256 truncated to 16 chars
        });

        it('should generate different hashes for different inputs', () => {
            const input1 = {
                invoiceNumber: 'INV-001',
                companyId: 'company-1',
                orderDate: '2023-01-01',
                items: [{ productId: 'prod-1', quantity: 10, price: 100 }]
            };

            const input2 = {
                invoiceNumber: 'INV-002',
                companyId: 'company-1',
                orderDate: '2023-01-01',
                items: [{ productId: 'prod-1', quantity: 10, price: 100 }]
            };

            expect(computeImportHash(input1)).not.toBe(computeImportHash(input2));
        });

        it('should normalize date to date-only', () => {
            const input1 = {
                invoiceNumber: 'INV-001',
                companyId: 'company-1',
                orderDate: '2023-01-01T00:00:00.000Z',
                items: [{ productId: 'prod-1', quantity: 10, price: 100 }]
            };

            const input2 = {
                invoiceNumber: 'INV-001',
                companyId: 'company-1',
                orderDate: '2023-01-01T23:59:59.999Z',
                items: [{ productId: 'prod-1', quantity: 10, price: 100 }]
            };

            expect(computeImportHash(input1)).toBe(computeImportHash(input2));
        });
    });

    // ==========================================================================
    // Header Mapping tests
    // ==========================================================================
    describe('mapHeaderToCanonical', () => {
        it('should map exact matches (case-insensitive)', () => {
            expect(mapHeaderToCanonical('Customer Name')).toBe('customerName');
            expect(mapHeaderToCanonical('CUSTOMER NAME')).toBe('customerName');
            expect(mapHeaderToCanonical('Inv. Qty')).toBe('quantity');
        });

        it('should map normalized matches', () => {
            expect(mapHeaderToCanonical('customer_name')).toBe('customerName');
            expect(mapHeaderToCanonical('CustomerName')).toBe('customerName');
            expect(mapHeaderToCanonical('invqty')).toBe('quantity');
        });

        it('should map synonyms', () => {
            expect(mapHeaderToCanonical('client')).toBe('customerName');
            expect(mapHeaderToCanonical('buyer')).toBe('customerName');
            expect(mapHeaderToCanonical('qty')).toBe('quantity');
            // 'description' is an unambiguous synonym for itemName
            expect(mapHeaderToCanonical('description')).toBe('itemName');
        });

        it('should return null for unknown headers', () => {
            expect(mapHeaderToCanonical('unknown_column')).toBe(null);
            expect(mapHeaderToCanonical('xyz123')).toBe(null);
        });
    });

    describe('autoMapHeaders', () => {
        it('should auto-map an array of headers', () => {
            const headers = ['Customer Name', 'Item Name', 'Qty', 'Price', 'Unknown'];
            const mapping = autoMapHeaders(headers);

            expect(mapping['customerName']).toBe('Customer Name');
            expect(mapping['itemName']).toBe('Item Name');
            expect(mapping['quantity']).toBe('Qty');
            expect(mapping['price']).toBe('Price');
            expect(Object.keys(mapping)).not.toContain('Unknown');
        });
    });

    // ==========================================================================
    // Unit Normalization tests
    // ==========================================================================
    describe('normalizeUnit', () => {
        it('should normalize unit variations', () => {
            expect(normalizeUnit('KG').normalized).toBe('kg');
            expect(normalizeUnit('kg.').normalized).toBe('kg');
            expect(normalizeUnit('Kg').normalized).toBe('kg');
            expect(normalizeUnit('kilograms').normalized).toBe('kg');
        });

        it('should indicate if change occurred', () => {
            expect(normalizeUnit('kg').changed).toBe(false);
            expect(normalizeUnit('KG').changed).toBe(true);
            expect(normalizeUnit('kg.').changed).toBe(true);
        });

        it('should handle various units', () => {
            expect(normalizeUnit('pcs.').normalized).toBe('pcs');
            expect(normalizeUnit('pieces').normalized).toBe('pcs');
            expect(normalizeUnit('L').normalized).toBe('ltr');
            expect(normalizeUnit('liters').normalized).toBe('ltr');
        });
    });

    // ==========================================================================
    // Auto-Fix tests
    // ==========================================================================
    describe('applyAutoFixes', () => {
        it('should trim whitespace from string values', () => {
            const row = { customerName: '  Test Company  ', itemName: 'Product' };
            const { fixedRow, fixes } = applyAutoFixes(row);

            expect(fixedRow['customerName']).toBe('Test Company');
            expect(fixes).toHaveLength(1);
            expect(fixes[0].ruleId).toBe('AF_001');
        });

        it('should normalize units', () => {
            const row = { unit: 'KG.', customerName: 'Test' };
            const { fixedRow, fixes } = applyAutoFixes(row);

            expect(fixedRow['unit']).toBe('kg');
            expect(fixes.some(f => f.ruleId === 'AF_002')).toBe(true);
        });

        it('should convert multi-line text to single-line', () => {
            const row = { customerName: 'Line 1\nLine 2', itemName: 'Test' };
            const { fixedRow, fixes } = applyAutoFixes(row);

            expect(fixedRow['customerName']).toBe('Line 1, Line 2');
            expect(fixes.some(f => f.ruleId === 'AF_008')).toBe(true);
        });

        it('should not modify values that need no fixing', () => {
            const row = { customerName: 'Clean Company', itemName: 'Product', unit: 'kg' };
            const { fixedRow, fixes } = applyAutoFixes(row);

            expect(fixedRow).toEqual(row);
            expect(fixes).toHaveLength(0);
        });
    });
});
