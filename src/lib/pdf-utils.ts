
// This file is no longer used for PDF generation and can be removed.
// It is kept temporarily to avoid breaking any imports, but the functions inside are deprecated.

import { format, isValid, parseISO } from 'date-fns';
import type { Order, Company, MaintenanceVisit } from './types';

const formatDateSafe = (dateInput: string | Date | undefined) => {
    if (!dateInput) return 'N/A';
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (isValid(date)) {
        return format(date, 'PPP');
    }
    return 'Invalid Date';
};

/**
 * @deprecated This function is no longer supported. Use HTML-based reports instead.
 */
export async function generateOrderInvoice(order: Order, company: Company | undefined) {
    console.warn("generateOrderInvoice is deprecated and will be removed.");
}

/**
 * @deprecated This function is no longer supported. Use HTML-based reports instead.
 */
export async function generateMaintenanceReport(visit: MaintenanceVisit) {
    console.warn("generateMaintenanceReport is deprecated and will be removed.");
}

