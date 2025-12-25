/**
 * @fileoverview Official Import Schema and Validation for Orders Import Service
 * Provides canonical field definitions, header mapping, and validation utilities.
 */

import { createHash } from 'crypto';

// =============================================================================
// CANONICAL FIELD DEFINITIONS
// =============================================================================

export interface ImportFieldDef {
    key: string;
    label: string;
    description: string;
    dataType: 'string' | 'number' | 'date' | 'decimal';
    required: boolean;
    maxLength?: number;
    min?: number;
    max?: number;
}

export const REQUIRED_IMPORT_FIELDS: ImportFieldDef[] = [
    { key: 'customerName', label: 'Customer Name', description: 'Company/branch name', dataType: 'string', required: true, maxLength: 255 },
    { key: 'itemName', label: 'Item Name', description: 'Product name', dataType: 'string', required: true, maxLength: 255 },
    { key: 'quantity', label: 'Quantity', description: 'Order quantity (negative for returns)', dataType: 'number', required: true },
    { key: 'price', label: 'Price', description: 'Unit price', dataType: 'decimal', required: true, min: 0 },
];

export const OPTIONAL_IMPORT_FIELDS: ImportFieldDef[] = [
    { key: 'invoiceNumber', label: 'Invoice Number', description: 'Invoice/Order reference', dataType: 'string', required: false, maxLength: 50 },
    { key: 'invoiceDate', label: 'Invoice Date', description: 'Order date', dataType: 'date', required: false },
    { key: 'customerAccount', label: 'Customer Account', description: 'Account code', dataType: 'string', required: false, maxLength: 50 },
    { key: 'area', label: 'Area', description: 'Delivery area/region', dataType: 'string', required: false, maxLength: 100 },
    { key: 'itemId', label: 'Item ID', description: 'Product SKU or ID', dataType: 'string', required: false, maxLength: 50 },
    { key: 'unit', label: 'Unit', description: 'Unit of measure', dataType: 'string', required: false, maxLength: 20 },
    { key: 'discountPercent', label: 'Discount %', description: 'Discount percentage (0-100)', dataType: 'number', required: false, min: 0, max: 100 },
    { key: 'discountAmount', label: 'Discount Amount', description: 'Fixed discount', dataType: 'decimal', required: false },
    { key: 'vatPercent', label: 'VAT %', description: 'Tax percentage', dataType: 'number', required: false, min: 0, max: 100 },
    { key: 'lineTotal', label: 'Line Total', description: 'Line item total (for verification)', dataType: 'decimal', required: false },
];

export const ALL_IMPORT_FIELDS = [...REQUIRED_IMPORT_FIELDS, ...OPTIONAL_IMPORT_FIELDS];

// =============================================================================
// HEADER SYNONYM MAPPING
// =============================================================================

/**
 * Maps canonical field keys to arrays of possible header variations.
 * Includes English and Arabic variations.
 */
export const HEADER_SYNONYMS: Record<string, string[]> = {
    invoiceNumber: [
        'inv. no', 'invoice number', 'invno', 'invoiceno', 'invoice_number',
        'order_id', 'order id', 'ref', 'reference', 'order_no', 'order no',
        'bill_no', 'receipt', 'رقم الفاتورة'
    ],
    invoiceDate: [
        'inv. date', 'invoice date', 'invdate', 'invoicedate', 'invoice_date',
        'order_date', 'order date', 'date', 'bill_date', 'created_at', 'تاريخ'
    ],
    customerName: [
        'customer name', 'company name', 'customername', 'companyname',
        'client', 'branch', 'account_name', 'buyer', 'customer', 'company',
        'العميل', 'اسم العميل'
    ],
    customerAccount: [
        'cust account', 'custaccount', 'customer account', 'account',
        'account_no', 'customer_id', 'client_code', 'رقم الحساب'
    ],
    area: [
        'area', 'region', 'location', 'zone', 'territory', 'delivery_area', 'المنطقة'
    ],
    itemId: [
        'item id', 'product id', 'itemid', 'productid', 'item_id', 'product_id',
        'sku', 'code', 'product_code', 'part_no', 'barcode'
    ],
    itemName: [
        'item name', 'product name', 'itemname', 'productname', 'item_name', 'product_name',
        'description', 'product', 'item', 'اسم المنتج'
    ],
    quantity: [
        'inv. qty', 'inv qty', 'invqty', 'quantity', 'qty', 'units', 'count', 'amount', 'الكمية',
        'sales qty', 'sales_qty', 'salesqty'
    ],
    unit: [
        'inv. unit', 'inv unit', 'invunit', 'unit', 'uom', 'measure', 'unit_of_measure'
    ],
    price: [
        'price', 'unit price', 'unitprice', 'unit_price', 'rate', 'cost', 'unit_cost', 'السعر'
    ],
    discountPercent: [
        'disc. %', 'disc %', 'discount %', 'discpercent', 'discountpercent',
        'disc_pct', 'discount_rate', 'discount percent'
    ],
    discountAmount: [
        'disc. amount', 'disc amount', 'discount', 'discount amount',
        'discamount', 'disc_value', 'rebate'
    ],
    vatPercent: [
        'vat %', 'tax %', 'vatpercent', 'taxpercent', 'vat_rate', 'tax_rate', 'gst'
    ],
    vatAmount: [
        'vat amount', 'tax amount', 'vatamount', 'taxamount', 'vat', 'tax', 'ضريبة'
    ],
    lineTotal: [
        'amount', 'line total', 'linetotal', 'line_total', 'subtotal',
        'line_amount', 'item_total', 'المبلغ'
    ],
    grandTotal: [
        'total', 'grand total', 'grandtotal', 'grand_total',
        'invoice_total', 'net_total', 'الإجمالي'
    ],
};

// =============================================================================
// HEADER NORMALIZATION & MATCHING
// =============================================================================

/**
 * Normalizes a header string for comparison.
 * Removes punctuation, whitespace variations, and converts to lowercase.
 */
export function normalizeHeader(header: string): string {
    return header
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]/g, '') // Keep alphanumeric and Arabic
        .trim();
}

/**
 * Maps a raw header to a canonical field key using prioritized matching.
 * Priority: 1. Exact match → 2. Normalized match → 3. Fuzzy synonym match
 * 
 * @returns Canonical field key or null if no match found
 */
export function mapHeaderToCanonical(rawHeader: string): string | null {
    const normalized = normalizeHeader(rawHeader);
    const lowerRaw = rawHeader.toLowerCase().trim();

    for (const [canonical, synonyms] of Object.entries(HEADER_SYNONYMS)) {
        // Priority 1: Exact match (case-insensitive)
        if (synonyms.some(s => s.toLowerCase() === lowerRaw)) {
            return canonical;
        }

        // Priority 2: Normalized match
        if (synonyms.some(s => normalizeHeader(s) === normalized)) {
            return canonical;
        }

        // Priority 3: Fuzzy contains match
        if (synonyms.some(s => normalized.includes(normalizeHeader(s)) || normalizeHeader(s).includes(normalized))) {
            return canonical;
        }
    }

    return null;
}

/**
 * Auto-maps an array of raw headers to canonical fields.
 * Returns a mapping object: { canonicalKey: rawHeader }
 */
export function autoMapHeaders(rawHeaders: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const usedHeaders = new Set<string>();

    for (const rawHeader of rawHeaders) {
        const canonical = mapHeaderToCanonical(rawHeader);
        if (canonical && !mapping[canonical] && !usedHeaders.has(rawHeader)) {
            mapping[canonical] = rawHeader;
            usedHeaders.add(rawHeader);
        }
    }

    return mapping;
}

// =============================================================================
// NUMBER PARSING
// =============================================================================

/**
 * Parses a localized number string to a JavaScript number.
 * Handles: European format (1.234,56), US format (1,234.56), currency symbols.
 */
export function parseLocalizedNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value !== 'string') return 0;

    let clean = value.trim();
    if (!clean) return 0;

    // Remove currency symbols
    clean = clean.replace(/[$€£¥₹]/g, '');
    // Remove whitespace
    clean = clean.replace(/\s/g, '');

    // Detect format based on last separator position
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (lastComma > lastDot && lastDot !== -1) {
        // European: 1.234,56 → 1234.56
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma && lastComma !== -1) {
        // US: 1,234.56 → 1234.56
        clean = clean.replace(/,/g, '');
    } else if (lastComma !== -1 && lastDot === -1) {
        // Ambiguous: check decimal digits
        const afterComma = clean.substring(lastComma + 1);
        if (afterComma.length <= 2) {
            // Likely European decimal: 123,45 → 123.45
            clean = clean.replace(',', '.');
        } else {
            // Likely US thousands: 1,234 → 1234
            clean = clean.replace(/,/g, '');
        }
    }

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

// =============================================================================
// DATE PARSING
// =============================================================================

/**
 * Converts an Excel serial date number to an ISO8601 date string.
 * Excel epoch: December 30, 1899 (accounting for leap year bug)
 */
export function excelSerialToISO(serial: number): string {
    // Excel epoch: December 30, 1899
    const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));
    const msPerDay = 86400000;

    const date = new Date(EXCEL_EPOCH.getTime() + serial * msPerDay);

    // Validate reasonable date range
    const year = date.getUTCFullYear();
    if (year < 2000 || year > 2100) {
        throw new Error(`Date out of valid range: ${date.toISOString()}`);
    }

    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Parses various date formats to ISO8601 string.
 * Supports: Excel serial numbers, ISO8601, DD/MM/YYYY, MM/DD/YYYY
 */
export function parseDate(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined || value === '') return null;

    // Handle Excel serial numbers
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
        const serial = typeof value === 'number' ? value : parseInt(value.trim(), 10);
        if (serial > 1000 && serial < 100000) {
            try {
                return excelSerialToISO(serial);
            } catch {
                return null;
            }
        }
    }

    // Try parsing as Date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        if (year >= 2000 && year <= 2100) {
            return date.toISOString().split('T')[0];
        }
    }

    return null;
}

// =============================================================================
// IMPORT HASH (SHA-256)
// =============================================================================

export interface ImportHashInput {
    invoiceNumber?: string;
    companyId: string;
    orderDate: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
}

/**
 * Computes a SHA-256 based import hash for duplicate detection.
 * The hash is deterministic: same input always produces same output.
 */
export function computeImportHash(input: ImportHashInput): string {
    const normalized = {
        inv: (input.invoiceNumber ?? '').trim().toLowerCase(),
        cid: input.companyId,
        date: input.orderDate.split('T')[0],
        items: input.items
            .map(i => `${i.productId}:${i.quantity}:${i.price.toFixed(2)}`)
            .sort()
            .join('|')
    };

    const payload = JSON.stringify(normalized);
    return createHash('sha256').update(payload, 'utf8').digest('hex').substring(0, 16);
}

// =============================================================================
// AUTO-FIX RULES
// =============================================================================

export interface AutoFix {
    ruleId: string;
    field: string;
    before: unknown;
    after: unknown;
}

/**
 * Unit normalization mapping
 */
const UNIT_NORMALIZATIONS: Record<string, string> = {
    'kg.': 'kg', 'kg': 'kg', 'kgs': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'g.': 'g', 'g': 'g', 'grams': 'g', 'gram': 'g',
    'pcs': 'pcs', 'pcs.': 'pcs', 'pc': 'pcs', 'piece': 'pcs', 'pieces': 'pcs',
    'pack': 'pack', 'packs': 'pack', 'pk': 'pack',
    'box': 'box', 'boxes': 'box', 'bx': 'box',
    'carton': 'carton', 'cartons': 'carton', 'ctn': 'carton',
    'ltr': 'ltr', 'l': 'ltr', 'litre': 'ltr', 'liter': 'ltr', 'litres': 'ltr', 'liters': 'ltr',
};

/**
 * Normalizes a unit string to its canonical form.
 */
export function normalizeUnit(unit: string): { normalized: string; changed: boolean } {
    const lower = unit.toLowerCase().trim();
    const normalized = UNIT_NORMALIZATIONS[lower] ?? lower;
    return { normalized, changed: normalized !== unit };
}

/**
 * Applies safe auto-fixes to a row and returns the fixes applied.
 */
export function applyAutoFixes(row: Record<string, unknown>): { fixedRow: Record<string, unknown>; fixes: AutoFix[] } {
    const fixedRow = { ...row };
    const fixes: AutoFix[] = [];

    // Trim all string values
    for (const [key, value] of Object.entries(fixedRow)) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== value) {
                fixes.push({ ruleId: 'AF_001', field: key, before: value, after: trimmed });
                fixedRow[key] = trimmed;
            }
        }
    }

    // Normalize unit
    if (fixedRow['unit'] && typeof fixedRow['unit'] === 'string') {
        const { normalized, changed } = normalizeUnit(fixedRow['unit'] as string);
        if (changed) {
            fixes.push({ ruleId: 'AF_002', field: 'unit', before: fixedRow['unit'], after: normalized });
            fixedRow['unit'] = normalized;
        }
    }

    // Multi-line to single-line for text fields
    const textFields = ['customerName', 'itemName', 'area', 'deliveryNotes'];
    for (const field of textFields) {
        if (fixedRow[field] && typeof fixedRow[field] === 'string' && (fixedRow[field] as string).includes('\n')) {
            const original = fixedRow[field] as string;
            const fixed = original.replace(/\r?\n/g, ', ').replace(/\s+/g, ' ').trim();
            if (fixed !== original) {
                fixes.push({ ruleId: 'AF_008', field, before: original, after: fixed });
                fixedRow[field] = fixed;
            }
        }
    }

    return { fixedRow, fixes };
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
    // Parsing errors
    ERR_PARSE_001: { severity: 'critical' as const, message: 'Failed to parse file' },
    ERR_PARSE_002: { severity: 'warning' as const, message: 'Empty file or no data rows' },

    // Validation errors
    ERR_VAL_001: { severity: 'critical' as const, message: 'Missing required field' },
    ERR_VAL_002: { severity: 'warning' as const, message: 'Invalid format' },
    ERR_VAL_003: { severity: 'warning' as const, message: 'Value out of range' },

    // Entity errors
    ERR_ENT_001: { severity: 'critical' as const, message: 'Company not found' },
    ERR_ENT_002: { severity: 'critical' as const, message: 'Product not found' },

    // Duplicate errors
    ERR_DUP_001: { severity: 'warning' as const, message: 'Duplicate entry detected' },
    ERR_DUP_002: { severity: 'warning' as const, message: 'Duplicate within file' },

    // Total mismatch
    ERR_TOT_001: { severity: 'warning' as const, message: 'Calculated total differs from stated' },

    // Partial import
    ERR_PAR_001: { severity: 'info' as const, message: 'Partial import' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
