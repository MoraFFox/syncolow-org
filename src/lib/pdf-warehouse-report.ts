/**
 * @fileoverview PDF Generator for Warehouse Team Daily Orders Report
 * @description Generates a comprehensive PDF for warehouse operations including
 * delivery status, client activity, and product consumption analytics with trends.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Order, Company, Contact } from './types';
import type { ProductConsumption } from './consumption-analytics';
import { getTrendIndicator } from './consumption-analytics';

/**
 * Data structure for warehouse report order entry
 */
export interface WarehouseOrderEntry {
  order: Order;
  company: Company | undefined;
  branch: Company | undefined;
  /** Product consumption analytics for this client */
  consumption: ProductConsumption[];
}

/**
 * Configuration options for the warehouse report PDF
 */
export interface WarehouseReportOptions {
  /** Report date (defaults to today) */
  reportDate?: Date;
  /** Title override for the report */
  title?: string;
  /** Maximum number of products to show in consumption analysis */
  maxProductsPerClient?: number;
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
 */
function getDeliveryAddress(
  branch: Company | undefined,
  company: Company | undefined
): string {
  const location = branch?.location || company?.location;
  if (!location) return 'Address not available';

  if (location.includes('google.com/maps') || location.includes('goo.gl')) {
    return `📍 Maps Link`;
  }

  // Truncate long addresses
  return location.length > 50 ? location.substring(0, 47) + '...' : location;
}

/**
 * Gets delivery status display with reason if failed
 */
function getDeliveryStatusDisplay(order: Order): { status: string; reason: string } {
  const status = order.status;
  
  if (status === 'Delivered') {
    return { status: '✅ Delivered', reason: '' };
  }
  
  if (status === 'Cancelled' || status === 'Delivery Failed') {
    const reason = order.cancellationReason || order.cancellationNotes || 'No reason provided';
    return { status: `❌ ${status}`, reason };
  }
  
  return { status: `⏳ ${status}`, reason: '' };
}

/**
 * Gets client activity status
 */
function getActivityStatus(company: Company | undefined): { status: string; color: [number, number, number] } {
  if (!company) return { status: 'Unknown', color: [128, 128, 128] };
  
  switch (company.status) {
    case 'Active':
      return { status: '🟢 Active', color: [34, 139, 34] };
    case 'Inactive':
      return { status: '🔴 Inactive', color: [220, 20, 60] };
    case 'New':
      return { status: '🟡 New', color: [255, 193, 7] };
    default:
      return { status: company.status || 'Unknown', color: [128, 128, 128] };
  }
}

/**
 * Draws a simple bar chart for consumption trend
 */
function drawTrendBars(
  doc: jsPDF,
  x: number,
  y: number,
  monthlyData: { quantity: number }[],
  maxWidth: number = 40,
  height: number = 10
): void {
  const barCount = monthlyData.length;
  if (barCount === 0) return;

  const maxQuantity = Math.max(...monthlyData.map((m) => m.quantity), 1);
  const barWidth = (maxWidth - (barCount - 1) * 2) / barCount;

  for (let i = 0; i < barCount; i++) {
    const quantity = monthlyData[i].quantity;
    const barHeight = (quantity / maxQuantity) * height;
    const barX = x + i * (barWidth + 2);
    const barY = y + height - barHeight;

    // Color based on position (older = lighter)
    const intensity = 100 + Math.floor((i / (barCount - 1)) * 100);
    doc.setFillColor(66, intensity, 200);
    doc.rect(barX, barY, barWidth, barHeight, 'F');
  }
}

/**
 * Generates the Warehouse Team Daily Orders PDF Report
 *
 * @param entries - Array of order entries with consumption data
 * @param options - Configuration options for the report
 * @returns jsPDF document instance
 */
export function generateWarehouseReportPDF(
  entries: WarehouseOrderEntry[],
  options: WarehouseReportOptions = {}
): jsPDF {
  const doc = new jsPDF();
  const reportDate = options.reportDate || new Date();
  const title = options.title || 'Daily Warehouse Report';
  const maxProducts = options.maxProductsPerClient || 5;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 15, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(reportDate, 'EEEE, MMMM dd, yyyy')}`, 105, 23, {
    align: 'center',
  });

  // Summary stats
  doc.setFontSize(9);
  const totalOrders = entries.length;
  const deliveredCount = entries.filter((e) => e.order.status === 'Delivered').length;
  const failedCount = entries.filter(
    (e) => e.order.status === 'Cancelled' || e.order.status === 'Delivery Failed'
  ).length;
  const totalAmount = entries.reduce((sum, e) => sum + e.order.grandTotal, 0);

  doc.text(
    `Total: ${totalOrders} orders | Delivered: ${deliveredCount} | Failed: ${failedCount} | Value: ${formatCurrency(totalAmount)}`,
    105,
    30,
    { align: 'center' }
  );

  let startY = 40;

  // Process each order
  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx];
    const { order, company, branch, consumption } = entry;

    // Check if we need a new page (leave room for consumption table)
    const estimatedHeight = 60 + Math.min(consumption.length, maxProducts) * 8;
    if (startY + estimatedHeight > 270) {
      doc.addPage();
      startY = 20;
    }

    const targetEntity = branch || company;
    const deliveryStatus = getDeliveryStatusDisplay(order);
    const activityStatus = getActivityStatus(company);

    // Order header box
    doc.setFillColor(240, 240, 240);
    doc.rect(14, startY - 3, 182, 20, 'F');

    // Order ID and Client Name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #${order.id.substring(0, 8)}`, 16, startY + 2);
    doc.text(order.companyName || 'Unknown Client', 60, startY + 2);

    // Status indicators
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(deliveryStatus.status, 140, startY + 2);
    doc.text(activityStatus.status, 170, startY + 2);

    // Second row: Contact and Address
    doc.setFontSize(8);
    doc.text(`📞 ${getPrimaryPhone(targetEntity?.contacts)}`, 16, startY + 10);
    doc.text(`✉️ ${targetEntity?.email || 'N/A'}`, 60, startY + 10);
    doc.text(`📍 ${getDeliveryAddress(branch, company)}`, 110, startY + 10);

    // If not delivered, show reason
    if (deliveryStatus.reason) {
      doc.setTextColor(220, 20, 60);
      doc.text(`Reason: ${deliveryStatus.reason}`, 16, startY + 16);
      doc.setTextColor(0, 0, 0);
    }

    startY += 24;

    // Product Consumption Analysis
    if (consumption.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Product Consumption Analysis (Last 4 Months)', 16, startY);
      startY += 4;

      const topProducts = consumption.slice(0, maxProducts);

      // Build consumption table
      const consumptionData = topProducts.map((prod) => {
        const monthlyValues = prod.monthlyData.map((m) => m.quantity.toString()).join(' → ');
        const trend = getTrendIndicator(prod.trend);
        const changeSign = prod.overallChangePercent > 0 ? '+' : '';

        return [
          prod.productName.length > 20
            ? prod.productName.substring(0, 17) + '...'
            : prod.productName,
          prod.averageMonthlyQuantity.toFixed(1),
          monthlyValues,
          `${trend.symbol} ${changeSign}${prod.overallChangePercent}%`,
        ];
      });

      autoTable(doc, {
        startY,
        head: [['Product', 'Avg/Mo', 'Monthly (M1→M4)', 'Trend']],
        body: consumptionData,
        theme: 'grid',
        headStyles: {
          fillColor: [80, 80, 80],
          fontSize: 7,
          fontStyle: 'bold',
          cellPadding: 1,
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 1,
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 70, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 16, right: 16 },
        tableWidth: 'auto',
        didParseCell: (data) => {
          // Color the trend column based on value
          if (data.column.index === 3 && data.section === 'body') {
            const text = String(data.cell.raw);
            if (text.includes('↑')) {
              data.cell.styles.textColor = [34, 139, 34];
            } else if (text.includes('↓')) {
              data.cell.styles.textColor = [220, 20, 60];
            }
          }
        },
      });

      startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    } else {
      // No consumption data
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      doc.text('No historical consumption data available', 16, startY);
      doc.setTextColor(0, 0, 0);
      startY += 8;
    }

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, startY, 196, startY);
    startY += 6;
  }

  // If no orders, show message
  if (entries.length === 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('No orders for warehouse report today.', 105, 80, {
      align: 'center',
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')} | Page ${i} of ${pageCount}`,
      105,
      292,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Generates and downloads the Warehouse Team PDF
 */
export function downloadWarehouseReport(
  entries: WarehouseOrderEntry[],
  options: WarehouseReportOptions = {}
): void {
  const reportDate = options.reportDate || new Date();
  const doc = generateWarehouseReportPDF(entries, options);
  doc.save(`Warehouse-Report-${format(reportDate, 'yyyy-MM-dd')}.pdf`);
}

/**
 * Generates the PDF as a base64 string (for email attachments)
 */
export function generateWarehouseReportBase64(
  entries: WarehouseOrderEntry[],
  options: WarehouseReportOptions = {}
): string {
  const doc = generateWarehouseReportPDF(entries, options);
  return doc.output('datauristring').split(',')[1];
}

/**
 * Generates the PDF as a Blob (for uploads/storage)
 */
export function generateWarehouseReportBlob(
  entries: WarehouseOrderEntry[],
  options: WarehouseReportOptions = {}
): Blob {
  const doc = generateWarehouseReportPDF(entries, options);
  return doc.output('blob');
}
