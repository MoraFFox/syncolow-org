import { addDays, differenceInDays, parseISO, startOfDay } from 'date-fns';
import type { Company, Order } from './types';

/**
 * Calculate expected payment date based on company payment configuration
 */
export function calculateExpectedPaymentDate(orderDate: string, company: Company): string {
  const orderDay = startOfDay(parseISO(orderDate));
  
  if (company.paymentDueType === 'immediate') {
    return orderDay.toISOString();
  }
  
  if (company.paymentDueType === 'days_after_order') {
    const days = company.paymentDueDays || 30;
    return addDays(orderDay, days).toISOString();
  }
  
  if (company.paymentDueType === 'monthly_date') {
    const dueDate = company.paymentDueDate || 1;
    const orderMonth = orderDay.getMonth();
    const orderYear = orderDay.getFullYear();
    
    let targetDate = new Date(orderYear, orderMonth, dueDate);
    
    if (targetDate <= orderDay) {
      targetDate = new Date(orderYear, orderMonth + 1, dueDate);
    }
    
    if (targetDate.getDate() !== dueDate) {
      targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    }
    
    return startOfDay(targetDate).toISOString();
  }
  
  if (company.paymentDueType === 'bulk_schedule') {
    return calculateNextBulkPaymentDate(orderDay, company);
  }
  
  return addDays(orderDay, 30).toISOString();
}

function calculateNextBulkPaymentDate(orderDate: Date, company: Company): string {
  if (!company.bulkPaymentSchedule) return addDays(orderDate, 30).toISOString();

  const { frequency, dayOfMonth, customDates } = company.bulkPaymentSchedule;

  if (frequency === 'custom' && customDates && customDates.length > 0) {
    const currentYear = orderDate.getFullYear();
    const nextYear = currentYear + 1;
    
    const allDates = [
      ...customDates.map(d => {
        const [month, day] = d.split('-').map(Number);
        return new Date(currentYear, month - 1, day);
      }),
      ...customDates.map(d => {
        const [month, day] = d.split('-').map(Number);
        return new Date(nextYear, month - 1, day);
      }),
    ].sort((a, b) => a.getTime() - b.getTime());
    
    const nextDate = allDates.find(d => d > orderDate);
    return nextDate ? startOfDay(nextDate).toISOString() : startOfDay(allDates[0]).toISOString();
  }

  const day = dayOfMonth || 1;
  const monthsInterval = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : frequency === 'semi-annually' ? 6 : 12;
  
  let currentDate = new Date(orderDate.getFullYear(), orderDate.getMonth(), day);
  
  while (currentDate <= orderDate) {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthsInterval, day);
  }
  
  return startOfDay(currentDate).toISOString();
}

/**
 * Calculate payment score for an order
 * Grace period: 7 days (score = 100)
 * After grace: Linear decay over 60 days to reach 0 at day 67
 */
export function calculatePaymentScore(daysOverdue: number): number {
  if (daysOverdue <= 7) return 100;
  if (daysOverdue >= 67) return 0;
  
  // Linear decay: 100 points over 60 days = 1.67 points per day
  return Math.max(0, Math.round(100 - ((daysOverdue - 7) * 1.67)));
}

/**
 * Calculate days overdue for an unpaid order
 */
export function calculateDaysOverdue(expectedPaymentDate: string): number {
  const expected = startOfDay(parseISO(expectedPaymentDate));
  const today = startOfDay(new Date());
  return Math.max(0, differenceInDays(today, expected));
}

/**
 * Calculate aggregate payment score for a company based on unpaid orders
 */
export function calculateCompanyPaymentScore(unpaidOrders: Order[]): {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  totalUnpaid: number;
  totalOutstanding: number;
  pendingBulkAmount: number;
} {
  if (unpaidOrders.length === 0) {
    return { score: 100, status: 'excellent', totalUnpaid: 0, totalOutstanding: 0, pendingBulkAmount: 0 };
  }
  
  const totalOutstanding = unpaidOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  
  const weightedSum = unpaidOrders.reduce((sum, order) => {
    const score = order.paymentScore || 100;
    return sum + (score * order.grandTotal);
  }, 0);
  
  const score = Math.round(weightedSum / totalOutstanding);
  
  const pendingBulkAmount = unpaidOrders
    .filter(o => o.bulkPaymentCycleId && (o.daysOverdue || 0) <= 0)
    .reduce((sum, o) => sum + o.grandTotal, 0);
  
  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (score >= 80) status = 'excellent';
  else if (score >= 60) status = 'good';
  else if (score >= 40) status = 'fair';
  else if (score >= 20) status = 'poor';
  else status = 'critical';
  
  return {
    score,
    status,
    totalUnpaid: unpaidOrders.length,
    totalOutstanding,
    pendingBulkAmount,
  };
}

export function generateBulkPaymentCycleId(paymentDate: string): string {
  return `bulk_${paymentDate.split('T')[0]}`;
}

/**
 * Get payment status badge color
 */
export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'excellent': return 'bg-green-500';
    case 'good': return 'bg-yellow-500';
    case 'fair': return 'bg-orange-500';
    case 'poor': return 'bg-red-500';
    case 'critical': return 'bg-red-700';
    default: return 'bg-gray-500';
  }
}

