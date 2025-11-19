import { format } from 'date-fns';
import type { Order, Company } from './types';

export function exportToCSV(orders: Order[], companies: Company[], filename: string = 'invoices') {
  const headers = [
    'Invoice ID',
    'Company',
    'Branch',
    'Order Date',
    'Due Date',
    'Amount',
    'Status',
    'Payment Status',
    'Days Overdue',
    'Payment Score',
    'Payment Method',
    'Payment Reference',
    'Payment Notes'
  ];
  
  const rows = orders.map(order => {
    const company = companies.find(c => c.id === order.companyId);
    
    return [
      order.id.substring(0, 8),
      order.companyName || '',
      order.branchName || '',
      format(new Date(order.orderDate), 'yyyy-MM-dd'),
      order.expectedPaymentDate ? format(new Date(order.expectedPaymentDate), 'yyyy-MM-dd') : '',
      order.total.toFixed(2),
      order.status,
      order.paymentStatus || 'Pending',
      order.daysOverdue?.toString() || '0',
      order.paymentScore?.toString() || '100',
      company?.paymentMethod === 'check' ? 'Check' : 'Transfer',
      order.paymentReference || '',
      order.paymentNotes || ''
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportPaymentReport(orders: Order[], companies: Company[], dateFrom?: string, dateTo?: string) {
  let filtered = orders.filter(o => !o.isPaid && o.paymentStatus !== 'Paid');
  
  if (dateFrom) {
    filtered = filtered.filter(o => o.orderDate >= dateFrom);
  }
  
  if (dateTo) {
    filtered = filtered.filter(o => o.orderDate <= dateTo);
  }
  
  exportToCSV(filtered, companies, 'payment-report');
}

