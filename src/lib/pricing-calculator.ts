/** @format */

/**
 * Pricing Calculator Utility
 * Implements the equation: Total = ((Quantity × Unit Price) - Discount) × 1.14
 */

export interface PricingInput {
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  totalBeforeTax: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
}

/**
 * Calculate total using the equation: Total = ((Quantity × Unit Price) - Discount) × 1.14
 * @param quantity - Item quantity
 * @param unitPrice - Price per unit
 * @param discount - Discount amount (default: 0)
 * @returns Calculated total
 */
export function calculateTotal(quantity: number, unitPrice: number, discount: number = 0): number {
  return ((quantity * unitPrice) - discount) * 1.14;
}

/**
 * Calculate detailed pricing breakdown
 * @param input - Pricing input parameters
 * @returns Detailed pricing breakdown
 */
export function calculatePricingBreakdown(input: PricingInput): PricingResult {
  const { quantity, unitPrice, discount = 0 } = input;
  
  const subtotal = quantity * unitPrice;
  const discountAmount = discount;
  const totalBeforeTax = subtotal - discountAmount;
  const taxRate = 14; // 14% tax rate from the 1.14 multiplier
  const taxAmount = totalBeforeTax * 0.14;
  const grandTotal = totalBeforeTax * 1.14;
  
  return {
    subtotal,
    discountAmount,
    totalBeforeTax,
    taxRate,
    taxAmount,
    grandTotal,
  };
}

/**
 * Calculate order item total with the new pricing equation
 * @param quantity - Item quantity
 * @param price - Unit price
 * @param discountValue - Discount amount
 * @returns Item total
 */
export function calculateOrderItemTotal(quantity: number, price: number, discountValue: number = 0): number {
  return calculateTotal(quantity, price, discountValue);
}

/**
 * Calculate order totals for multiple items
 * @param items - Array of order items
 * @returns Order totals
 */
export function calculateOrderTotals(items: Array<{ quantity: number; price: number; discountValue?: number }>): {
  subtotal: number;
  totalDiscount: number;
  totalBeforeTax: number;
  taxAmount: number;
  grandTotal: number;
} {
  let subtotal = 0;
  let totalDiscount = 0;
  let grandTotal = 0;
  
  items.forEach(item => {
    const itemSubtotal = item.quantity * item.price;
    const itemDiscount = item.discountValue || 0;
    const itemTotal = calculateTotal(item.quantity, item.price, itemDiscount);
    
    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    grandTotal += itemTotal;
  });
  
  const totalBeforeTax = subtotal - totalDiscount;
  const taxAmount = totalBeforeTax * 0.14;
  
  return {
    subtotal,
    totalDiscount,
    totalBeforeTax,
    taxAmount,
    grandTotal,
  };
}