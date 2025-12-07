/**
 * Test Utilities
 * Reusable mock factories and helpers for testing
 */

import { vi } from 'vitest';
import React from 'react';
import type { Order, Company, Notification, VisitCall, Barista, Feedback, Product, DeliveryArea } from '@/lib/types';

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Create a mock Order with sensible defaults
 */
export const createMockOrder = (overrides?: Partial<Order>): Order => ({
  id: `order-${Math.random().toString(36).substring(7)}`,
  companyId: 'company-1',
  branchId: 'branch-1',
  companyName: 'Test Company',
  branchName: 'Test Branch',
  orderDate: new Date().toISOString(),
  deliveryDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  status: 'Pending',
  paymentStatus: 'Pending',
  items: [],
  subtotal: 1000,
  totalTax: 140,
  grandTotal: 1140,
  total: 1140,
  isPaid: false,
  daysOverdue: 0,
  paymentScore: 100,
  statusHistory: [{ status: 'Pending', timestamp: new Date().toISOString() }],
  ...overrides,
});

/**
 * Create a mock Company with sensible defaults
 */
export const createMockCompany = (overrides?: Partial<Company>): Company => ({
  id: `company-${Math.random().toString(36).substring(7)}`,
  name: 'Test Company',
  parentCompanyId: null,
  isBranch: false,
  region: 'A',
  createdAt: new Date().toISOString(),
  machineOwned: false,
  contacts: [],
  paymentMethod: 'transfer',
  paymentDueType: 'days_after_order',
  paymentDueDays: 30,
  currentPaymentScore: 100,
  totalOutstandingAmount: 0,
  totalUnpaidOrders: 0,
  ...overrides,
});

/**
 * Create a mock Branch (Company with parentCompanyId)
 */
export const createMockBranch = (parentCompanyId: string, overrides?: Partial<Company>): Company => ({
  ...createMockCompany({
    parentCompanyId,
    isBranch: true,
    name: 'Test Branch',
    ...overrides,
  }),
});

/**
 * Create a mock Notification
 */
export const createMockNotification = (overrides?: Partial<Notification>): Notification => ({
  id: `notif-${Math.random().toString(36).substring(7)}`,
  userId: 'user-1',
  type: 'order',
  title: 'Test Notification',
  message: 'This is a test notification',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock VisitCall
 */
export const createMockVisit = (overrides?: Partial<VisitCall>): VisitCall => ({
  id: `visit-${Math.random().toString(36).substring(7)}`,
  clientId: 'client-1',
  date: new Date().toISOString(),
  type: 'scheduled',
  status: 'Scheduled',
  notes: 'Test visit notes',
  ...overrides,
} as VisitCall);

/**
 * Create a mock Barista
 */
export const createMockBarista = (overrides?: Partial<Barista>): Barista => ({
  id: `barista-${Math.random().toString(36).substring(7)}`,
  branchId: 'branch-1',
  name: 'John Doe',
  phone: '+1234567890',
  isActive: true,
  ...overrides,
} as Barista);

/**
 * Create a mock Feedback
 */
export const createMockFeedback = (overrides?: Partial<Feedback>): Feedback => ({
  id: `feedback-${Math.random().toString(36).substring(7)}`,
  clientId: 'client-1',
  rating: 5,
  comment: 'Great service!',
  createdAt: new Date().toISOString(),
  sentiment: 'positive',
  ...overrides,
} as Feedback);

/**
 * Create a mock Product
 */
export const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: `product-${Math.random().toString(36).substring(7)}`,
  name: 'Test Product',
  price: 25.99,
  stock: 100,
  categoryId: 'category-1',
  manufacturerId: 'manufacturer-1',
  description: 'Test product description',
  isActive: true,
  ...overrides,
} as Product);

/**
 * Create a mock DeliveryArea
 */
export const createMockArea = (overrides?: Partial<DeliveryArea>): DeliveryArea => ({
  id: `area-${Math.random().toString(36).substring(7)}`,
  name: 'Downtown',
  region: 'A',
  ...overrides,
} as DeliveryArea);

// ============================================================================
// Supabase Mock Helpers
// ============================================================================

/**
 * Create a mock Supabase query response
 */
export const mockSupabaseQuery = <T>(data: T | null, error: Error | null = null) => ({
  data,
  error,
});

/**
 * Create a chainable Supabase mock
 */
export const createSupabaseChain = (finalResult: { data: unknown; error: Error | null }) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
  };
  
  // Make all methods return this for chaining
  Object.keys(chain).forEach(key => {
    if (key !== 'single' && key !== 'maybeSingle') {
      chain[key].mockReturnThis();
    }
  });
  
  // Handle terminal methods
  chain.then = vi.fn((cb) => {
    cb(finalResult);
    return Promise.resolve(finalResult);
  });

  return chain;
};

// ============================================================================
// Store Reset Helpers
// ============================================================================

/**
 * Reset all Zustand stores to initial state
 * Call this in beforeEach to ensure clean state between tests
 */
export const resetAllStores = async () => {
  // Dynamically import stores to avoid circular dependencies
  const { useOrderStore } = await import('@/store/use-order-store');
  const { useCompanyStore } = await import('@/store/use-company-store');
  
  useOrderStore.setState({
    orders: [],
    analyticsOrders: [],
    returns: [],
    notifications: [],
    visits: [],
    loading: false,
    ordersOffset: 0,
    ordersHasMore: true,
    ordersLoading: false,
    analyticsLoading: false,
    currentFetchId: null,
  });

  useCompanyStore.setState({
    companies: [],
    baristas: [],
    feedback: [],
    areas: [],
    loading: false,
  });
};

// ============================================================================
// Date/Time Helpers
// ============================================================================

/**
 * Create an ISO date string for a specific number of days from now
 */
export const daysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

/**
 * Create an ISO date string for a specific number of days ago
 */
export const daysAgo = (days: number): string => daysFromNow(-days);

// ============================================================================
// Async Helpers
// ============================================================================

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wait for next tick (useful for state updates)
 */
export const waitForNextTick = (): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, 0));

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Expect array to contain object with matching properties
 */
export const expectArrayToContainObjectWith = <T extends Record<string, unknown>>(
  array: T[],
  partialMatch: Partial<T>
): void => {
  const found = array.some(item =>
    Object.entries(partialMatch).every(([key, value]) => item[key] === value)
  );
  
  if (!found) {
    throw new Error(
      `Expected array to contain object matching ${JSON.stringify(partialMatch)}, ` +
      `but found: ${JSON.stringify(array)}`
    );
  }
};

// ============================================================================
// React Testing Helpers
// ============================================================================

/**
 * Create a wrapper component for testing hooks with providers
 */
export const createTestWrapper = (
  providers: React.FC<{ children: React.ReactNode }>[]
) => {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return providers.reduceRight(
      (acc, Provider) => React.createElement(Provider, null, acc),
      children
    );
  };
};
