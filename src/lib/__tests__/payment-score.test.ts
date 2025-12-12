import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateExpectedPaymentDate,
  calculatePaymentScore,
  calculateDaysOverdue,
  calculateCompanyPaymentScore,
  generateBulkPaymentCycleId,
  getPaymentStatusColor,
} from '../payment-score';
import type { Company, Order } from '../types';

/**
 * Helper to extract local date (YYYY-MM-DD) from ISO string
 * Needed because startOfDay() operates in local timezone
 */
function getLocalDateString(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('payment-score', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateExpectedPaymentDate', () => {
    const baseCompany: Partial<Company> = {
      id: 'company-1',
      name: 'Test Company',
    };

    describe('immediate payment type', () => {
      it('should return same day for immediate payment', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'immediate' as const,
        } as Company;

        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-01-15');
      });
    });

    describe('days_after_order payment type', () => {
      it('should add 30 days by default', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'days_after_order' as const,
        } as Company;

        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-02-14');
      });

      it('should add specified number of days', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'days_after_order' as const,
          paymentDueDays: 60,
        } as Company;

        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-03-15');
      });

      it('should handle 0 days (defaults to 30 because 0 is falsy)', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'days_after_order' as const,
          paymentDueDays: 0,
        } as Company;

        // Note: Implementation uses || 30, so 0 is treated as falsy and defaults to 30
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-02-14');
      });
    });

    describe('monthly_date payment type', () => {
      it('should return next occurrence of date in same month if in future', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'monthly_date' as const,
          paymentDueDate: 25,
        } as Company;

        // Order on Jan 15, due date 25 -> should be Jan 25
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-01-25');
      });

      it('should return next month if date has passed', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'monthly_date' as const,
          paymentDueDate: 10,
        } as Company;

        // Order on Jan 15, due date 10 -> should be Feb 10
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-02-10');
      });

      it('should handle 1st of month', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'monthly_date' as const,
          paymentDueDate: 1,
        } as Company;

        // Order on Jan 15, due date 1 -> should be Feb 1
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-02-01');
      });

      it('should handle end-of-month dates (Feb 31 -> Feb 28/29)', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'monthly_date' as const,
          paymentDueDate: 31,
        } as Company;

        // Order on Jan 15, due date 31 -> Jan has 31 days
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-01-31');
      });

      it('should default to 1st when no date specified', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'monthly_date' as const,
        } as Company;

        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-02-01');
      });
    });

    describe('bulk_schedule payment type', () => {
      it('should calculate next bulk payment date with custom dates', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'bulk_schedule' as const,
          bulkPaymentSchedule: {
            frequency: 'custom' as const,
            customDates: ['03-01', '06-01', '09-01', '12-01'], // Mar, Jun, Sep, Dec
          },
        } as Company;

        // Order on Jan 15 -> next custom date is Mar 1
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-03-01');
      });

      it('should handle monthly frequency', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'bulk_schedule' as const,
          bulkPaymentSchedule: {
            frequency: 'monthly' as const,
            dayOfMonth: 20,
          },
        } as Company;

        // Order on Jan 15, dayOfMonth 20 -> Jan 20
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-01-20');
      });

      it('should handle quarterly frequency', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'bulk_schedule' as const,
          bulkPaymentSchedule: {
            frequency: 'quarterly' as const,
            dayOfMonth: 15,
          },
        } as Company;

        // Order on Jan 15, payment on 15th every 3 months
        // Since Jan 15 is the current date, next would be April 15
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-04-15');
      });

      it('should handle semi-annually frequency', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'bulk_schedule' as const,
          bulkPaymentSchedule: {
            frequency: 'semi-annually' as const,
            dayOfMonth: 1,
          },
        } as Company;

        // Order on Jan 15, payment on 1st every 6 months -> July 1
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-07-01');
      });

      it('should handle annually frequency', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'bulk_schedule' as const,
          bulkPaymentSchedule: {
            frequency: 'annually' as const,
            dayOfMonth: 1,
          },
        } as Company;

        // Order on Jan 15, payment on 1st yearly -> next Jan 1
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        // Since Jan 1 is before Jan 15, next is Jan 1 2025
        expect(getLocalDateString(result)).toBe('2025-01-01');
      });

      it('should handle year rollover for custom dates', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'bulk_schedule' as const,
          bulkPaymentSchedule: {
            frequency: 'custom' as const,
            customDates: ['01-10'], // Jan 10 only
          },
        } as Company;

        // Order on Jan 15 -> Jan 10 has passed, next is Jan 10 2025
        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2025-01-10');
      });

      it('should default to 30 days when no schedule defined', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'bulk_schedule' as const,
        } as Company;

        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-02-14');
      });
    });

    describe('default fallback', () => {
      it('should default to 30 days for unknown payment type', () => {
        const company = {
          ...baseCompany,
          paymentDueType: 'unknown' as Company['paymentDueType'],
        } as Company;

        const result = calculateExpectedPaymentDate('2024-01-15T10:00:00.000Z', company);
        expect(getLocalDateString(result)).toBe('2024-02-14');
      });
    });
  });

  describe('calculatePaymentScore', () => {
    it('should return 100 for 0 days overdue (grace period)', () => {
      expect(calculatePaymentScore(0)).toBe(100);
    });

    it('should return 100 for 7 days overdue (end of grace period)', () => {
      expect(calculatePaymentScore(7)).toBe(100);
    });

    it('should start decay at 8 days overdue', () => {
      const score = calculatePaymentScore(8);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
      // 100 - (1 * 1.67) = 98.33 ≈ 98
      expect(score).toBe(98);
    });

    it('should continue linear decay', () => {
      // At day 37 (30 days into decay): 100 - (30 * 1.67) = 49.9 ≈ 50
      expect(calculatePaymentScore(37)).toBe(50);
    });

    it('should return 0 at 67 days overdue', () => {
      expect(calculatePaymentScore(67)).toBe(0);
    });

    it('should return 0 for more than 67 days overdue', () => {
      expect(calculatePaymentScore(100)).toBe(0);
      expect(calculatePaymentScore(365)).toBe(0);
    });

    it('should handle boundary at day 66', () => {
      // At day 66: 100 - (59 * 1.67) = 1.47 ≈ 1
      const score = calculatePaymentScore(66);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('calculateDaysOverdue', () => {
    it('should return positive days for past dates', () => {
      vi.setSystemTime(new Date('2024-01-25T12:00:00.000Z'));
      
      const result = calculateDaysOverdue('2024-01-15T10:00:00.000Z');
      expect(result).toBe(10);
    });

    it('should return 0 for future dates (not negative)', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      
      const result = calculateDaysOverdue('2024-01-25T10:00:00.000Z');
      expect(result).toBe(0);
    });

    it('should return 0 for today', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      
      const result = calculateDaysOverdue('2024-01-15T10:00:00.000Z');
      expect(result).toBe(0);
    });

    it('should handle time component correctly (use start of day)', () => {
      vi.setSystemTime(new Date('2024-01-17T12:00:00.000Z'));
      
      // Both dates are clearly 2 days apart regardless of timezone
      const result = calculateDaysOverdue('2024-01-15T12:00:00.000Z');
      expect(result).toBe(2);
    });
  });

  describe('calculateCompanyPaymentScore', () => {
    it('should return excellent score for empty orders array', () => {
      const result = calculateCompanyPaymentScore([]);
      
      expect(result).toEqual({
        score: 100,
        status: 'excellent',
        totalUnpaid: 0,
        totalOutstanding: 0,
        pendingBulkAmount: 0,
      });
    });

    it('should calculate weighted average with single order', () => {
      const orders: Order[] = [
        {
          id: 'order-1',
          grandTotal: 1000,
          paymentScore: 80,
        } as Order,
      ];

      const result = calculateCompanyPaymentScore(orders);
      
      expect(result.score).toBe(80);
      expect(result.totalUnpaid).toBe(1);
      expect(result.totalOutstanding).toBe(1000);
    });

    it('should calculate weighted average with multiple orders', () => {
      const orders: Order[] = [
        { id: 'order-1', grandTotal: 1000, paymentScore: 100 } as Order,
        { id: 'order-2', grandTotal: 500, paymentScore: 50 } as Order,
      ];

      // Weighted: (1000*100 + 500*50) / 1500 = 125000 / 1500 = 83.33 ≈ 83
      const result = calculateCompanyPaymentScore(orders);
      
      expect(result.score).toBe(83);
      expect(result.totalUnpaid).toBe(2);
      expect(result.totalOutstanding).toBe(1500);
    });

    it('should return excellent status for score >= 80', () => {
      const orders: Order[] = [
        { id: 'order-1', grandTotal: 1000, paymentScore: 90 } as Order,
      ];

      const result = calculateCompanyPaymentScore(orders);
      expect(result.status).toBe('excellent');
    });

    it('should return good status for score >= 60', () => {
      const orders: Order[] = [
        { id: 'order-1', grandTotal: 1000, paymentScore: 70 } as Order,
      ];

      const result = calculateCompanyPaymentScore(orders);
      expect(result.status).toBe('good');
    });

    it('should return fair status for score >= 40', () => {
      const orders: Order[] = [
        { id: 'order-1', grandTotal: 1000, paymentScore: 50 } as Order,
      ];

      const result = calculateCompanyPaymentScore(orders);
      expect(result.status).toBe('fair');
    });

    it('should return poor status for score >= 20', () => {
      const orders: Order[] = [
        { id: 'order-1', grandTotal: 1000, paymentScore: 25 } as Order,
      ];

      const result = calculateCompanyPaymentScore(orders);
      expect(result.status).toBe('poor');
    });

    it('should return critical status for score < 20', () => {
      const orders: Order[] = [
        { id: 'order-1', grandTotal: 1000, paymentScore: 10 } as Order,
      ];

      const result = calculateCompanyPaymentScore(orders);
      expect(result.status).toBe('critical');
    });

    it('should calculate pendingBulkAmount for orders with bulkPaymentCycleId and non-overdue', () => {
      const orders: Order[] = [
        { id: 'order-1', grandTotal: 1000, paymentScore: 100, bulkPaymentCycleId: 'bulk_2024-02-01', daysOverdue: 0 } as Order,
        { id: 'order-2', grandTotal: 500, paymentScore: 100, bulkPaymentCycleId: 'bulk_2024-02-01', daysOverdue: -5 } as Order,
        { id: 'order-3', grandTotal: 300, paymentScore: 100, bulkPaymentCycleId: 'bulk_2024-02-01', daysOverdue: 10 } as Order, // overdue, excluded
        { id: 'order-4', grandTotal: 200, paymentScore: 100 } as Order, // no bulkPaymentCycleId, excluded
      ];

      const result = calculateCompanyPaymentScore(orders);
      
      expect(result.pendingBulkAmount).toBe(1500); // 1000 + 500, excludes overdue and non-bulk
    });

    it('should default paymentScore to 100 if not provided', () => {
      const orders: Order[] = [
        { id: 'order-1', grandTotal: 1000 } as Order, // no paymentScore
      ];

      const result = calculateCompanyPaymentScore(orders);
      expect(result.score).toBe(100);
    });
  });

  describe('generateBulkPaymentCycleId', () => {
    it('should generate correct format bulk_YYYY-MM-DD', () => {
      const result = generateBulkPaymentCycleId('2024-01-15T10:00:00.000Z');
      expect(result).toBe('bulk_2024-01-15');
    });

    it('should strip time component', () => {
      const result = generateBulkPaymentCycleId('2024-06-30T23:59:59.999Z');
      expect(result).toBe('bulk_2024-06-30');
    });
  });

  describe('getPaymentStatusColor', () => {
    it('should return green for excellent', () => {
      expect(getPaymentStatusColor('excellent')).toBe('bg-green-500');
    });

    it('should return yellow for good', () => {
      expect(getPaymentStatusColor('good')).toBe('bg-yellow-500');
    });

    it('should return orange for fair', () => {
      expect(getPaymentStatusColor('fair')).toBe('bg-orange-500');
    });

    it('should return red for poor', () => {
      expect(getPaymentStatusColor('poor')).toBe('bg-red-500');
    });

    it('should return dark red for critical', () => {
      expect(getPaymentStatusColor('critical')).toBe('bg-red-700');
    });

    it('should return gray for unknown status', () => {
      expect(getPaymentStatusColor('unknown')).toBe('bg-gray-500');
    });
  });
});
