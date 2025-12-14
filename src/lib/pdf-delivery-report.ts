/**
 * @fileoverview PDF Generator for Delivery Team Daily Orders Report
 * @description Generates a printable PDF containing all orders scheduled for delivery
 * on a given day, optimized for delivery operations with route-based sorting.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Order, Company, Contact } from './types';

/**
 * Data structure for delivery report order entry
 */
export interface DeliveryOrderEntry {
  order: Order;
  company: Company | undefined;
  branch: Company | undefined;
}

/**
 * Configuration options for the delivery report PDF
 */
export interface DeliveryReportOptions {
  /** Report date (defaults to today) */
  reportDate?: Date;
  /** Title override for the report */
  title?: string;
  /** Whether to include order items breakdown */
  includeItems?: boolean;
}

/**
 * Formats a currency value in Egyptian Pounds
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Extracts the primary phone number from contacts array
 */
function getPrimaryPhone(contacts: Contact[] | undefined): string {
  if (!contacts || contacts.length === 0) return 'N/A';
  const contact = contacts[0];
  if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
    return contact.phoneNumbers[0].number;
  }
  return 'N/A';
}

/**
 * Gets the delivery address from company/branch location
 * Location is stored as a Google Maps URL or address string
 */
function getDeliveryAddress(
  branch: Company | undefined,
  company: Company | undefined
): string {
  // Prefer branch location, fall back to company location
  const location = branch?.location || company?.location;
  if (!location) return 'Address not available';

  // If it's a Google Maps URL, try to extract the address
  if (location.includes('google.com/maps') || location.includes('goo.gl')) {
    // Return a shortened version for the PDF
    return `📍 Maps Link Available`;
  }

  return location;
}

/**
 * Groups orders by area for route optimization
 */
function groupOrdersByArea(
  entries: DeliveryOrderEntry[]
): Map<string, DeliveryOrderEntry[]> {
  const grouped = new Map<string, DeliveryOrderEntry[]>();

  for (const entry of entries) {
    const area = entry.branch?.area || entry.company?.area || 'Unassigned Area';
    const existing = grouped.get(area) || [];
    existing.push(entry);
    grouped.set(area, existing);
  }

  // Sort areas alphabetically
  return new Map([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Generates the Delivery Team Daily Orders PDF Report
 *
 * @param entries - Array of order entries with associated company/branch data
 * @param options - Configuration options for the report
 * @returns jsPDF document instance
 *
 * @example
 * ```typescript
 * const entries = orders.map(order => ({
 *   order,
 *   company: companies.find(c => c.id === order.companyId),
 *   branch: companies.find(c => c.id === order.branchId),
 * }));
 * const pdf = generateDeliveryReportPDF(entries);
 * pdf.save('delivery-report.pdf');
 * ```
 */
export function generateDeliveryReportPDF(
  entries: DeliveryOrderEntry[],
  options: DeliveryReportOptions = {}
): jsPDF {
  const doc = new jsPDF();
  const reportDate = options.reportDate || new Date();
  const title = options.title || 'Daily Delivery Report';

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(reportDate, 'EEEE, MMMM dd, yyyy')}`, 105, 30, {
    align: 'center',
  });

  // Summary stats
  doc.setFontSize(10);
  const totalOrders = entries.length;
  const totalAmount = entries.reduce((sum, e) => sum + e.order.grandTotal, 0);
  doc.text(`Total Orders: ${totalOrders} | Total Value: ${formatCurrency(totalAmount)}`, 105, 38, {
    align: 'center',
  });

  // Group orders by area
  const groupedOrders = groupOrdersByArea(entries);

  let startY = 50;

  // Iterate through each area
  for (const [area, areaEntries] of groupedOrders) {
    // Check if we need a new page
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    // Area header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(66, 66, 66);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, startY - 5, 182, 8, 'F');
    doc.text(`📍 ${area} (${areaEntries.length} orders)`, 20, startY);
    doc.setTextColor(0, 0, 0);

    startY += 8;

    // Build table data for this area
    const tableData = areaEntries.map((entry) => {
      const { order, company, branch } = entry;
      const targetEntity = branch || company;

      return [
        order.companyName || 'Unknown',
        order.branchName || '-',
        getPrimaryPhone(targetEntity?.contacts),
        targetEntity?.email || 'N/A',
        getDeliveryAddress(branch, company),
        formatCurrency(order.grandTotal),
      ];
    });

    autoTable(doc, {
      startY,
      head: [['Client', 'Branch', 'Phone', 'Email', 'Address', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 100, 100],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35 },
        4: { cellWidth: 40 },
        5: { cellWidth: 22, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        // Footer on each page
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')} | Page ${doc.getNumberOfPages()}`,
          105,
          290,
          { align: 'center' }
        );
      },
    });

    // Get the final Y position after the table
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // If no orders, show message
  if (entries.length === 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('No orders scheduled for delivery today.', 105, 80, {
      align: 'center',
    });
  }

  return doc;
}

/**
 * Generates and downloads the Delivery Team PDF
 */
export function downloadDeliveryReport(
  entries: DeliveryOrderEntry[],
  options: DeliveryReportOptions = {}
): void {
  const reportDate = options.reportDate || new Date();
  const doc = generateDeliveryReportPDF(entries, options);
  doc.save(`Delivery-Report-${format(reportDate, 'yyyy-MM-dd')}.pdf`);
}

/**
 * Generates the PDF as a base64 string (for email attachments)
 */
export function generateDeliveryReportBase64(
  entries: DeliveryOrderEntry[],
  options: DeliveryReportOptions = {}
): string {
  const doc = generateDeliveryReportPDF(entries, options);
  return doc.output('datauristring').split(',')[1];
}

/**
 * Generates the PDF as a Blob (for uploads/storage)
 */
export function generateDeliveryReportBlob(
  entries: DeliveryOrderEntry[],
  options: DeliveryReportOptions = {}
): Blob {
  const doc = generateDeliveryReportPDF(entries, options);
  return doc.output('blob');
}
