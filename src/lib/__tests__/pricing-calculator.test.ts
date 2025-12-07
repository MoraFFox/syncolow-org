import { describe, it, expect } from 'vitest';
import {
  calculateTotal,
  calculatePricingBreakdown,
  calculateOrderItemTotal,
  calculateOrderTotals,
  type PricingInput,
} from '../pricing-calculator';

describe('pricing-calculator', () => {
  describe('calculateTotal', () => {
    it('should calculate basic total: (quantity × unitPrice - discount) × 1.14', () => {
      // (10 × 100 - 0) × 1.14 = 1140
      const result = calculateTotal(10, 100, 0);
      expect(result).toBe(1140);
    });

    it('should apply discount correctly', () => {
      // (10 × 100 - 50) × 1.14 = 950 × 1.14 = 1083
      const result = calculateTotal(10, 100, 50);
      expect(result).toBe(1083);
    });

    it('should handle zero quantity', () => {
      // (0 × 100 - 0) × 1.14 = 0
      const result = calculateTotal(0, 100, 0);
      expect(result).toBe(0);
    });

    it('should handle zero unit price', () => {
      // (10 × 0 - 0) × 1.14 = 0
      const result = calculateTotal(10, 0, 0);
      expect(result).toBe(0);
    });

    it('should default discount to 0 when not provided', () => {
      // (5 × 20) × 1.14 = 114
      const result = calculateTotal(5, 20);
      expect(result).toBe(114);
    });

    it('should handle large numbers', () => {
      // (1000 × 5000 - 100000) × 1.14 = 4900000 × 1.14 = 5586000
      const result = calculateTotal(1000, 5000, 100000);
      expect(result).toBe(5586000);
    });

    it('should handle decimal prices', () => {
      // (3 × 9.99 - 0) × 1.14 = 29.97 × 1.14 = 34.1658
      const result = calculateTotal(3, 9.99, 0);
      expect(result).toBeCloseTo(34.1658, 2);
    });

    it('should handle discount larger than subtotal (edge case)', () => {
      // (1 × 100 - 150) × 1.14 = -50 × 1.14 = -57
      const result = calculateTotal(1, 100, 150);
      expect(result).toBe(-57);
    });
  });

  describe('calculatePricingBreakdown', () => {
    it('should return all pricing fields correctly', () => {
      const input: PricingInput = {
        quantity: 10,
        unitPrice: 100,
        discount: 50,
      };

      const result = calculatePricingBreakdown(input);

      expect(result.subtotal).toBe(1000); // 10 × 100
      expect(result.discountAmount).toBe(50);
      expect(result.totalBeforeTax).toBe(950); // 1000 - 50
      expect(result.taxRate).toBe(14);
      expect(result.taxAmount).toBe(133); // 950 × 0.14
      expect(result.grandTotal).toBe(1083); // 950 × 1.14
    });

    it('should calculate correctly without discount', () => {
      const input: PricingInput = {
        quantity: 5,
        unitPrice: 200,
      };

      const result = calculatePricingBreakdown(input);

      expect(result.subtotal).toBe(1000);
      expect(result.discountAmount).toBe(0);
      expect(result.totalBeforeTax).toBe(1000);
      expect(result.taxRate).toBe(14);
      expect(result.taxAmount).toBe(140);
      expect(result.grandTotal).toBe(1140);
    });

    it('should default discount to 0', () => {
      const input: PricingInput = {
        quantity: 1,
        unitPrice: 100,
      };

      const result = calculatePricingBreakdown(input);

      expect(result.discountAmount).toBe(0);
    });

    it('should maintain 14% tax rate always', () => {
      const inputs: PricingInput[] = [
        { quantity: 1, unitPrice: 1 },
        { quantity: 100, unitPrice: 1000 },
        { quantity: 50, unitPrice: 50, discount: 100 },
      ];

      inputs.forEach(input => {
        const result = calculatePricingBreakdown(input);
        expect(result.taxRate).toBe(14);
      });
    });

    it('should handle precision in tax calculations', () => {
      const input: PricingInput = {
        quantity: 3,
        unitPrice: 33.33,
        discount: 0,
      };

      const result = calculatePricingBreakdown(input);

      expect(result.subtotal).toBeCloseTo(99.99, 2);
      expect(result.taxAmount).toBeCloseTo(99.99 * 0.14, 2);
      expect(result.grandTotal).toBeCloseTo(99.99 * 1.14, 2);
    });
  });

  describe('calculateOrderItemTotal', () => {
    it('should delegate to calculateTotal', () => {
      const result = calculateOrderItemTotal(10, 100, 50);
      const expected = calculateTotal(10, 100, 50);
      
      expect(result).toBe(expected);
    });

    it('should work with default discount', () => {
      const result = calculateOrderItemTotal(5, 20);
      const expected = calculateTotal(5, 20);
      
      expect(result).toBe(expected);
    });

    it('should produce same results as calculateTotal for various inputs', () => {
      const testCases = [
        { quantity: 1, price: 100, discount: 0 },
        { quantity: 10, price: 50, discount: 25 },
        { quantity: 100, price: 10, discount: 100 },
        { quantity: 0, price: 100, discount: 0 },
      ];

      testCases.forEach(({ quantity, price, discount }) => {
        const itemTotal = calculateOrderItemTotal(quantity, price, discount);
        const total = calculateTotal(quantity, price, discount);
        expect(itemTotal).toBe(total);
      });
    });
  });

  describe('calculateOrderTotals', () => {
    it('should calculate totals for single item', () => {
      const items = [{ quantity: 10, price: 100, discountValue: 50 }];

      const result = calculateOrderTotals(items);

      expect(result.subtotal).toBe(1000); // 10 × 100
      expect(result.totalDiscount).toBe(50);
      expect(result.totalBeforeTax).toBe(950);
      expect(result.taxAmount).toBeCloseTo(133, 0); // 950 × 0.14
      expect(result.grandTotal).toBeCloseTo(1083, 0); // (10*100-50)*1.14
    });

    it('should aggregate totals for multiple items', () => {
      const items = [
        { quantity: 10, price: 100, discountValue: 50 },  // subtotal: 1000, discount: 50
        { quantity: 5, price: 200, discountValue: 100 },  // subtotal: 1000, discount: 100
      ];

      const result = calculateOrderTotals(items);

      expect(result.subtotal).toBe(2000); // 1000 + 1000
      expect(result.totalDiscount).toBe(150); // 50 + 100
      expect(result.totalBeforeTax).toBe(1850); // 2000 - 150
      expect(result.taxAmount).toBeCloseTo(259, 0); // 1850 × 0.14
      // grandTotal = (10*100-50)*1.14 + (5*200-100)*1.14 = 1083 + 1026 = 2109
      expect(result.grandTotal).toBeCloseTo(2109, 0);
    });

    it('should handle items without discount', () => {
      const items = [
        { quantity: 5, price: 100 }, // no discountValue
        { quantity: 3, price: 50 },
      ];

      const result = calculateOrderTotals(items);

      expect(result.subtotal).toBe(650); // 500 + 150
      expect(result.totalDiscount).toBe(0);
      expect(result.totalBeforeTax).toBe(650);
      expect(result.taxAmount).toBeCloseTo(91, 0); // 650 × 0.14
      expect(result.grandTotal).toBeCloseTo(741, 0); // 650 × 1.14
    });

    it('should handle empty items array', () => {
      const items: Array<{ quantity: number; price: number; discountValue?: number }> = [];

      const result = calculateOrderTotals(items);

      expect(result.subtotal).toBe(0);
      expect(result.totalDiscount).toBe(0);
      expect(result.totalBeforeTax).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.grandTotal).toBe(0);
    });

    it('should handle mixed items with and without discounts', () => {
      const items = [
        { quantity: 2, price: 50, discountValue: 10 },
        { quantity: 3, price: 30 }, // no discount
        { quantity: 1, price: 100, discountValue: 20 },
      ];

      const result = calculateOrderTotals(items);

      // subtotals: 100, 90, 100 = 290
      expect(result.subtotal).toBe(290);
      // discounts: 10, 0, 20 = 30
      expect(result.totalDiscount).toBe(30);
      expect(result.totalBeforeTax).toBe(260);
      expect(result.taxAmount).toBeCloseTo(36.4, 1);
    });

    it('should correctly calculate grandTotal as sum of item totals', () => {
      const items = [
        { quantity: 10, price: 100, discountValue: 0 },
        { quantity: 5, price: 50, discountValue: 25 },
      ];

      const result = calculateOrderTotals(items);

      // Item 1: (10*100-0)*1.14 = 1140
      // Item 2: (5*50-25)*1.14 = 225*1.14 = 256.5
      // Total: 1396.5
      expect(result.grandTotal).toBeCloseTo(1396.5, 1);
    });
  });

  describe('edge cases', () => {
    it('should handle very small numbers', () => {
      const result = calculateTotal(1, 0.01, 0);
      expect(result).toBeCloseTo(0.0114, 4);
    });

    it('should handle very large quantities', () => {
      const result = calculateTotal(1000000, 1, 0);
      expect(result).toBe(1140000);
    });

    it('should maintain precision for financial calculations', () => {
      // Common financial scenario: multiple items with cents
      const items = [
        { quantity: 1, price: 19.99 },
        { quantity: 2, price: 29.99 },
        { quantity: 1, price: 9.99 },
      ];

      const result = calculateOrderTotals(items);

      // subtotal: 19.99 + 59.98 + 9.99 = 89.96
      expect(result.subtotal).toBeCloseTo(89.96, 2);
    });
  });
});
