import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Order, Company } from './types';

export function generateInvoicePDF(order: Order, company: Company | undefined) {
  const doc = new jsPDF();
  
  // Company Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SynergyFlow ERP', 105, 28, { align: 'center' });
  
  // Invoice Details
  doc.setFontSize(10);
  doc.text(`Invoice #: ${order.id.substring(0, 8).toUpperCase()}`, 20, 45);
  doc.text(`Order Date: ${format(new Date(order.orderDate), 'MMM dd, yyyy')}`, 20, 52);
  if (order.expectedPaymentDate) {
    doc.text(`Due Date: ${format(new Date(order.expectedPaymentDate), 'MMM dd, yyyy')}`, 20, 59);
  }
  
  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(order.companyName || 'N/A', 20, 77);
  if (order.branchName && order.branchName !== order.companyName) {
    doc.text(order.branchName, 20, 84);
  }
  if (company?.location) {
    const locationLines = doc.splitTextToSize(company.location, 80);
    doc.text(locationLines, 20, order.branchName !== order.companyName ? 91 : 84);
  }
  
  // Payment Terms
  if (company) {
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT TERMS:', 120, 70);
    doc.setFont('helvetica', 'normal');
    
    let termsText = '';
    if (company.paymentDueType === 'immediate') {
      termsText = 'Due on Receipt';
    } else if (company.paymentDueType === 'days_after_order') {
      termsText = `Net ${company.paymentDueDays || 30}`;
    } else if (company.paymentDueType === 'monthly_date') {
      termsText = `Monthly on day ${company.paymentDueDate}`;
    } else if (company.paymentDueType === 'bulk_schedule') {
      termsText = 'Bulk Payment Schedule';
    }
    
    doc.text(termsText, 120, 77);
    doc.text(`Method: ${company.paymentMethod === 'check' ? 'Check' : 'Transfer'}`, 120, 84);
  }
  
  // Items Table
  const tableData = order.items.map(item => {
    const itemTotal = item.price * item.quantity;
    let discount = 0;
    if (item.discountType && item.discountValue) {
      discount = item.discountType === 'percentage' 
        ? itemTotal * (item.discountValue / 100)
        : item.discountValue;
    }
    const afterDiscount = itemTotal - discount;
    const tax = (item.taxRate || 0) > 0 ? afterDiscount * ((item.taxRate || 0) / 100) : 0;
    
    return [
      item.productName,
      item.quantity.toString(),
      `$${item.price.toFixed(2)}`,
      `$${itemTotal.toFixed(2)}`,
      discount > 0 ? `-$${discount.toFixed(2)}` : '-',
      tax > 0 ? `$${tax.toFixed(2)}` : '-',
      `$${(afterDiscount + tax).toFixed(2)}`
    ];
  });
  
  autoTable(doc, {
    startY: 105,
    head: [['Item', 'Qty', 'Price', 'Subtotal', 'Discount', 'Tax', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });
  
  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 130, finalY);
  doc.text(`$${order.subtotal.toFixed(2)}`, 190, finalY, { align: 'right' });
  
  if (order.discountAmount && order.discountAmount > 0) {
    doc.text('Overall Discount:', 130, finalY + 7);
    doc.text(`-$${order.discountAmount.toFixed(2)}`, 190, finalY + 7, { align: 'right' });
  }
  
  doc.text('Tax:', 130, finalY + (order.discountAmount ? 14 : 7));
  doc.text(`$${order.totalTax.toFixed(2)}`, 190, finalY + (order.discountAmount ? 14 : 7), { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const totalY = finalY + (order.discountAmount ? 21 : 14);
  doc.text('TOTAL:', 130, totalY);
  doc.text(`$${order.grandTotal.toFixed(2)}`, 190, totalY, { align: 'right' });
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  
  return doc;
}

export function downloadInvoice(order: Order, company: Company | undefined) {
  const doc = generateInvoicePDF(order, company);
  doc.save(`Invoice-${order.id.substring(0, 8)}.pdf`);
}

